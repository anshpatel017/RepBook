/**
 * Sunday never exists in data. day_of_week is 1 (Mon) … 6 (Sat) everywhere —
 * database, routes and UI. Sunday is rendered as a static rest card.
 */

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6;

export const DAYS: readonly { value: DayOfWeek; short: string; long: string }[] = [
  { value: 1, short: 'Mon', long: 'Monday' },
  { value: 2, short: 'Tue', long: 'Tuesday' },
  { value: 3, short: 'Wed', long: 'Wednesday' },
  { value: 4, short: 'Thu', long: 'Thursday' },
  { value: 5, short: 'Fri', long: 'Friday' },
  { value: 6, short: 'Sat', long: 'Saturday' },
];

export function isDayOfWeek(value: number): value is DayOfWeek {
  return Number.isInteger(value) && value >= 1 && value <= 6;
}

/** Parse a route param. Returns null for anything that isn't Mon–Sat. */
export function parseDay(param: string | string[] | undefined): DayOfWeek | null {
  const raw = Array.isArray(param) ? param[0] : param;
  const value = Number(raw);
  return isDayOfWeek(value) ? value : null;
}

export function parseWeek(param: string | string[] | undefined): number | null {
  const raw = Array.isArray(param) ? param[0] : param;
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : null;
}

export function dayLong(day: DayOfWeek): string {
  return DAYS[day - 1]?.long ?? '';
}

export function dayShort(day: DayOfWeek): string {
  return DAYS[day - 1]?.short ?? '';
}

/** Today as 1–6, or null on Sunday (rest day). */
export function todayDay(now: Date = new Date()): DayOfWeek | null {
  const jsDay = now.getDay(); // 0 = Sunday … 6 = Saturday
  return jsDay === 0 ? null : (jsDay as DayOfWeek);
}
