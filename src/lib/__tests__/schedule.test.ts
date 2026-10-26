import { toDateKey } from '../dates';
import { adherence, describeSchedule, doseStatus, nextScheduledAfter, projectedDoses } from '../schedule';
import type { DoseLog, Medication, Schedule } from '../types';

// 2026-03-02 is a Monday.
const MON = new Date(2026, 2, 2, 9, 0);

function med(schedule: Schedule, overrides: Partial<Medication> = {}): Medication {
  return {
    id: 'm1',
    presetId: 'zepbound',
    name: 'Zepbound',
    compound: 'tirzepatide',
    form: 'injection',
    currentDoseMg: 5,
    schedule,
    reminderTime: '09:00',
    remindersEnabled: true,
    startedAt: new Date(2026, 1, 2).toISOString(),
    active: true,
    createdAt: new Date(2026, 1, 2).toISOString(),
    ...overrides,
  };
}

function dose(at: Date, mg = 5): DoseLog {
  return { id: at.toISOString(), medicationId: 'm1', takenAt: at.toISOString(), doseMg: mg };
}

const day = (offset: number, hour = 9) => new Date(2026, 2, 2 + offset, hour, 0);

describe('nextScheduledAfter', () => {
  it('weekly: keeps the fixed weekday after an on-time dose', () => {
    const next = nextScheduledAfter({ kind: 'weekly', weekday: 1 }, '08:30', MON, MON);
    expect(toDateKey(next)).toBe('2026-03-09');
    expect(next.getHours()).toBe(8);
    expect(next.getMinutes()).toBe(30);
  });

  it('weekly: a late shot still returns to the usual day', () => {
    // Taken Wednesday instead of Monday → next is the following Monday (5 days later).
    expect(toDateKey(nextScheduledAfter({ kind: 'weekly', weekday: 1 }, '09:00', day(2), MON))).toBe('2026-03-09');
  });

  it('weekly: an early shot never schedules a near-duplicate', () => {
    // Taken Sunday (one day early) → next is Monday the week after, not tomorrow.
    expect(toDateKey(nextScheduledAfter({ kind: 'weekly', weekday: 1 }, '09:00', day(6), MON))).toBe('2026-03-16');
  });

  it('interval: counts days from the last dose', () => {
    expect(toDateKey(nextScheduledAfter({ kind: 'interval', everyDays: 10 }, '09:00', MON, MON))).toBe('2026-03-12');
  });

  it('weekdays: split dosing picks the next selected day', () => {
    const split: Schedule = { kind: 'weekdays', days: [1, 4] };
    expect(toDateKey(nextScheduledAfter(split, '09:00', MON, MON))).toBe('2026-03-05');
    expect(toDateKey(nextScheduledAfter(split, '09:00', day(3), MON))).toBe('2026-03-09');
  });

  it('first dose falls on the first matching day on or after the start date', () => {
    const wed = day(2);
    expect(toDateKey(nextScheduledAfter({ kind: 'weekly', weekday: 5 }, '09:00', null, wed))).toBe('2026-03-06');
    expect(toDateKey(nextScheduledAfter({ kind: 'daily' }, '09:00', null, wed))).toBe('2026-03-04');
  });
});

describe('doseStatus', () => {
  const weekly = med({ kind: 'weekly', weekday: 1 });

  it('is "taken" on the day a dose was logged', () => {
    expect(doseStatus(weekly, [dose(MON)], day(0, 20)).state).toBe('taken');
  });

  it('is "upcoming" mid-week', () => {
    const status = doseStatus(weekly, [dose(MON)], day(3));
    expect(status.state).toBe('upcoming');
    expect(status.daysSinceLast).toBe(3);
  });

  it('is "due" on shot day and "overdue" after', () => {
    expect(doseStatus(weekly, [dose(MON)], day(7, 7)).state).toBe('due');
    const late = doseStatus(weekly, [dose(MON)], day(9));
    expect(late.state).toBe('overdue');
    expect(late.overdueDays).toBe(2);
  });

  it('daily medications roll a missed day forward instead of piling up', () => {
    const daily = med({ kind: 'daily' }, { form: 'pill' });
    const status = doseStatus(daily, [dose(MON)], day(3, 7));
    expect(status.state).toBe('due');
    expect(toDateKey(status.nextDueAt)).toBe('2026-03-05');
  });

  it('is "not_started" before the start date with no doses', () => {
    const future = med({ kind: 'weekly', weekday: 1 }, { startedAt: day(10).toISOString() });
    expect(doseStatus(future, [], MON).state).toBe('not_started');
  });
});

describe('projectedDoses', () => {
  it('projects weekly doses at the current dose', () => {
    const weekly = med({ kind: 'weekly', weekday: 1 }, { currentDoseMg: 7.5 });
    const projected = projectedDoses(weekly, [dose(MON)], day(1), day(22));
    expect(projected.map((p) => toDateKey(new Date(p.time)))).toEqual(['2026-03-09', '2026-03-16', '2026-03-23']);
    expect(projected.every((p) => p.mg === 7.5)).toBe(true);
  });

  it('assumes an overdue dose is taken now', () => {
    const weekly = med({ kind: 'weekly', weekday: 1 });
    const now = day(9, 12);
    const projected = projectedDoses(weekly, [dose(MON)], now, day(20));
    expect(projected[0].time).toBe(now.getTime());
  });
});

describe('adherence', () => {
  it('is the share of expected doses logged', () => {
    const weekly = med({ kind: 'weekly', weekday: 1 }, { startedAt: MON.toISOString() });
    const doses = [dose(MON), dose(day(7)), dose(day(21))];
    expect(adherence(weekly, doses, MON, day(28, 10))).toBeCloseTo(3 / 4, 5);
  });

  it('returns null for too-short windows', () => {
    const weekly = med({ kind: 'weekly', weekday: 1 }, { startedAt: MON.toISOString() });
    expect(adherence(weekly, [], MON, day(3))).toBeNull();
  });
});

describe('describeSchedule', () => {
  it('describes each schedule type', () => {
    expect(describeSchedule({ kind: 'daily' })).toBe('Every day');
    expect(describeSchedule({ kind: 'weekly', weekday: 1 })).toBe('Weekly on Mondays');
    expect(describeSchedule({ kind: 'interval', everyDays: 10 })).toBe('Every 10 days');
    expect(describeSchedule({ kind: 'weekdays', days: [4, 1] })).toBe('Mon & Thu');
    expect(describeSchedule({ kind: 'weekdays', days: [0, 3] })).toBe('Wed & Sun');
  });
});
