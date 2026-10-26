import { Platform } from 'react-native';

import { addDays, atTimeOfDay, calendarDaysBetween, startOfDay, toDateKey } from '@/lib/dates';
import { uid } from '@/lib/id';
import { INJECTION_SITES } from '@/lib/sites';
import type { DayLog, DoseLog, Medication, Profile, SymptomLog, WeightLog } from '@/lib/types';
import { lbToKg } from '@/lib/units';

import { DEFAULT_SETTINGS, useStore } from './index';

/** Deterministic PRNG so demo screenshots are reproducible. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ~14 weeks of realistic Zepbound data: titration, weigh-ins, nutrition and side effects.
 * By default the next shot is due tomorrow; `shotToday` makes today shot day instead.
 */
export function buildDemoData(now = new Date(), { shotToday = false }: { shotToday?: boolean } = {}) {
  const rand = mulberry32(42);
  const weeks = 14;
  const start = addDays(startOfDay(now), -weeks * 7 + (shotToday ? 0 : 1));
  // Shots fall on the start date's weekday.
  const shotDay = start.getDay();

  const profile: Profile = {
    name: 'Jordan',
    sex: 'female',
    heightCm: 168,
    startWeightKg: lbToKg(231.4),
    goalWeightKg: lbToKg(175),
    goal: 'lose',
    concerns: ['muscle', 'side_effects', 'plateau'],
    strengthHabit: 'sometimes',
    weightUnit: 'lb',
    volumeUnit: 'oz',
    heightUnit: 'ftin',
    journeyStartedAt: start.toISOString(),
  };

  const medication: Medication = {
    id: 'demo-zepbound',
    presetId: 'zepbound',
    name: 'Zepbound',
    compound: 'tirzepatide',
    form: 'injection',
    currentDoseMg: 10,
    schedule: { kind: 'weekly', weekday: shotDay },
    reminderTime: '08:00',
    remindersEnabled: true,
    startedAt: start.toISOString(),
    active: true,
    dosesRemaining: 3,
    monthlyCost: 499,
    createdAt: start.toISOString(),
  };

  const ladder = [2.5, 2.5, 2.5, 2.5, 5, 5, 5, 5, 7.5, 7.5, 7.5, 7.5, 10, 10];
  const doses: DoseLog[] = ladder.map((mg, i) => ({
    id: uid(),
    medicationId: medication.id,
    takenAt: atTimeOfDay(addDays(start, i * 7), i % 3 === 0 ? '08:12' : '07:48').toISOString(),
    doseMg: mg,
    site: INJECTION_SITES[i % INJECTION_SITES.length].id,
    note: i === 4 ? 'First 5 mg — a little queasy in the evening' : undefined,
  }));

  const weights: WeightLog[] = [];
  const totalDays = calendarDaysBetween(start, now);
  const startLb = 231.4;
  for (let d = 0; d <= totalDays; d += 1) {
    if (d % 2 === 1 && d !== totalDays) continue; // weigh in most mornings
    const progress = d / totalDays;
    // Fast early loss that slows, plus a short plateau around week 7.
    const plateau = d > 45 && d < 56 ? (d - 45) * 0.06 : d >= 56 ? 0.66 : 0;
    const lb = startLb - 26.5 * (1 - Math.exp(-progress * 1.9)) / (1 - Math.exp(-1.9)) + plateau + (rand() - 0.5) * 1.4;
    weights.push({ id: uid(), at: atTimeOfDay(addDays(start, d), '07:15').toISOString(), kg: lbToKg(lb) });
  }

  const days: Record<string, DayLog> = {};
  for (let d = 0; d <= totalDays; d++) {
    const date = addDays(start, d);
    const key = toDateKey(date);
    const isToday = d === totalDays;
    const consistency = 0.55 + 0.4 * (d / totalDays);
    days[key] = {
      date: key,
      proteinG: Math.round((isToday ? 62 : 70 + rand() * 60 * consistency + 20 * consistency) / 5) * 5,
      waterMl: Math.round((isToday ? 1400 : 1500 + rand() * 1400) / 100) * 100,
      fiberG: Math.round(isToday ? 11 : 12 + rand() * 16),
      strength: !isToday && (date.getDay() === 2 || date.getDay() === 5 || (date.getDay() === 0 && rand() > 0.5)) && rand() > 0.15,
    };
  }

  const symptoms: SymptomLog[] = [];
  for (let d = 0; d < totalDays; d++) {
    const sinceDose = d % 7;
    const doseIndex = Math.floor(d / 7);
    const stepUp = doseIndex === 4 || doseIndex === 8 || doseIndex === 12;
    const nauseaChance = sinceDose >= 1 && sinceDose <= 2 ? (stepUp ? 0.95 : 0.6) : 0.12;
    if (rand() > 0.62 && !(sinceDose >= 1 && sinceDose <= 2)) continue;
    const entry: SymptomLog = {
      id: uid(),
      at: atTimeOfDay(addDays(start, d), '20:30').toISOString(),
      symptoms: {},
      foodNoise: sinceDose >= 5 ? 2 : sinceDose <= 2 ? 0 : 1,
      energy: sinceDose === 1 ? 3 : 4,
    };
    if (rand() < nauseaChance) entry.symptoms.nausea = stepUp && sinceDose === 1 ? 2 : 1;
    if (sinceDose >= 2 && sinceDose <= 4 && rand() < 0.35) entry.symptoms.constipation = 1;
    if (sinceDose === 1 && rand() < 0.4) entry.symptoms.fatigue = 1;
    if (stepUp && sinceDose === 2 && rand() < 0.5) entry.symptoms.sulfur_burps = 1;
    symptoms.push(entry);
  }

  return { profile, medications: [medication], doses, weights, days, symptoms };
}

export function loadDemoData(options: { premium?: boolean; shotToday?: boolean } = {}) {
  const data = buildDemoData(new Date(), { shotToday: options.shotToday });
  useStore.getState().replaceData({
    ...data,
    targetOverrides: {},
    settings: DEFAULT_SETTINGS,
    pillTimer: null,
    premium: options.premium ?? useStore.getState().premium,
    meta: { ...useStore.getState().meta, onboardingCompletedAt: new Date().toISOString(), appOpens: 3 },
  });
}

/** Web-only: `?demo=1` (plus `&premium=1`, `&shotday=1`) loads demo data, used for screenshots. */
export function maybeLoadDemoFromUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === '1') {
    loadDemoData({ premium: params.get('premium') === '1', shotToday: params.get('shotday') === '1' });
  }
  if (params.get('reset') === '1') useStore.getState().resetAll();
}
