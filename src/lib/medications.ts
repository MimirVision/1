import type { CompoundId, MedicationForm, Schedule } from './types';

export interface Compound {
  id: CompoundId;
  name: string;
  /** Elimination half-life in hours (from prescribing information / PK literature). */
  halfLifeHours: number | null;
  /** Approximate time to peak concentration after a single dose, in hours. */
  tmaxHours: number | null;
  /**
   * How the level chart is expressed. Injections are shown as an estimated amount (mg) in the body.
   * Oral GLP-1s have very low/variable bioavailability, so they are shown relative to steady state.
   */
  levelUnit: 'mg' | 'percent';
  /** Headline clinical-trial result used for the "trial average" projection. */
  trial?: TrialResult;
  sourceNote: string;
}

export interface TrialResult {
  name: string;
  /** Mean % body weight lost at the trial endpoint, highest approved/studied dose. */
  meanPercentLoss: number;
  weeks: number;
  doseLabel: string;
}

export const COMPOUNDS: Record<CompoundId, Compound> = {
  tirzepatide: {
    id: 'tirzepatide',
    name: 'Tirzepatide',
    halfLifeHours: 116.7,
    tmaxHours: 24,
    levelUnit: 'mg',
    trial: { name: 'SURMOUNT-1', meanPercentLoss: 20.9, weeks: 72, doseLabel: '15 mg weekly' },
    sourceNote: 'Half-life ≈ 5 days; peak 8–72 h after injection (Zepbound/Mounjaro prescribing information).',
  },
  semaglutide: {
    id: 'semaglutide',
    name: 'Semaglutide',
    halfLifeHours: 165,
    tmaxHours: 56,
    levelUnit: 'mg',
    trial: { name: 'STEP 1', meanPercentLoss: 14.9, weeks: 68, doseLabel: '2.4 mg weekly' },
    sourceNote: 'Half-life ≈ 1 week; peak 1–3 days after injection (Wegovy/Ozempic prescribing information).',
  },
  oral_semaglutide: {
    id: 'oral_semaglutide',
    name: 'Oral semaglutide',
    halfLifeHours: 165,
    tmaxHours: 1,
    levelUnit: 'percent',
    trial: { name: 'OASIS 4', meanPercentLoss: 13.6, weeks: 64, doseLabel: '25 mg daily' },
    sourceNote: 'Half-life ≈ 1 week; peak about 1 hour after the daily tablet (Wegovy pill/Rybelsus prescribing information).',
  },
  orforglipron: {
    id: 'orforglipron',
    name: 'Orforglipron',
    halfLifeHours: 36,
    tmaxHours: 8,
    levelUnit: 'percent',
    trial: { name: 'ATTAIN-1', meanPercentLoss: 12.4, weeks: 72, doseLabel: 'highest dose, daily' },
    sourceNote: 'Half-life ≈ 29–49 hours (published phase 1–3 pharmacokinetic data).',
  },
  liraglutide: {
    id: 'liraglutide',
    name: 'Liraglutide',
    halfLifeHours: 13,
    tmaxHours: 11,
    levelUnit: 'mg',
    trial: { name: 'SCALE', meanPercentLoss: 8.0, weeks: 56, doseLabel: '3.0 mg daily' },
    sourceNote: 'Half-life ≈ 13 hours; peak 8–12 h after injection (Saxenda/Victoza prescribing information).',
  },
  dulaglutide: {
    id: 'dulaglutide',
    name: 'Dulaglutide',
    halfLifeHours: 113,
    tmaxHours: 48,
    levelUnit: 'mg',
    sourceNote: 'Half-life ≈ 5 days; peak 24–72 h after injection (Trulicity prescribing information).',
  },
  other: {
    id: 'other',
    name: 'Other',
    halfLifeHours: null,
    tmaxHours: null,
    levelUnit: 'mg',
    sourceNote: 'No level estimate is shown for custom medications.',
  },
};

export interface PillRules {
  /** Must be taken on an empty stomach. */
  emptyStomach: boolean;
  /** Max plain water allowed with the tablet, in fl oz. */
  maxWaterOz?: number;
  /** Minutes to wait before food, drink or other oral medicines. */
  waitMinutes?: number;
}

export interface MedicationPreset {
  id: string;
  name: string;
  compound: CompoundId;
  form: MedicationForm;
  defaultSchedule: Schedule;
  /** Standard dose ladder in mg. Empty means free-form dose entry. */
  doses: number[];
  compounded?: boolean;
  pillRules?: PillRules;
  /** Short line shown under the name in pickers. */
  subtitle: string;
}

const SEMAGLUTIDE_PILL_RULES: PillRules = { emptyStomach: true, maxWaterOz: 4, waitMinutes: 30 };

