import { DAY_MS } from '../dates';
import type { DoseLog, WeightLog } from '../types';
import { lbToKg } from '../units';
import {
  dailyWeights,
  doseChanges,
  doseInEffectAt,
  lossByDose,
  milestones,
  projectedGoalDate,
  weeklyRate,
  weightSummary,
} from '../weight';

const start = new Date(2026, 0, 5, 7).getTime();
const w = (dayOffset: number, kg: number, id = `${dayOffset}`): WeightLog => ({
  id,
  at: new Date(start + dayOffset * DAY_MS).toISOString(),
  kg,
});
const d = (dayOffset: number, mg: number, hour = 0): DoseLog => ({
  id: `d${dayOffset}`,
  medicationId: 'm',
  takenAt: new Date(start + dayOffset * DAY_MS + hour * 3_600_000).toISOString(),
  doseMg: mg,
});

describe('weightSummary', () => {
  it('computes loss, percent and progress toward goal', () => {
    const summary = weightSummary(100, 80, [w(0, 100), w(30, 90)]);
    expect(summary.lostKg).toBe(10);
    expect(summary.percentLost).toBe(10);
    expect(summary.remainingKg).toBe(10);
    expect(summary.progress).toBe(0.5);
  });

  it('falls back to the start weight with no logs', () => {
    expect(weightSummary(100, 80, []).currentKg).toBe(100);
  });
});

describe('weeklyRate', () => {
  it('fits a straight line in kg per week', () => {
    const logs = [0, 7, 14, 21].map((day, i) => w(day, 100 - i));
    expect(weeklyRate(logs, new Date(start + 22 * DAY_MS))).toBeCloseTo(-1, 5);
  });

  it('needs at least five days of data', () => {
    expect(weeklyRate([w(0, 100), w(2, 99)], new Date(start + 3 * DAY_MS))).toBeNull();
  });
});

describe('projectedGoalDate', () => {
  it('extrapolates a downward trend', () => {
    const now = new Date(start);
    const date = projectedGoalDate(90, 80, -1, now)!;
    expect(Math.round((date.getTime() - now.getTime()) / DAY_MS)).toBe(70);
  });

  it('is null when not losing', () => {
    expect(projectedGoalDate(90, 80, 0.3, new Date())).toBeNull();
    expect(projectedGoalDate(90, 80, null, new Date())).toBeNull();
  });
});

describe('milestones', () => {
  it('marks percent and round-number milestones with the date first reached', () => {
    const startKg = lbToKg(200);
    const logs = [w(0, startKg), w(20, lbToKg(189)), w(40, lbToKg(179))];
    const result = milestones(startKg, logs, 'lb');
    const five = result.find((m) => m.id === 'pct-5')!;
    expect(five.achieved).toBe(true);
    expect(five.achievedAt).toBe(logs[1].at);
    expect(result.find((m) => m.id === 'pct-10')!.achieved).toBe(true);
    expect(result.find((m) => m.id === 'abs-20')!.achieved).toBe(true);
    expect(result.find((m) => m.id === 'abs-30')!.achieved).toBe(false);
    // Achieved milestones come first.
    expect(result[0].achieved).toBe(true);
  });
});

describe('dose attribution', () => {
  const doses = [d(0, 2.5), d(7, 2.5), d(14, 5), d(21, 5), d(28, 7.5)];

  it('finds the dose in effect by timestamp', () => {
    // Weigh-in the morning of day 14, before the evening shot, still belongs to 2.5 mg.
    const evening = [d(0, 2.5), d(14, 5, 20)];
    expect(doseInEffectAt(evening, start + 14 * DAY_MS + 2 * 3_600_000)?.doseMg).toBe(2.5);
    expect(doseInEffectAt(evening, start + 14 * DAY_MS + 21 * 3_600_000)?.doseMg).toBe(5);
  });

  it('collapses consecutive doses into dose changes', () => {
    expect(doseChanges(doses).map((c) => c.doseMg)).toEqual([2.5, 5, 7.5]);
  });

  it('attributes weight lost to each dose period', () => {
    const weights = [w(0, 100), w(13, 97), w(27, 95), w(33, 94)];
    const periods = lossByDose(doses, weights, new Date(start + 35 * DAY_MS));
    expect(periods.map((p) => p.doseMg)).toEqual([2.5, 5, 7.5]);
    expect(periods[0].lostKg).toBeCloseTo(3, 5);
    expect(periods[1].lostKg).toBeCloseTo(2, 5);
    expect(periods[2].lostKg).toBeCloseTo(1, 5);
    expect(periods[0].weeks).toBeCloseTo(2, 5);
  });
});

describe('dailyWeights', () => {
  it('keeps the last weigh-in of each day', () => {
    const logs = [w(0, 100, 'a'), { ...w(0, 99.5, 'b'), at: new Date(start + 3_600_000).toISOString() }, w(1, 99, 'c')];
    expect(dailyWeights(logs).map((l) => l.id)).toEqual(['b', 'c']);
  });
});
