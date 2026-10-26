import { addDays, startOfWeek, toDateKey, type DateKey } from './dates';
import type { DayLog, Profile, StrengthHabit, Targets } from './types';

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Daily protein target. GLP-1 guidance commonly cites ~1.0–1.5 g per kg of a reference body
 * weight (or roughly 100–150 g/day for most adults) to limit lean-mass loss. We use the goal
 * weight as the reference so the target doesn't balloon at higher starting weights, and nudge
 * it up for people who strength train.
 */
export function proteinTarget(profile: Pick<Profile, 'goalWeightKg' | 'startWeightKg' | 'strengthHabit'>): number {
  const reference = profile.goalWeightKg > 0 ? Math.min(profile.goalWeightKg, profile.startWeightKg) : profile.startWeightKg;
  const perKg = profile.strengthHabit === 'regular' ? 1.5 : profile.strengthHabit === 'sometimes' ? 1.3 : 1.2;
  return clamp(roundTo(reference * perKg, 5), 60, 180);
}

/** Daily fluid target: ~30 ml per kg of current weight, within sensible bounds. */
export function waterTarget(currentWeightKg: number): number {
  return clamp(roundTo(currentWeightKg * 30, 100), 2000, 3500);
}

/** Fiber helps with the constipation that's common on GLP-1s. */
export function fiberTarget(sex: Profile['sex']): number {
  if (sex === 'female') return 25;
  if (sex === 'male') return 30;
  return 28;
}

export function strengthTarget(habit: StrengthHabit): number {
  return habit === 'regular' ? 3 : 2;
}

export function computeTargets(profile: Profile, currentWeightKg: number): Targets {
  return {
    proteinG: proteinTarget(profile),
    waterMl: waterTarget(currentWeightKg),
    fiberG: fiberTarget(profile.sex),
    strengthPerWeek: strengthTarget(profile.strengthHabit),
  };
}

export function emptyDay(date: DateKey): DayLog {
  return { date, proteinG: 0, waterMl: 0, fiberG: 0, strength: false };
}

/** Number of strength sessions logged in the (Mon–Sun) week containing `date`. */
export function strengthSessionsThisWeek(days: Record<DateKey, DayLog>, date: Date): number {
  const start = startOfWeek(date);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (days[toDateKey(addDays(start, i))]?.strength) count++;
  }
  return count;
}

export interface ShieldBreakdown {
  score: number;
  protein: number;
  water: number;
  fiber: number;
  strength: number;
  label: 'Fully shielded' | 'Well protected' | 'Partly protected' | 'Unprotected';
}

const WEIGHTS = { protein: 0.5, water: 0.15, fiber: 0.15, strength: 0.2 };

function ratio(value: number, target: number): number {
  if (target <= 0) return 1;
  return clamp(value / target, 0, 1);
}

/**
 * Muscle Shield: a 0–100 daily score of the habits that protect lean mass on a GLP-1.
 * Protein carries half the weight; strength is measured against the weekly target so a rest day
 * doesn't zero it out.
 */
export function muscleShield(day: DayLog, targets: Targets, strengthThisWeek: number): ShieldBreakdown {
  const protein = ratio(day.proteinG, targets.proteinG);
  const water = ratio(day.waterMl, targets.waterMl);
  const fiber = ratio(day.fiberG, targets.fiberG);
  const strength = ratio(strengthThisWeek, targets.strengthPerWeek);
  const score = Math.round(
    100 * (WEIGHTS.protein * protein + WEIGHTS.water * water + WEIGHTS.fiber * fiber + WEIGHTS.strength * strength),
  );
  const label =
    score >= 85 ? 'Fully shielded' : score >= 60 ? 'Well protected' : score >= 35 ? 'Partly protected' : 'Unprotected';
  return { score, protein, water, fiber, strength, label };
}

export interface ShieldDay {
  date: DateKey;
  score: number;
  proteinG: number;
}

/** Shield score for each of the last `count` days ending at `today`. */
export function shieldHistory(
  days: Record<DateKey, DayLog>,
  targets: Targets,
  today: Date,
  count = 7,
): ShieldDay[] {
  const result: ShieldDay[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const key = toDateKey(date);
    const day = days[key] ?? emptyDay(key);
    result.push({
      date: key,
      score: muscleShield(day, targets, strengthSessionsThisWeek(days, date)).score,
      proteinG: day.proteinG,
    });
  }
  return result;
}

/** Average protein over logged days (days with any protein), or null. */
export function averageProtein(days: Record<DateKey, DayLog>, keys: DateKey[]): number | null {
  const logged = keys.map((k) => days[k]).filter((d): d is DayLog => !!d && d.proteinG > 0);
  if (logged.length === 0) return null;
  return logged.reduce((sum, d) => sum + d.proteinG, 0) / logged.length;
}

/** Consecutive days (ending today or yesterday) where the protein target was hit. */
export function proteinStreak(days: Record<DateKey, DayLog>, target: number, today: Date): number {
  let streak = 0;
  let cursor = today;
  if ((days[toDateKey(cursor)]?.proteinG ?? 0) < target) cursor = addDays(cursor, -1);
  for (let i = 0; i < 3650; i++) {
    if ((days[toDateKey(cursor)]?.proteinG ?? 0) >= target) {
      streak++;
      cursor = addDays(cursor, -1);
    } else break;
  }
  return streak;
}
