import { DAY_MS } from './dates';
import type { DoseLog, WeightLog } from './types';
import { kgToLb } from './units';

export function sortWeights(weights: WeightLog[]): WeightLog[] {
  return [...weights].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

export function latestWeight(weights: WeightLog[]): WeightLog | undefined {
  let latest: WeightLog | undefined;
  for (const w of weights) if (!latest || Date.parse(w.at) > Date.parse(latest.at)) latest = w;
  return latest;
}

export interface WeightSummary {
  startKg: number;
  currentKg: number;
  goalKg: number;
  lostKg: number;
  percentLost: number;
  remainingKg: number;
  /** 0–1 progress from start to goal. */
  progress: number;
}

export function weightSummary(startKg: number, goalKg: number, weights: WeightLog[]): WeightSummary {
  const currentKg = latestWeight(weights)?.kg ?? startKg;
  const lostKg = startKg - currentKg;
  const totalToLose = startKg - goalKg;
  return {
    startKg,
    currentKg,
    goalKg,
    lostKg,
    percentLost: startKg > 0 ? (lostKg / startKg) * 100 : 0,
    remainingKg: Math.max(0, currentKg - goalKg),
    progress: totalToLose > 0 ? Math.min(1, Math.max(0, lostKg / totalToLose)) : currentKg <= goalKg ? 1 : 0,
  };
}

/**
 * Trend in kg per week (negative = losing), from a least-squares fit over the trailing window.
 * Needs at least two weigh-ins spanning five days to avoid reporting noise as a trend.
 */
export function weeklyRate(weights: WeightLog[], now: Date, windowDays = 28): number | null {
  const since = now.getTime() - windowDays * DAY_MS;
  const points = weights
    .map((w) => ({ x: Date.parse(w.at), y: w.kg }))
    .filter((p) => p.x >= since && p.x <= now.getTime());
  if (points.length < 2) return null;
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  if (maxX - minX < 5 * DAY_MS) return null;
  const n = points.length;
  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  if (den === 0) return null;
  const perMs = num / den;
  return perMs * 7 * DAY_MS;
}

/** When the goal would be reached at the current trend, if the trend is downward. */
export function projectedGoalDate(currentKg: number, goalKg: number, ratePerWeek: number | null, now: Date): Date | null {
  if (ratePerWeek === null || ratePerWeek >= -0.02 || currentKg <= goalKg) return null;
  const weeks = (currentKg - goalKg) / -ratePerWeek;
  if (weeks > 260) return null;
  return new Date(now.getTime() + weeks * 7 * DAY_MS);
}

export interface Milestone {
  id: string;
  label: string;
  achieved: boolean;
  achievedAt?: string;
}

/** Percent-of-body-weight milestones plus round-number milestones in the user's unit. */
export function milestones(startKg: number, weights: WeightLog[], unit: 'lb' | 'kg' | 'st'): Milestone[] {
  const sorted = sortWeights(weights);
  const firstReaching = (predicate: (kg: number) => boolean) => sorted.find((w) => predicate(w.kg))?.at;

  const percentSteps = [5, 10, 15, 20, 25];
  const percent = percentSteps.map((p) => {
    const at = firstReaching((kg) => ((startKg - kg) / startKg) * 100 >= p - 1e-9);
    return { id: `pct-${p}`, label: `${p}% lost`, achieved: !!at, achievedAt: at };
  });

  const step = unit === 'kg' ? 5 : 10;
  const lostIn = (kg: number) => (unit === 'kg' ? startKg - kg : kgToLb(startKg - kg));
  const best = sorted.reduce((max, w) => Math.max(max, lostIn(w.kg)), 0);
  const top = Math.max(step * 3, Math.ceil((best + step) / step) * step);
  const absolute: Milestone[] = [];
  for (let amount = step; amount <= Math.min(top, step * 20); amount += step) {
    const at = firstReaching((kg) => lostIn(kg) >= amount - 1e-9);
    absolute.push({
      id: `abs-${amount}`,
      label: `${amount} ${unit === 'kg' ? 'kg' : 'lb'} down`,
      achieved: !!at,
      achievedAt: at,
    });
  }
  return [...absolute, ...percent].sort((a, b) => {
    if (a.achieved !== b.achieved) return a.achieved ? -1 : 1;
    if (a.achievedAt && b.achievedAt) return Date.parse(a.achievedAt) - Date.parse(b.achievedAt);
    return 0;
  });
}

/** The dose in effect at a moment: the most recent dose taken at or before it. */
export function doseInEffectAt(doses: DoseLog[], time: number): DoseLog | undefined {
  let found: DoseLog | undefined;
  for (const d of doses) {
    const t = Date.parse(d.takenAt);
    if (t <= time && (!found || t > Date.parse(found.takenAt))) found = d;
  }
  return found;
}

export interface DoseChange {
  at: string;
  doseMg: number;
}

/** First dose at each new dose level, in time order. */
export function doseChanges(doses: DoseLog[]): DoseChange[] {
  const sorted = [...doses].sort((a, b) => Date.parse(a.takenAt) - Date.parse(b.takenAt));
  const changes: DoseChange[] = [];
  for (const d of sorted) {
    if (changes.length === 0 || Math.abs(changes[changes.length - 1].doseMg - d.doseMg) > 1e-9) {
      changes.push({ at: d.takenAt, doseMg: d.doseMg });
    }
  }
  return changes;
}

export interface DosePeriod {
  doseMg: number;
  from: string;
  to: string;
  weeks: number;
  /** kg lost during the period (positive = lost), null when not enough weigh-ins. */
  lostKg: number | null;
}

/**
 * Weight change attributed to each dose level, using weigh-in timestamps (a weigh-in belongs to
 * the dose that was in effect when it was taken).
 */
export function lossByDose(doses: DoseLog[], weights: WeightLog[], now: Date): DosePeriod[] {
  const changes = doseChanges(doses);
  const sorted = sortWeights(weights);
  return changes.map((change, i) => {
    const from = Date.parse(change.at);
    const to = i + 1 < changes.length ? Date.parse(changes[i + 1].at) : now.getTime();
    // Baseline: last weigh-in before the period starts (or the first inside it).
    const before = [...sorted].reverse().find((w) => Date.parse(w.at) <= from);
    const inside = sorted.filter((w) => Date.parse(w.at) > from && Date.parse(w.at) <= to);
    const baseline = before ?? inside[0];
    const end = inside[inside.length - 1];
    const lostKg = baseline && end && baseline !== end ? baseline.kg - end.kg : null;
    return {
      doseMg: change.doseMg,
      from: change.at,
      to: new Date(to).toISOString(),
      weeks: (to - from) / (7 * DAY_MS),
      lostKg,
    };
  });
}

/** Weigh-ins reduced to one per calendar day (the last of the day), for charting. */
export function dailyWeights(weights: WeightLog[]): WeightLog[] {
  const byDay = new Map<string, WeightLog>();
  for (const w of sortWeights(weights)) {
    const d = new Date(w.at);
    byDay.set(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`, w);
  }
  return [...byDay.values()];
}
