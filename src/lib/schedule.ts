import {
  addDays,
  atTimeOfDay,
  calendarDaysBetween,
  isSameDay,
  startOfDay,
  type TimeOfDay,
} from './dates';
import { scheduleIntervalDays } from './medications';
import type { DoseLog, Medication, Schedule } from './types';

export type DoseState = 'taken' | 'due' | 'overdue' | 'upcoming' | 'not_started';

export interface DoseStatus {
  state: DoseState;
  nextDueAt: Date;
  lastDose?: DoseLog;
  /** Whole calendar days the dose is overdue (0 unless state is "overdue"). */
  overdueDays: number;
  /** Whole calendar days since the last dose, if any. */
  daysSinceLast?: number;
}

function firstMatchingDay(from: Date, matches: (weekday: number) => boolean): Date {
  let day = startOfDay(from);
  for (let i = 0; i < 14; i++) {
    if (matches(day.getDay())) return day;
    day = addDays(day, 1);
  }
  return startOfDay(from);
}

/**
 * The next scheduled dose after `lastDoseAt` (or the first dose on/after `startedAt`).
 * This is the raw schedule — it can be in the past when a dose was missed.
 */
export function nextScheduledAfter(
  schedule: Schedule,
  reminderTime: TimeOfDay,
  lastDoseAt: Date | null,
  startedAt: Date,
): Date {
  if (!lastDoseAt) {
    const firstDay =
      schedule.kind === 'weekly'
        ? firstMatchingDay(startedAt, (d) => d === schedule.weekday)
        : schedule.kind === 'weekdays' && schedule.days.length > 0
          ? firstMatchingDay(startedAt, (d) => schedule.days.includes(d))
          : startOfDay(startedAt);
    return atTimeOfDay(firstDay, reminderTime);
  }

  const lastDay = startOfDay(lastDoseAt);
  switch (schedule.kind) {
    case 'daily':
      return atTimeOfDay(addDays(lastDay, 1), reminderTime);
    case 'interval':
      return atTimeOfDay(addDays(lastDay, Math.max(1, Math.round(schedule.everyDays))), reminderTime);
    case 'weekly': {
      // Keep the fixed weekday, but never schedule the next shot sooner than 4 days after the last
      // one — an early or late shot shouldn't produce a near-duplicate dose.
      const day = firstMatchingDay(addDays(lastDay, 4), (d) => d === schedule.weekday);
      return atTimeOfDay(day, reminderTime);
    }
    case 'weekdays': {
      if (schedule.days.length === 0) return atTimeOfDay(addDays(lastDay, 7), reminderTime);
      const day = firstMatchingDay(addDays(lastDay, 1), (d) => schedule.days.includes(d));
      return atTimeOfDay(day, reminderTime);
    }
  }
}

export function dosesForMedication(doses: DoseLog[], medicationId: string): DoseLog[] {
  return doses
    .filter((d) => d.medicationId === medicationId)
    .sort((a, b) => Date.parse(a.takenAt) - Date.parse(b.takenAt));
}

export function lastDoseOf(doses: DoseLog[], medicationId: string): DoseLog | undefined {
  let latest: DoseLog | undefined;
  for (const dose of doses) {
    if (dose.medicationId !== medicationId) continue;
    if (!latest || Date.parse(dose.takenAt) > Date.parse(latest.takenAt)) latest = dose;
  }
  return latest;
}

export function doseStatus(medication: Medication, doses: DoseLog[], now: Date): DoseStatus {
  const lastDose = lastDoseOf(doses, medication.id);
  const lastAt = lastDose ? new Date(lastDose.takenAt) : null;
  const startedAt = new Date(medication.startedAt);
  let nextDueAt = nextScheduledAfter(medication.schedule, medication.reminderTime, lastAt, startedAt);
  const daysSinceLast = lastAt ? calendarDaysBetween(lastAt, now) : undefined;

  if (!lastAt && calendarDaysBetween(now, startedAt) > 0) {
    return { state: 'not_started', nextDueAt, overdueDays: 0 };
  }

  if (lastAt && isSameDay(lastAt, now)) {
    return { state: 'taken', nextDueAt, lastDose, overdueDays: 0, daysSinceLast };
  }

  // Daily medications don't accumulate a backlog: a missed day simply rolls to today.
  if (medication.schedule.kind === 'daily' && calendarDaysBetween(nextDueAt, now) > 0) {
    nextDueAt = atTimeOfDay(startOfDay(now), medication.reminderTime);
  }

  const daysUntil = calendarDaysBetween(now, nextDueAt);
  if (daysUntil < 0) {
    return { state: 'overdue', nextDueAt, lastDose, overdueDays: -daysUntil, daysSinceLast };
  }
  if (daysUntil === 0) {
    return { state: 'due', nextDueAt, lastDose, overdueDays: 0, daysSinceLast };
  }
  return { state: 'upcoming', nextDueAt, lastDose, overdueDays: 0, daysSinceLast };
}

/** Future doses assuming the user sticks to the schedule at the current dose. */
export function projectedDoses(
  medication: Medication,
  doses: DoseLog[],
  now: Date,
  until: Date,
): { time: number; mg: number }[] {
  const result: { time: number; mg: number }[] = [];
  const status = doseStatus(medication, doses, now);
  let next = status.state === 'overdue' ? atTimeOfDay(startOfDay(now), medication.reminderTime) : status.nextDueAt;
  if (next.getTime() < now.getTime() && status.state !== 'taken') next = new Date(now.getTime());
  const startedAt = new Date(medication.startedAt);
  for (let i = 0; i < 400 && next.getTime() <= until.getTime(); i++) {
    result.push({ time: next.getTime(), mg: medication.currentDoseMg });
    next = nextScheduledAfter(medication.schedule, medication.reminderTime, next, startedAt);
  }
  return result;
}

/** Share of expected doses that were logged between `from` and `to` (0–1). */
export function adherence(medication: Medication, doses: DoseLog[], from: Date, to: Date): number | null {
  const start = Math.max(from.getTime(), Date.parse(medication.startedAt));
  const days = (to.getTime() - start) / 86_400_000;
  if (days < 1) return null;
  const expected = days / scheduleIntervalDays(medication.schedule);
  if (expected < 1) return null;
  const actual = doses.filter(
    (d) => d.medicationId === medication.id && Date.parse(d.takenAt) >= start && Date.parse(d.takenAt) <= to.getTime(),
  ).length;
  return Math.min(1, actual / Math.floor(expected));
}

export function describeSchedule(schedule: Schedule): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  switch (schedule.kind) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return `Weekly on ${['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][schedule.weekday]}`;
    case 'interval':
      return schedule.everyDays === 1 ? 'Every day' : `Every ${schedule.everyDays} days`;
    case 'weekdays':
      return schedule.days.length === 0
        ? 'No days selected'
        : [...schedule.days]
            .sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7))
            .map((d) => names[d])
            .join(' & ');
  }
}
