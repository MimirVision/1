import { HOUR_MS } from '../dates';
import { COMPOUNDS } from '../medications';
import {
  levelAt,
  levelSeries,
  levelTrend,
  peakTimeHours,
  pkParams,
  singleDoseLevel,
  steadyStatePeak,
} from '../pk';

describe('pkParams', () => {
  it.each(Object.values(COMPOUNDS).filter((c) => c.halfLifeHours && c.tmaxHours))(
    'reproduces the published Tmax for $name',
    (compound) => {
      const p = pkParams(compound.halfLifeHours!, compound.tmaxHours!);
      expect(p.ka).toBeGreaterThan(p.ke);
      expect(peakTimeHours(p.ka, p.ke)).toBeCloseTo(compound.tmaxHours!, 3);
    },
  );

  it('derives ke from the half-life', () => {
    const p = pkParams(165, 56);
    expect(p.ke).toBeCloseTo(Math.LN2 / 165, 10);
  });
});

describe('single dose curve', () => {
  const p = pkParams(116.7, 24);

  it('is zero before the dose and positive after', () => {
    expect(singleDoseLevel(5, -1, p)).toBe(0);
    expect(singleDoseLevel(5, 0, p)).toBe(0);
    expect(singleDoseLevel(5, 1, p)).toBeGreaterThan(0);
  });

  it('peaks at Tmax and halves roughly every half-life in the tail', () => {
    const atPeak = singleDoseLevel(5, 24, p);
    expect(singleDoseLevel(5, 20, p)).toBeLessThan(atPeak);
    expect(singleDoseLevel(5, 28, p)).toBeLessThan(atPeak);
    const late = singleDoseLevel(5, 400, p);
    const lateHalf = singleDoseLevel(5, 400 + 116.7, p);
    expect(lateHalf / late).toBeCloseTo(0.5, 2);
  });

  it('never exceeds the dose', () => {
    for (let h = 0; h < 1000; h += 7) expect(singleDoseLevel(5, h, p)).toBeLessThan(5);
  });
});

describe('superposition', () => {
  const p = pkParams(165, 56);
  const week = 7 * 24 * HOUR_MS;

  it('accumulates toward the closed-form steady-state peak with weekly dosing', () => {
    const doses = Array.from({ length: 30 }, (_, i) => ({ time: i * week, mg: 1 }));
    const series = levelSeries(doses, p, 29 * week, 30 * week, HOUR_MS);
    const simulatedPeak = Math.max(...series.map((s) => s.value));
    expect(simulatedPeak).toBeCloseTo(steadyStatePeak(1, 168, p), 1);
    // Weekly semaglutide accumulates roughly 2x over a single dose.
    expect(simulatedPeak / singleDoseLevel(1, 56, p)).toBeGreaterThan(1.8);
  });

  it('ignores doses in the future', () => {
    const now = 10 * week;
    expect(levelAt([{ time: now + HOUR_MS, mg: 1 }], now, p)).toBe(0);
  });

  it('reports trend relative to the peak', () => {
    const doses = [{ time: 0, mg: 1 }];
    expect(levelTrend(doses, 2 * HOUR_MS, p)).toBe('rising');
    expect(levelTrend(doses, 5 * 24 * HOUR_MS, p)).toBe('falling');
    expect(levelTrend([], 0, p)).toBe('steady');
  });
});

describe('levelSeries', () => {
  it('includes both endpoints', () => {
    const p = pkParams(13, 11);
    const series = levelSeries([{ time: 0, mg: 1 }], p, 0, 10 * HOUR_MS, 3 * HOUR_MS);
    expect(series[0].t).toBe(0);
    expect(series[series.length - 1].t).toBe(10 * HOUR_MS);
  });

  it('returns nothing for an empty range', () => {
    expect(levelSeries([], pkParams(13, 11), 10, 0)).toEqual([]);
  });
});
