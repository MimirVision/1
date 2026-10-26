import { toDateKey } from '../dates';
import { getPreset } from '../medications';
import { backfillDoses, buildOnboardingResult, type OnboardingDraft } from '../onboarding';

const now = new Date(2026, 2, 16, 12); // Monday

const draft: OnboardingDraft = {
  goal: 'lose',
  presetId: 'zepbound',
  customName: '',
  doseMg: 7.5,
  schedule: { kind: 'weekly', weekday: 1 },
  reminderTime: '09:00',
  lastDoseDaysAgo: 0,
  startedDaysAgo: 84,
  backfill: true,
  weightUnit: 'lb',
  volumeUnit: 'oz',
  heightUnit: 'ftin',
  currentWeightKg: 95,
  startWeightKg: 105,
  heightCm: 170,
  goalWeightKg: 80,
  sex: 'female',
  strengthHabit: 'never',
  concerns: ['muscle'],
  name: '  Sam ',
};

describe('backfillDoses', () => {
  it('walks back weekly to the start and titrates up the ladder', () => {
    const doses = backfillDoses(getPreset('zepbound'), { kind: 'weekly', weekday: 1 }, 7.5, new Date(2026, 2, 16, 9), new Date(2025, 11, 22), 'm');
    expect(doses).toHaveLength(13);
    expect(toDateKey(new Date(doses[0].takenAt))).toBe('2025-12-22');
    // Last 4 at the current dose, the 4 before one step down, then the starting dose.
    expect(doses.slice(-4).every((d) => d.doseMg === 7.5)).toBe(true);
    expect(doses.slice(-8, -4).every((d) => d.doseMg === 5)).toBe(true);
    expect(doses.slice(0, -8).every((d) => d.doseMg === 2.5)).toBe(true);
  });

  it('keeps a constant dose when it is not on the ladder', () => {
    const doses = backfillDoses(getPreset('compounded_tirzepatide'), { kind: 'weekly', weekday: 1 }, 6, new Date(2026, 2, 16), new Date(2026, 1, 1), 'm');
    expect(new Set(doses.map((d) => d.doseMg))).toEqual(new Set([6]));
  });

  it('handles split weekday schedules', () => {
    const doses = backfillDoses(getPreset('compounded_semaglutide'), { kind: 'weekdays', days: [1, 4] }, 0.5, new Date(2026, 2, 16, 9), new Date(2026, 2, 2), 'm');
    expect(doses.map((d) => toDateKey(new Date(d.takenAt)))).toEqual(['2026-03-02', '2026-03-05', '2026-03-09', '2026-03-12', '2026-03-16']);
  });
});

describe('buildOnboardingResult', () => {
  it('creates profile, medication, backfilled doses and start/current weights', () => {
    const result = buildOnboardingResult(draft, now);
    expect(result.profile.name).toBe('Sam');
    expect(result.profile.startWeightKg).toBe(105);
    expect(result.medication?.name).toBe('Zepbound');
    expect(result.medication?.currentDoseMg).toBe(7.5);
    expect(result.doses.length).toBe(13);
    expect(result.doses.every((d) => d.medicationId === result.medication?.id)).toBe(true);
    expect(result.weights.map((w) => w.kg)).toEqual([105, 95]);
  });

  it('logs only the last dose when backfill is off, and never in the future', () => {
    const result = buildOnboardingResult({ ...draft, backfill: false, reminderTime: '23:00' }, now);
    expect(result.doses).toHaveLength(1);
    expect(Date.parse(result.doses[0].takenAt)).toBeLessThanOrEqual(now.getTime());
  });

  it('supports users who have not started a medication', () => {
    const result = buildOnboardingResult({ ...draft, presetId: null, startedDaysAgo: 0 }, now);
    expect(result.medication).toBeNull();
    expect(result.doses).toEqual([]);
    expect(result.weights).toHaveLength(1);
  });
});
