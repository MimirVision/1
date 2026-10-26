import { addDays, atTimeOfDay, startOfDay, type TimeOfDay } from './dates';
import { uid } from './id';
import { getPreset, scheduleIntervalDays, type MedicationPreset } from './medications';
import type {
  Concern,
  DoseLog,
  Goal,
  Medication,
  Profile,
  Schedule,
  Sex,
  StrengthHabit,
  WeightLog,
} from './types';
import type { HeightUnit, VolumeUnit, WeightUnit } from './units';

export interface OnboardingDraft {
  goal: Goal;
  /** null when the user hasn't started a medication yet. */
  presetId: string | null;
  customName: string;
  doseMg: number | null;
  schedule: Schedule;
  reminderTime: TimeOfDay;
  /** Days since the last dose; null = no dose yet. */
  lastDoseDaysAgo: number | null;
  /** Days since starting the medication (0 = starting today). */
  startedDaysAgo: number;
  backfill: boolean;
  weightUnit: WeightUnit;
  volumeUnit: VolumeUnit;
  heightUnit: HeightUnit;
  currentWeightKg: number | null;
  startWeightKg: number | null;
  heightCm: number;
  goalWeightKg: number | null;
  sex: Sex;
  strengthHabit: StrengthHabit;
  concerns: Concern[];
  name: string;
}

/** Previous scheduled dose time before `from`, walking the schedule backwards. */
function previousDose(schedule: Schedule, from: Date): Date {
  switch (schedule.kind) {
    case 'daily':
      return addDays(from, -1);
    case 'weekly':
      return addDays(from, -7);
    case 'interval':
      return addDays(from, -Math.max(1, Math.round(schedule.everyDays)));
    case 'weekdays': {
      if (schedule.days.length === 0) return addDays(from, -7);
      let d = addDays(from, -1);
      for (let i = 0; i < 7 && !schedule.days.includes(d.getDay()); i++) d = addDays(d, -1);
      return d;
    }
  }
}

/**
 * Estimated past doses from the start date up to the last dose, stepping down the preset's dose
 * ladder roughly every four weeks (the standard titration cadence), ending at the current dose.
 */
export function backfillDoses(
  preset: MedicationPreset,
  schedule: Schedule,
  currentDoseMg: number,
  lastDoseAt: Date,
  startedAt: Date,
  medicationId: string,
): DoseLog[] {
  const startDay = startOfDay(startedAt).getTime();
  const times: Date[] = [];
  let cursor = lastDoseAt;
  for (let i = 0; i < 400 && startOfDay(cursor).getTime() >= startDay; i++) {
    times.push(cursor);
    cursor = previousDose(schedule, cursor);
  }
  const ladderIndex = preset.doses.findIndex((d) => Math.abs(d - currentDoseMg) < 1e-9);
  const dosesPerStep = Math.max(1, Math.round(28 / scheduleIntervalDays(schedule)));
  return times
    .map((time, fromEnd) => {
      const stepsBack = Math.floor(fromEnd / dosesPerStep);
      const mg = ladderIndex >= 0 ? preset.doses[Math.max(0, ladderIndex - stepsBack)] : currentDoseMg;
      return { id: uid(), medicationId, takenAt: time.toISOString(), doseMg: mg };
    })
    .reverse();
}

export interface OnboardingResult {
  profile: Profile;
  medication: Medication | null;
  doses: DoseLog[];
  weights: WeightLog[];
}

export function buildOnboardingResult(draft: OnboardingDraft, now: Date): OnboardingResult {
  const currentKg = draft.currentWeightKg ?? 80;
  const startKg = draft.startWeightKg ?? currentKg;
  const journeyStart = startOfDay(addDays(now, -draft.startedDaysAgo));

  const profile: Profile = {
    name: draft.name.trim() || undefined,
    sex: draft.sex,
    heightCm: draft.heightCm,
    startWeightKg: startKg,
    goalWeightKg: draft.goalWeightKg ?? Math.round(startKg * 0.85),
    goal: draft.goal,
    concerns: draft.concerns,
    strengthHabit: draft.strengthHabit,
    weightUnit: draft.weightUnit,
    volumeUnit: draft.volumeUnit,
    heightUnit: draft.heightUnit,
    journeyStartedAt: journeyStart.toISOString(),
  };

  const weights: WeightLog[] = [];
  if (draft.startedDaysAgo > 0 && Math.abs(startKg - currentKg) > 0.05) {
    weights.push({ id: uid(), at: atTimeOfDay(journeyStart, '08:00').toISOString(), kg: startKg });
  }
  weights.push({ id: uid(), at: now.toISOString(), kg: currentKg });

  if (!draft.presetId) return { profile, medication: null, doses: [], weights };

  const preset = getPreset(draft.presetId);
  const doseMg = draft.doseMg ?? preset.doses[0] ?? 1;
  const medication: Medication = {
    id: uid(),
    presetId: preset.id,
    name: preset.id === 'other' && draft.customName.trim() ? draft.customName.trim() : preset.name,
    compound: preset.compound,
    form: preset.form,
    currentDoseMg: doseMg,
    schedule: draft.schedule,
    reminderTime: draft.reminderTime,
    remindersEnabled: true,
    startedAt: journeyStart.toISOString(),
    active: true,
    createdAt: now.toISOString(),
  };

  let doses: DoseLog[] = [];
  if (draft.lastDoseDaysAgo !== null) {
    const lastDay = addDays(startOfDay(now), -draft.lastDoseDaysAgo);
    let lastAt = atTimeOfDay(lastDay, draft.reminderTime);
    if (lastAt.getTime() > now.getTime()) lastAt = new Date(now.getTime() - 60_000);
    doses =
      draft.backfill && draft.startedDaysAgo > 0
        ? backfillDoses(preset, draft.schedule, doseMg, lastAt, journeyStart, medication.id)
        : [{ id: uid(), medicationId: medication.id, takenAt: lastAt.toISOString(), doseMg }];
  }

  return { profile, medication, doses, weights };
}
