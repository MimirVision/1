import { DAY_MS } from './dates';
import { trialFor, type TrialResult } from './medications';
import type { CompoundId } from './types';

export interface ProjectionPoint {
  week: number;
  kg: number;
}

export interface Projection {
  trial: TrialResult;
  points: ProjectionPoint[];
  endKg: number;
  /** First week the projected curve reaches the goal, or null if it doesn't within the trial. */
  goalWeek: number | null;
}

/**
 * Shape of the average trial curve: fast early loss that flattens toward the endpoint.
 * percent(t) = P · (1 − e^(−t/τ)) / (1 − e^(−T/τ)), with τ = T / 3.
 */
export function trialCurvePercent(trial: TrialResult, week: number): number {
  const T = trial.weeks;
  const tau = T / 3;
  const t = Math.min(Math.max(week, 0), T);
  return (trial.meanPercentLoss * (1 - Math.exp(-t / tau))) / (1 - Math.exp(-T / tau));
}

export function trialProjection(
  compound: CompoundId,
  startKg: number,
  goalKg: number,
  doseMg?: number,
  stepWeeks = 4,
): Projection | null {
  const trial = trialFor(compound, doseMg);
  if (!trial || startKg <= 0) return null;
  const points: ProjectionPoint[] = [];
  for (let week = 0; week <= trial.weeks; week += stepWeeks) {
    points.push({ week, kg: startKg * (1 - trialCurvePercent(trial, week) / 100) });
  }
  if (points[points.length - 1].week !== trial.weeks) {
    points.push({ week: trial.weeks, kg: startKg * (1 - trial.meanPercentLoss / 100) });
  }
  let goalWeek: number | null = null;
  if (goalKg < startKg) {
    for (let week = 0; week <= trial.weeks; week++) {
      if (startKg * (1 - trialCurvePercent(trial, week) / 100) <= goalKg) {
        goalWeek = week;
        break;
      }
    }
  }
  return { trial, points, endKg: points[points.length - 1].kg, goalWeek };
}

export function weekToDate(start: Date, week: number): Date {
  return new Date(start.getTime() + week * 7 * DAY_MS);
}

/** Percent of starting weight a goal represents. */
export function goalPercent(startKg: number, goalKg: number): number {
  if (startKg <= 0) return 0;
  return ((startKg - goalKg) / startKg) * 100;
}
