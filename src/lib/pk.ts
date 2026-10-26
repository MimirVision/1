/**
 * Educational pharmacokinetic estimate of medication level.
 *
 * Model: one-compartment with first-order absorption and elimination (the Bateman function),
 * summed over every logged dose (superposition). Elimination rate comes from the published
 * half-life; the absorption rate is solved so the single-dose curve peaks at the published Tmax.
 * Bioavailability is not modelled — values are an estimate, never a measurement.
 */
import { HOUR_MS } from './dates';

export interface PkParams {
  /** Elimination rate constant, 1/hour. */
  ke: number;
  /** Absorption rate constant, 1/hour. */
  ka: number;
}

export interface TimedDose {
  /** Epoch ms. */
  time: number;
  mg: number;
}

export interface LevelPoint {
  /** Epoch ms. */
  t: number;
  value: number;
}

/** Time of peak for given rates: ln(ka/ke) / (ka − ke). */
export function peakTimeHours(ka: number, ke: number): number {
  return Math.log(ka / ke) / (ka - ke);
}

export function pkParams(halfLifeHours: number, tmaxHours: number): PkParams {
  const ke = Math.LN2 / halfLifeHours;
  // tmax must be below 1/ke for a solution with ka > ke; clamp defensively.
  const target = Math.min(Math.max(tmaxHours, 0.05), 0.98 / ke);
  let lo = ke * (1 + 1e-9);
  let hi = 500;
  // peakTimeHours is strictly decreasing in ka on (ke, ∞), so bisection converges.
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (peakTimeHours(mid, ke) > target) lo = mid;
    else hi = mid;
  }
  return { ke, ka: (lo + hi) / 2 };
}

/** Amount (mg) attributable to one dose `hours` after it was taken. */
export function singleDoseLevel(mg: number, hours: number, p: PkParams): number {
  if (hours <= 0 || mg <= 0) return 0;
  const { ka, ke } = p;
  return ((mg * ka) / (ka - ke)) * (Math.exp(-ke * hours) - Math.exp(-ka * hours));
}

export function levelAt(doses: TimedDose[], time: number, p: PkParams): number {
  let total = 0;
  for (const dose of doses) {
    if (dose.time < time) total += singleDoseLevel(dose.mg, (time - dose.time) / HOUR_MS, p);
  }
  return total;
}

export function levelSeries(
  doses: TimedDose[],
  p: PkParams,
  start: number,
  end: number,
  step: number = 3 * HOUR_MS,
): LevelPoint[] {
  const points: LevelPoint[] = [];
  if (end <= start || step <= 0) return points;
  const sorted = [...doses].sort((a, b) => a.time - b.time);
  for (let t = start; t <= end; t += step) {
    points.push({ t, value: levelAt(sorted, t, p) });
  }
  if (points[points.length - 1]?.t !== end) points.push({ t: end, value: levelAt(sorted, end, p) });
  return points;
}

/**
 * Peak level reached at steady state when taking `mg` every `intervalHours`.
 * Closed form of the infinite superposition, sampled across one dosing interval.
 */
export function steadyStatePeak(mg: number, intervalHours: number, p: PkParams): number {
  const { ka, ke } = p;
  const accKe = 1 / (1 - Math.exp(-ke * intervalHours));
  const accKa = 1 / (1 - Math.exp(-ka * intervalHours));
  let peak = 0;
  const samples = 240;
  for (let i = 1; i <= samples; i++) {
    const t = (intervalHours * i) / samples;
    const value = ((mg * ka) / (ka - ke)) * (Math.exp(-ke * t) * accKe - Math.exp(-ka * t) * accKa);
    if (value > peak) peak = value;
  }
  return peak;
}

/** Hours until the level falls by half from now, assuming no further doses (≈ the half-life). */
export function hoursToHalf(doses: TimedDose[], now: number, p: PkParams, maxHours = 24 * 60): number | null {
  const current = levelAt(doses, now, p);
  if (current <= 0) return null;
  for (let h = 1; h <= maxHours; h++) {
    if (levelAt(doses, now + h * HOUR_MS, p) <= current / 2) return h;
  }
  return null;
}

export type LevelTrend = 'rising' | 'falling' | 'steady';

export function levelTrend(doses: TimedDose[], now: number, p: PkParams): LevelTrend {
  const current = levelAt(doses, now, p);
  const soon = levelAt(doses, now + 6 * HOUR_MS, p);
  if (current <= 0 && soon <= 0) return 'steady';
  const change = (soon - current) / Math.max(current, 1e-6);
  if (change > 0.01) return 'rising';
  if (change < -0.01) return 'falling';
  return 'steady';
}
