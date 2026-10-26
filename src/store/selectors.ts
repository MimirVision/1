import { useEffect, useMemo, useState } from 'react';

import { toDateKey } from '@/lib/dates';
import { computeTargets } from '@/lib/nutrition';
import type { Medication, Targets } from '@/lib/types';
import { latestWeight } from '@/lib/weight';

import { useStore } from './index';

export function useTargets(): Targets {
  const profile = useStore((s) => s.profile);
  const weights = useStore((s) => s.weights);
  const overrides = useStore((s) => s.targetOverrides);
  return useMemo(() => {
    if (!profile) return { proteinG: 100, waterMl: 2500, fiberG: 25, strengthPerWeek: 2 };
    const current = latestWeight(weights)?.kg ?? profile.startWeightKg;
    return { ...computeTargets(profile, current), ...overrides };
  }, [profile, weights, overrides]);
}

export function useActiveMedications(): Medication[] {
  const medications = useStore((s) => s.medications);
  return useMemo(() => medications.filter((m) => m.active), [medications]);
}

/** The medication the Today screen focuses on: the first active one. */
export function usePrimaryMedication(): Medication | undefined {
  return useActiveMedications()[0];
}

export function useCurrentWeightKg(): number | null {
  const profile = useStore((s) => s.profile);
  const weights = useStore((s) => s.weights);
  return useMemo(() => latestWeight(weights)?.kg ?? profile?.startWeightKg ?? null, [profile, weights]);
}

/** Current time, refreshed on an interval so countdowns and "today" stay correct. */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useTodayKey(): string {
  return toDateKey(useNow(60_000));
}
