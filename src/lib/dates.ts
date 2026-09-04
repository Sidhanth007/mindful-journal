/**
 * Journal entries are keyed by a calendar day (Postgres DATE). We represent a
 * day as an ISO string "YYYY-MM-DD" in the app and as a UTC-midnight Date in
 * Prisma, so no timezone arithmetic leaks into storage.
 */

export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function dateToDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar day in the given IANA timezone (defaults to UTC). */
export function todayInTimezone(timeZone = "UTC"): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function formatDay(day: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" }): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", ...opts }).format(dayToDate(day));
}

export function addDays(day: string, delta: number): string {
  const d = dayToDate(day);
  d.setUTCDate(d.getUTCDate() + delta);
  return dateToDay(d);
}

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}
