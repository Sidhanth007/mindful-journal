import { addDays, dayToDate } from "@/lib/dates";

export type Streaks = {
  current: number;
  longest: number;
  /** Days inside the current streak that were skipped but forgiven (one per calendar week). */
  forgiven: string[];
  /** True when the current calendar week's rest day has already been used. */
  restDayUsedThisWeek: boolean;
};

/** Monday of the week containing `day`. */
export function weekStartOf(day: string): string {
  return addDays(day, -((dayToDate(day).getUTCDay() + 6) % 7));
}

/**
 * Computes streaks from a set of "YYYY-MM-DD" days with **streak forgiveness**:
 * one missed day per calendar week (Mon–Sun) doesn't break the streak.
 *
 * The current streak counts back from today — or from yesterday if today
 * hasn't been logged yet, so a streak isn't "broken" until the day passes.
 */
export function computeStreaks(days: Iterable<string>, today: string): Streaks {
  const set = new Set(days);
  if (set.size === 0) return { current: 0, longest: 0, forgiven: [], restDayUsedThisWeek: false };

  // ── current streak, walking backwards ──
  const forgiven: string[] = [];
  const gapWeeks = new Set<string>();
  let cursor = set.has(today) ? today : addDays(today, -1);
  let current = 0;
  for (let guard = 0; guard < 20_000; guard++) {
    if (set.has(cursor)) {
      current += 1;
    } else {
      const ws = weekStartOf(cursor);
      if (gapWeeks.has(ws)) break; // second miss in the same week → streak ends
      if (!set.has(addDays(cursor, -1))) break; // only forgive a miss the streak continues past
      gapWeeks.add(ws);
      forgiven.push(cursor);
    }
    cursor = addDays(cursor, -1);
  }

  // ── longest streak, walking forwards over the whole history ──
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let runGapWeeks = new Set<string>();
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  for (let d = first; d <= last; d = addDays(d, 1)) {
    if (set.has(d)) {
      run += 1;
    } else {
      const ws = weekStartOf(d);
      if (runGapWeeks.has(ws) || run === 0) {
        run = 0;
        runGapWeeks = new Set();
        continue;
      }
      runGapWeeks.add(ws);
    }
    longest = Math.max(longest, run);
  }

  const thisWeek = weekStartOf(today);
  return { current, longest, forgiven, restDayUsedThisWeek: gapWeeks.has(thisWeek) };
}

/** The last `n` days ending at `today`, oldest first. */
export function lastNDays(today: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - (n - 1)));
}
