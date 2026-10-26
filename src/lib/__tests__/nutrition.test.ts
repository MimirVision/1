import { toDateKey } from '../dates';
import {
  averageProtein,
  fiberTarget,
  muscleShield,
  proteinStreak,
  proteinTarget,
  shieldHistory,
  strengthSessionsThisWeek,
  waterTarget,
} from '../nutrition';
import type { DayLog, Targets } from '../types';

const targets: Targets = { proteinG: 120, waterMl: 2500, fiberG: 25, strengthPerWeek: 2 };

function dayLog(date: Date, patch: Partial<DayLog> = {}): DayLog {
  return { date: toDateKey(date), proteinG: 0, waterMl: 0, fiberG: 0, strength: false, ...patch };
}

describe('targets', () => {
  it('scales protein with goal weight and training', () => {
    expect(proteinTarget({ goalWeightKg: 80, startWeightKg: 110, strengthHabit: 'never' })).toBe(95);
    expect(proteinTarget({ goalWeightKg: 80, startWeightKg: 110, strengthHabit: 'regular' })).toBe(120);
  });

  it('clamps protein to a sensible range', () => {
    expect(proteinTarget({ goalWeightKg: 40, startWeightKg: 45, strengthHabit: 'never' })).toBe(60);
    expect(proteinTarget({ goalWeightKg: 150, startWeightKg: 200, strengthHabit: 'regular' })).toBe(180);
  });

  it('uses start weight when the goal is unset', () => {
    expect(proteinTarget({ goalWeightKg: 0, startWeightKg: 70, strengthHabit: 'never' })).toBe(85);
  });

  it('bounds water and sets fiber by sex', () => {
    expect(waterTarget(50)).toBe(2000);
    expect(waterTarget(100)).toBe(3000);
    expect(waterTarget(200)).toBe(3500);
    expect(fiberTarget('female')).toBe(25);
    expect(fiberTarget('male')).toBe(30);
  });
});

describe('muscleShield', () => {
  it('is 100 when every target is met', () => {
    const day = dayLog(new Date(), { proteinG: 130, waterMl: 3000, fiberG: 30, strength: true });
    const result = muscleShield(day, targets, 2);
    expect(result.score).toBe(100);
    expect(result.label).toBe('Fully shielded');
  });

  it('weights protein at half the score', () => {
    const day = dayLog(new Date(), { proteinG: 120 });
    expect(muscleShield(day, targets, 0).score).toBe(50);
  });

  it('counts weekly strength progress, not just today', () => {
    const day = dayLog(new Date());
    expect(muscleShield(day, targets, 1).score).toBe(10);
  });
});

describe('history helpers', () => {
  // 2026-03-04 is a Wednesday.
  const wed = new Date(2026, 2, 4, 12);
  const days: Record<string, DayLog> = {
    '2026-03-02': dayLog(new Date(2026, 2, 2), { proteinG: 125, strength: true }),
    '2026-03-03': dayLog(new Date(2026, 2, 3), { proteinG: 130 }),
    '2026-03-04': dayLog(wed, { proteinG: 40, strength: true }),
    '2026-03-01': dayLog(new Date(2026, 2, 1), { proteinG: 100, strength: true }),
  };

  it('counts strength sessions in the Monday-start week', () => {
    expect(strengthSessionsThisWeek(days, wed)).toBe(2);
  });

  it('computes a streak ending yesterday when today is not yet complete', () => {
    expect(proteinStreak(days, 120, wed)).toBe(2);
  });

  it('averages only days that have protein logged', () => {
    expect(averageProtein(days, ['2026-03-02', '2026-03-03', '2026-02-20'])).toBe(127.5);
    expect(averageProtein(days, ['2026-02-20'])).toBeNull();
  });

  it('returns one score per day, oldest first', () => {
    const history = shieldHistory(days, targets, wed, 3);
    expect(history.map((h) => h.date)).toEqual(['2026-03-02', '2026-03-03', '2026-03-04']);
    expect(history[0].score).toBeGreaterThan(history[2].score - 1);
  });
});