export const MEDICATION_PRESETS: MedicationPreset[] = [
  {
    id: 'zepbound',
    name: 'Zepbound',
    compound: 'tirzepatide',
    form: 'injection',
    defaultSchedule: { kind: 'weekly', weekday: 1 },
    doses: [2.5, 5, 7.5, 10, 12.5, 15],
    subtitle: 'Tirzepatide · weekly shot',
  },
  {
    id: 'mounjaro',
    name: 'Mounjaro',
    compound: 'tirzepatide',
    form: 'injection',
    defaultSchedule: { kind: 'weekly', weekday: 1 },
    doses: [2.5, 5, 7.5, 10, 12.5, 15],
    subtitle: 'Tirzepatide · weekly shot',
  },
  {
    id: 'wegovy',
    name: 'Wegovy',
    compound: 'semaglutide',
    form: 'injection',
    defaultSchedule: { kind: 'weekly', weekday: 1 },
    doses: [0.25, 0.5, 1, 1.7, 2.4, 7.2],
    subtitle: 'Semaglutide · weekly shot',
  },
  {
    id: 'ozempic',
    name: 'Ozempic',
    compound: 'semaglutide',
    form: 'injection',
    defaultSchedule: { kind: 'weekly', weekday: 1 },
    doses: [0.25, 0.5, 1, 2],
    subtitle: 'Semaglutide · weekly shot',
  },
  {
    id: 'wegovy_pill',
    name: 'Wegovy pill',
    compound: 'oral_semaglutide',
    form: 'pill',
    defaultSchedule: { kind: 'daily' },
    doses: [1.5, 4, 9, 25],
    pillRules: SEMAGLUTIDE_PILL_RULES,
    subtitle: 'Oral semaglutide · daily pill',
  },
  {
    id: 'foundayo',
    name: 'Foundayo',
    compound: 'orforglipron',
    form: 'pill',
    defaultSchedule: { kind: 'daily' },
    doses: [0.8, 2.5, 5.5, 9, 14.5, 17.2],
    pillRules: { emptyStomach: false },
    subtitle: 'Orforglipron · daily pill',
  },
  {
    id: 'rybelsus',
    name: 'Rybelsus',
    compound: 'oral_semaglutide',
    form: 'pill',
    defaultSchedule: { kind: 'daily' },
    doses: [1.5, 3, 4, 7, 9, 14],
    pillRules: SEMAGLUTIDE_PILL_RULES,
    subtitle: 'Oral semaglutide · daily pill',
  },
  {
    id: 'compounded_tirzepatide',
    name: 'Compounded tirzepatide',
    compound: 'tirzepatide',
    form: 'injection',
    defaultSchedule: { kind: 'weekly', weekday: 1 },
    doses: [2.5, 5, 7.5, 10, 12.5, 15],
    compounded: true,
    subtitle: 'Vial & syringe · any schedule',
  },
  {
    id: 'compounded_semaglutide',
    name: 'Compounded semaglutide',
    compound: 'semaglutide',
    form: 'injection',
    defaultSchedule: { kind: 'weekly', weekday: 1 },
    doses: [0.25, 0.5, 1, 1.7, 2.4],
    compounded: true,
    subtitle: 'Vial & syringe · any schedule',
  },
  {
    id: 'saxenda',
    name: 'Saxenda',
    compound: 'liraglutide',
    form: 'injection',
    defaultSchedule: { kind: 'daily' },
    doses: [0.6, 1.2, 1.8, 2.4, 3],
    subtitle: 'Liraglutide · daily shot',
  },
  {
    id: 'victoza',
    name: 'Victoza',
    compound: 'liraglutide',
    form: 'injection',
    defaultSchedule: { kind: 'daily' },
    doses: [0.6, 1.2, 1.8],
    subtitle: 'Liraglutide · daily shot',
  },
  {
    id: 'trulicity',
    name: 'Trulicity',
    compound: 'dulaglutide',
    form: 'injection',
    defaultSchedule: { kind: 'weekly', weekday: 1 },
    doses: [0.75, 1.5, 3, 4.5],
    subtitle: 'Dulaglutide · weekly shot',
  },
  {
    id: 'other',
    name: 'Other medication',
    compound: 'other',
    form: 'injection',
    defaultSchedule: { kind: 'weekly', weekday: 1 },
    doses: [],
    subtitle: 'Track any shot or pill',
  },
];

export function getPreset(id: string): MedicationPreset {
  return (
    MEDICATION_PRESETS.find((p) => p.id === id) ??
    (MEDICATION_PRESETS.find((p) => p.id === 'other') as MedicationPreset)
  );
}

export function getCompound(id: CompoundId): Compound {
  return COMPOUNDS[id];
}

/** The trial result relevant for a compound at a given dose (Wegovy HD 7.2 mg has its own trial). */
export function trialFor(compound: CompoundId, doseMg?: number): TrialResult | undefined {
  if (compound === 'semaglutide' && doseMg !== undefined && doseMg >= 7) {
    return { name: 'STEP UP', meanPercentLoss: 20.7, weeks: 72, doseLabel: '7.2 mg weekly' };
  }
  return COMPOUNDS[compound].trial;
}

/** Next step up on the preset's dose ladder, if any. */
export function nextDoseUp(preset: MedicationPreset, currentMg: number): number | undefined {
  return preset.doses.find((d) => d > currentMg + 1e-9);
}

export function scheduleIntervalDays(schedule: Schedule): number {
  switch (schedule.kind) {
    case 'daily':
      return 1;
    case 'weekly':
      return 7;
    case 'interval':
      return Math.max(1, schedule.everyDays);
    case 'weekdays':
      return schedule.days.length > 0 ? 7 / schedule.days.length : 7;
  }
}
