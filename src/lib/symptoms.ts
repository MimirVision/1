import { DAY_MS } from './dates';
import type { DoseLog, Severity, SymptomId, SymptomLog } from './types';

export interface SymptomInfo {
  id: SymptomId;
  label: string;
  /** Short, practical tip shown when the symptom is logged. Not medical advice. */
  tip: string;
}

export const SYMPTOMS: SymptomInfo[] = [
  { id: 'nausea', label: 'Nausea', tip: 'Smaller meals, eat slowly, and stop at the first sign of fullness. Bland, low-fat foods are usually easier.' },
  { id: 'constipation', label: 'Constipation', tip: 'Fluids and fiber help most. Many people also do well with a daily walk.' },
  { id: 'fatigue', label: 'Fatigue', tip: 'Low energy often tracks with low intake. Check protein and fluids first.' },
  { id: 'heartburn', label: 'Heartburn', tip: 'Avoid lying down within 2–3 hours of eating, and go easy on spicy or fatty meals.' },
  { id: 'sulfur_burps', label: 'Sulfur burps', tip: 'Often linked to slower digestion. Smaller portions and fewer sugar alcohols can help.' },
  { id: 'bloating', label: 'Bloating', tip: 'Carbonated drinks and very large meals tend to make it worse.' },
  { id: 'diarrhea', label: 'Diarrhea', tip: 'Replace fluids and electrolytes. Rich or greasy meals are common triggers.' },
  { id: 'headache', label: 'Headache', tip: 'Often a sign of dehydration or a skipped meal.' },
  { id: 'dizziness', label: 'Dizziness', tip: 'Make sure you are eating and drinking enough, and stand up slowly.' },
  { id: 'vomiting', label: 'Vomiting', tip: 'Sip fluids. Persistent vomiting is worth a call to your clinician.' },
  { id: 'injection_site', label: 'Site reaction', tip: 'Rotate sites each dose and let the pen reach room temperature first.' },
  { id: 'hair_shedding', label: 'Hair shedding', tip: 'Common with rapid weight loss. Adequate protein matters here too.' },
];

export const SEVERITY_LABEL: Record<Severity, string> = { 1: 'Mild', 2: 'Moderate', 3: 'Severe' };

export function symptomInfo(id: SymptomId): SymptomInfo {
  return SYMPTOMS.find((s) => s.id === id) as SymptomInfo;
}

/** Days (0-based, floor) since the most recent dose taken before `time`, or null. */
export function daysSinceDose(doseTimes: number[], time: number): number | null {
  let latest = -Infinity;
  for (const t of doseTimes) if (t <= time && t > latest) latest = t;
  if (!Number.isFinite(latest)) return null;
  return Math.floor((time - latest) / DAY_MS);
}

export interface SymptomPattern {
  symptom: SymptomId;
  /** Average severity (0–3) by day after dose, index 0 = dose day. */
  byDay: number[];
  /** Number of logs that fell on each day bucket. */
  samples: number[];
  peakDay: number | null;
  total: number;
}

/**
 * How each symptom is distributed across the days after a dose (for weekly medications).
 * Each check-in contributes severity 0 for symptoms it didn't report, so averages reflect
 * frequency as well as intensity.
 */
export function symptomPatterns(logs: SymptomLog[], doses: DoseLog[], buckets = 7): SymptomPattern[] {
  const doseTimes = doses.map((d) => Date.parse(d.takenAt));
  const sums: Record<string, number[]> = {};
  const samples = new Array<number>(buckets).fill(0);
  const totals: Record<string, number> = {};
  for (const s of SYMPTOMS) {
    sums[s.id] = new Array<number>(buckets).fill(0);
    totals[s.id] = 0;
  }
  for (const log of logs) {
    const day = daysSinceDose(doseTimes, Date.parse(log.at));
    if (day === null) continue;
    const bucket = Math.min(buckets - 1, day);
    samples[bucket]++;
    for (const [id, severity] of Object.entries(log.symptoms)) {
      if (!severity || !sums[id]) continue;
      sums[id][bucket] += severity;
      totals[id] += 1;
    }
  }
  return SYMPTOMS.map((s) => {
    const byDay = sums[s.id].map((sum, i) => (samples[i] > 0 ? sum / samples[i] : 0));
    let peakDay: number | null = null;
    let peak = 0;
    byDay.forEach((v, i) => {
      if (v > peak) {
        peak = v;
        peakDay = i;
      }
    });
    return { symptom: s.id, byDay, samples: [...samples], peakDay, total: totals[s.id] };
  })
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
}

/** Counts how often each symptom appeared since `since` (epoch ms). */
export function symptomCounts(logs: SymptomLog[], since: number): { symptom: SymptomId; count: number; avgSeverity: number }[] {
  const map = new Map<SymptomId, { count: number; sum: number }>();
  for (const log of logs) {
    if (Date.parse(log.at) < since) continue;
    for (const [id, severity] of Object.entries(log.symptoms) as [SymptomId, Severity][]) {
      if (!severity) continue;
      const entry = map.get(id) ?? { count: 0, sum: 0 };
      entry.count++;
      entry.sum += severity;
      map.set(id, entry);
    }
  }
  return [...map.entries()]
    .map(([symptom, { count, sum }]) => ({ symptom, count, avgSeverity: sum / count }))
    .sort((a, b) => b.count - a.count);
}

const ORDINAL = ['the day of your dose', 'day 1 after your dose', 'day 2 after your dose', 'day 3 after your dose', 'day 4 after your dose', 'day 5 after your dose', 'day 6+ after your dose'];

/** A plain-language insight when a symptom clearly clusters on one day after the dose. */
export function patternInsight(pattern: SymptomPattern): string | null {
  if (pattern.peakDay === null || pattern.total < 3) return null;
  const values = pattern.byDay.filter((_, i) => pattern.samples[i] > 0);
  if (values.length < 3) return null;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const peak = pattern.byDay[pattern.peakDay];
  if (peak < mean * 1.5 || peak < 0.5) return null;
  const label = symptomInfo(pattern.symptom).label;
  return `${label} tends to peak on ${ORDINAL[pattern.peakDay] ?? `day ${pattern.peakDay}`}.`;
}
