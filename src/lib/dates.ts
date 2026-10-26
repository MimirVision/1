export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

/** Calendar day key in local time, e.g. "2026-03-09". */
export type DateKey = string;

export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Whole calendar days from `a` to `b` (positive when b is later). DST-safe. */
export function calendarDaysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / DAY_MS);
}

export function isSameDay(a: Date, b: Date): boolean {
  return calendarDaysBetween(a, b) === 0;
}

/** "HH:MM" 24h string. */
export type TimeOfDay = string;

export function parseTimeOfDay(time: TimeOfDay): { hours: number; minutes: number } {
  const [h, m] = time.split(':').map(Number);
  return {
    hours: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 9,
    minutes: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}

export function formatTimeOfDay(hours: number, minutes: number): TimeOfDay {
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function atTimeOfDay(day: Date, time: TimeOfDay): Date {
  const { hours, minutes } = parseTimeOfDay(time);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes);
}

export function startOfWeek(date: Date, weekStartsOn = 1): Date {
  const day = startOfDay(date);
  const diff = (day.getDay() - weekStartsOn + 7) % 7;
  return addDays(day, -diff);
}

export const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const WEEKDAY_LONG = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "Mar 9" */
export function formatShortDate(date: Date): string {
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/** "Mar 9, 2026" */
export function formatMediumDate(date: Date): string {
  return `${MONTH_SHORT[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

/** "March 2026" */
export function formatMonthYear(date: Date): string {
  return `${MONTH_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

/** "9:05 AM" */
export function formatClock(date: Date): string {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

export function formatTimeOfDayLabel(time: TimeOfDay): string {
  const { hours, minutes } = parseTimeOfDay(time);
  return formatClock(new Date(2000, 0, 1, hours, minutes));
}

/** "Today", "Tomorrow", "Yesterday", "Thu", "In 9 days", "3 days ago". */
export function formatRelativeDay(date: Date, now: Date): string {
  const diff = calendarDaysBetween(now, date);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return WEEKDAY_LONG[date.getDay()];
  if (diff >= 7) return `In ${diff} days`;
  return `${-diff} days ago`;
}

/** Countdown like "2d 4h", "5h 12m", "14m". */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.round(ms / MINUTE_MS));
  const days = Math.floor(total / (24 * 60));
  const hours = Math.floor((total % (24 * 60)) / 60);
  const minutes = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** "mm:ss" for short timers. */
export function formatTimer(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function weeksBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (7 * DAY_MS);
}

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 5) return 'Good evening';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
