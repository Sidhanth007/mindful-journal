import "server-only";
import { prisma } from "@/lib/prisma";
import { addDays, dateToDay, dayToDate, formatDay, todayInTimezone } from "@/lib/dates";
import { weekStartOf } from "@/lib/streaks";
import { moodInfo } from "@/lib/journal";
import { factorLabel } from "@/lib/checkin";
import { runRecapLine } from "@/lib/ai";
import type { Prisma } from "@/generated/prisma/client";

export type RecapStats = {
  weekStart: string;
  weekEnd: string;
  avgMood: number | null;
  prevAvgMood: number | null;
  daysLogged: number;
  entries: number;
  checkIns: number;
  totalWords: number;
  bestDay: { day: string; mood: number } | null;
  hardestDay: { day: string; mood: number } | null;
  habitsDone: number;
  habitsPossible: number;
  topHelped: { key: string; count: number } | null;
  topHurt: { key: string; count: number } | null;
  goalsCompleted: number;
};

export type WeeklyRecapView = { stats: RecapStats; aiLine: string | null; label: string };

async function computeStats(userId: string, weekStart: string): Promise<RecapStats> {
  const weekEnd = addDays(weekStart, 6);
  const prevStart = addDays(weekStart, -7);
  const from = dayToDate(prevStart);
  const to = dayToDate(weekEnd);

  const [entries, checkIns, habits, goalsCompleted] = await Promise.all([
    prisma.journalEntry.findMany({ where: { userId, entryDate: { gte: from, lte: to } }, select: { entryDate: true, moodScore: true, wordCount: true } }),
    prisma.checkIn.findMany({ where: { userId, checkDate: { gte: from, lte: to } }, select: { checkDate: true, moodScore: true, factors: true } }),
    prisma.habit.findMany({
      where: { userId, isArchived: false, createdAt: { lte: dayToDate(addDays(weekEnd, 1)) } },
      select: { createdAt: true, logs: { where: { completed: true, logDate: { gte: dayToDate(weekStart), lte: to } }, select: { logDate: true } } },
    }),
    prisma.goal.count({ where: { userId, status: "COMPLETED", updatedAt: { gte: dayToDate(weekStart), lt: dayToDate(addDays(weekEnd, 1)) } } }),
  ]);

  // Mood per day: entry first, else check-in.
  const moodByDay = new Map<string, number>();
  for (const c of checkIns) moodByDay.set(dateToDay(c.checkDate), c.moodScore);
  for (const e of entries) moodByDay.set(dateToDay(e.entryDate), e.moodScore);

  const inWeek = (d: string) => d >= weekStart && d <= weekEnd;
  const weekMoods = [...moodByDay.entries()].filter(([d]) => inWeek(d));
  const prevMoods = [...moodByDay.entries()].filter(([d]) => d >= prevStart && d < weekStart);
  const avg = (rows: [string, number][]) => (rows.length ? Math.round((rows.reduce((s, [, m]) => s + m, 0) / rows.length) * 10) / 10 : null);

  const best = weekMoods.length ? weekMoods.reduce((a, b) => (b[1] > a[1] ? b : a)) : null;
  const hardest = weekMoods.length ? weekMoods.reduce((a, b) => (b[1] < a[1] ? b : a)) : null;

  const weekEntries = entries.filter((e) => inWeek(dateToDay(e.entryDate)));
  const weekCheckIns = checkIns.filter((c) => inWeek(dateToDay(c.checkDate)));

  const helped = new Map<string, number>();
  const hurt = new Map<string, number>();
  for (const c of weekCheckIns) {
    for (const f of (c.factors as unknown as { key: string; effect: "helped" | "hurt" }[]) ?? []) {
      const m = f.effect === "helped" ? helped : hurt;
      m.set(f.key, (m.get(f.key) ?? 0) + 1);
    }
  }
  const top = (m: Map<string, number>) => {
    const [key, count] = [...m.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
    return key ? { key, count: count as number } : null;
  };

  let habitsPossible = 0;
  let habitsDone = 0;
  for (const h of habits) {
    const created = dateToDay(h.createdAt);
    const firstDay = created > weekStart ? created : weekStart;
    const possible = firstDay <= weekEnd ? Math.round((dayToDate(weekEnd).getTime() - dayToDate(firstDay).getTime()) / 86_400_000) + 1 : 0;
    habitsPossible += possible;
    habitsDone += h.logs.length;
  }

  return {
    weekStart,
    weekEnd,
    avgMood: avg(weekMoods),
    prevAvgMood: avg(prevMoods),
    daysLogged: weekMoods.length,
    entries: weekEntries.length,
    checkIns: weekCheckIns.length,
    totalWords: weekEntries.reduce((s, e) => s + e.wordCount, 0),
    bestDay: best ? { day: best[0], mood: best[1] } : null,
    hardestDay: hardest ? { day: hardest[0], mood: hardest[1] } : null,
    habitsDone,
    habitsPossible,
    topHelped: top(helped),
    topHurt: top(hurt),
    goalsCompleted,
  };
}

function summarise(s: RecapStats): string {
  return [
    `Week: ${s.weekStart} to ${s.weekEnd}`,
    `Days with a mood logged: ${s.daysLogged}/7`,
    `Average mood: ${s.avgMood ?? "n/a"}/5 (previous week ${s.prevAvgMood ?? "n/a"}/5)`,
    s.bestDay ? `Best day: ${formatDay(s.bestDay.day, { weekday: "long" })} (${moodInfo(s.bestDay.mood).label})` : null,
    s.hardestDay ? `Hardest day: ${formatDay(s.hardestDay.day, { weekday: "long" })} (${moodInfo(s.hardestDay.mood).label})` : null,
    `Journal entries: ${s.entries} (${s.totalWords} words); check-ins: ${s.checkIns}`,
    s.habitsPossible ? `Habits kept: ${s.habitsDone} of ${s.habitsPossible} possible check-offs` : "No habits tracked",
    s.topHelped ? `Most-marked helper: ${factorLabel(s.topHelped.key)} (${s.topHelped.count} days)` : null,
    s.topHurt ? `Most-marked difficulty: ${factorLabel(s.topHurt.key)} (${s.topHurt.count} days)` : null,
    s.goalsCompleted ? `Goals completed: ${s.goalsCompleted}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Recap for the most recent *completed* week (Mon–Sun before today's week).
 * Built once and cached in WeeklyRecap; returns null when that week has no data.
 */
export async function getLastWeekRecap(userId: string, timezone: string, userName: string | null): Promise<WeeklyRecapView | null> {
  const today = todayInTimezone(timezone);
  const weekStart = addDays(weekStartOf(today), -7);
  const label = `${formatDay(weekStart, { month: "short", day: "numeric" })} – ${formatDay(addDays(weekStart, 6), { month: "short", day: "numeric" })}`;

  const cached = await prisma.weeklyRecap.findUnique({ where: { userId_weekStart: { userId, weekStart: dayToDate(weekStart) } } });
  if (cached) return { stats: cached.stats as unknown as RecapStats, aiLine: cached.aiLine, label };

  const stats = await computeStats(userId, weekStart);
  if (stats.daysLogged === 0 && stats.entries === 0 && stats.habitsDone === 0) return null;

  const aiLine = process.env.GEMINI_API_KEY ? await runRecapLine(summarise(stats), userName) : null;

  await prisma.weeklyRecap.upsert({
    where: { userId_weekStart: { userId, weekStart: dayToDate(weekStart) } },
    create: { userId, weekStart: dayToDate(weekStart), stats: stats as unknown as Prisma.InputJsonValue, aiLine },
    update: { stats: stats as unknown as Prisma.InputJsonValue, aiLine },
  });

  return { stats, aiLine, label };
}
