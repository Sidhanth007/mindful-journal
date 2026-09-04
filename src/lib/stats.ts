import "server-only";
import { prisma } from "@/lib/prisma";
import { addDays, dateToDay, dayToDate, formatDay, todayInTimezone } from "@/lib/dates";
import { computeStreaks, lastNDays, type Streaks } from "@/lib/streaks";

export type RangeDays = 7 | 30 | 90;

export type MoodPoint = { day: string; label: string; mood: number | null; title: string | null };
export type WeekPoint = { weekStart: string; label: string; entries: number; words: number };
export type MoodBucket = { score: number; count: number };
export type EmotionCount = { emotion: string; count: number };

export type FactorStat = { key: string; helped: number; hurt: number; net: number };

export type Trends = {
  range: RangeDays;
  from: string;
  to: string;
  moodSeries: MoodPoint[];
  weekly: WeekPoint[];
  distribution: MoodBucket[];
  emotions: EmotionCount[];
  factors: FactorStat[];
  checkInCount: number;
  summary: {
    entries: number;
    daysInRange: number;
    avgMood: number | null;
    avgWords: number;
    bestDay: MoodPoint | null;
    hardestDay: MoodPoint | null;
  };
};

export async function getTrends(userId: string, timezone: string, range: RangeDays): Promise<Trends> {
  const to = todayInTimezone(timezone);
  const from = addDays(to, -(range - 1));

  const [entries, checkIns] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId, entryDate: { gte: dayToDate(from), lte: dayToDate(to) } },
      orderBy: { entryDate: "asc" },
      select: { entryDate: true, moodScore: true, emotions: true, wordCount: true, title: true },
    }),
    prisma.checkIn.findMany({
      where: { userId, checkDate: { gte: dayToDate(from), lte: dayToDate(to) } },
      select: { checkDate: true, moodScore: true, factors: true },
    }),
  ]);

  const byDay = new Map(entries.map((e) => [dateToDay(e.entryDate), e]));
  const checkInByDay = new Map(checkIns.map((c) => [dateToDay(c.checkDate), c]));
  const days = lastNDays(to, range);

  // Mood per day: journal entry first, otherwise the check-in meter.
  const moodSeries: MoodPoint[] = days.map((day) => {
    const e = byDay.get(day);
    const c = checkInByDay.get(day);
    return {
      day,
      label: formatDay(day, { month: "short", day: "numeric" }),
      mood: e?.moodScore ?? c?.moodScore ?? null,
      title: e?.title ?? (c && !e ? "Check-in" : null),
    };
  });

  const factorMap = new Map<string, FactorStat>();
  for (const c of checkIns) {
    const list = (c.factors as unknown as { key: string; effect: "helped" | "hurt" }[]) ?? [];
    for (const f of list) {
      const s = factorMap.get(f.key) ?? { key: f.key, helped: 0, hurt: 0, net: 0 };
      if (f.effect === "helped") s.helped += 1;
      else s.hurt += 1;
      s.net = s.helped - s.hurt;
      factorMap.set(f.key, s);
    }
  }
  const factors = [...factorMap.values()].sort((a, b) => b.helped + b.hurt - (a.helped + a.hurt) || a.key.localeCompare(b.key));

  // Weekly buckets (weeks start on Monday), oldest first.
  const weekStartOf = (day: string) => {
    const d = dayToDate(day);
    const dow = (d.getUTCDay() + 6) % 7; // Mon=0
    return addDays(day, -dow);
  };
  const weekMap = new Map<string, WeekPoint>();
  for (let ws = weekStartOf(from); ws <= to; ws = addDays(ws, 7)) {
    weekMap.set(ws, { weekStart: ws, label: formatDay(ws, { month: "short", day: "numeric" }), entries: 0, words: 0 });
  }
  for (const e of entries) {
    const w = weekMap.get(weekStartOf(dateToDay(e.entryDate)));
    if (w) {
      w.entries += 1;
      w.words += e.wordCount;
    }
  }

  const distribution: MoodBucket[] = [1, 2, 3, 4, 5].map((score) => ({ score, count: moodSeries.filter((p) => p.mood === score).length }));

  const emotionMap = new Map<string, number>();
  for (const e of entries) for (const tag of e.emotions) emotionMap.set(tag, (emotionMap.get(tag) ?? 0) + 1);
  const emotions = [...emotionMap.entries()]
    .map(([emotion, count]) => ({ emotion, count }))
    .sort((a, b) => b.count - a.count || a.emotion.localeCompare(b.emotion))
    .slice(0, 8);

  const logged = moodSeries.filter((p) => p.mood !== null);
  const avgMood = logged.length ? Math.round((logged.reduce((s, p) => s + (p.mood ?? 0), 0) / logged.length) * 10) / 10 : null;
  const avgWords = entries.length ? Math.round(entries.reduce((s, e) => s + e.wordCount, 0) / entries.length) : 0;
  const bestDay = logged.length ? logged.reduce((a, b) => ((b.mood ?? 0) > (a.mood ?? 0) ? b : a)) : null;
  const hardestDay = logged.length ? logged.reduce((a, b) => ((b.mood ?? 0) < (a.mood ?? 0) ? b : a)) : null;

  return {
    range,
    from,
    to,
    moodSeries,
    weekly: [...weekMap.values()],
    distribution,
    emotions,
    factors,
    checkInCount: checkIns.length,
    summary: { entries: entries.length, daysInRange: range, avgMood, avgWords, bestDay, hardestDay },
  };
}

export type DashboardStats = {
  today: string;
  journalStreak: Streaks;
  entriesThisMonth: number;
  daysThisMonth: number;
  avgMood30: number | null;
  moodDelta: number | null; // vs previous 30 days
  habits: { total: number; doneToday: number };
  goals: { active: number; completed: number; avgProgress: number | null };
  sparkline: (number | null)[]; // last 14 days of mood
};

export async function getDashboardStats(userId: string, timezone: string): Promise<DashboardStats> {
  const today = todayInTimezone(timezone);
  const monthStart = `${today.slice(0, 7)}-01`;
  const from60 = addDays(today, -59);
  const from30 = addDays(today, -29);

  const [allDays, recent, habits, goals] = await Promise.all([
    prisma.journalEntry.findMany({ where: { userId }, select: { entryDate: true } }),
    prisma.journalEntry.findMany({
      where: { userId, entryDate: { gte: dayToDate(from60) } },
      select: { entryDate: true, moodScore: true },
    }),
    prisma.habit.findMany({
      where: { userId, isArchived: false },
      select: { id: true, logs: { where: { logDate: dayToDate(today), completed: true }, select: { id: true } } },
    }),
    prisma.goal.findMany({ where: { userId }, select: { status: true, progress: true } }),
  ]);

  const days = allDays.map((e) => dateToDay(e.entryDate));
  const journalStreak = computeStreaks(days, today);
  const entriesThisMonth = days.filter((d) => d >= monthStart && d <= today).length;
  const daysThisMonth = Number(today.slice(8, 10));

  const last30 = recent.filter((e) => dateToDay(e.entryDate) >= from30);
  const prev30 = recent.filter((e) => dateToDay(e.entryDate) < from30);
  const avg = (rows: { moodScore: number }[]) => (rows.length ? rows.reduce((s, r) => s + r.moodScore, 0) / rows.length : null);
  const avgMood30 = avg(last30);
  const avgPrev = avg(prev30);

  const moodByDay = new Map(recent.map((e) => [dateToDay(e.entryDate), e.moodScore]));
  const sparkline = lastNDays(today, 14).map((d) => moodByDay.get(d) ?? null);

  const activeGoals = goals.filter((g) => g.status === "ACTIVE");

  return {
    today,
    journalStreak,
    entriesThisMonth,
    daysThisMonth,
    avgMood30: avgMood30 === null ? null : Math.round(avgMood30 * 10) / 10,
    moodDelta: avgMood30 !== null && avgPrev !== null ? Math.round((avgMood30 - avgPrev) * 10) / 10 : null,
    habits: { total: habits.length, doneToday: habits.filter((h) => h.logs.length > 0).length },
    goals: {
      active: activeGoals.length,
      completed: goals.filter((g) => g.status === "COMPLETED").length,
      avgProgress: activeGoals.length ? Math.round(activeGoals.reduce((s, g) => s + g.progress, 0) / activeGoals.length) : null,
    },
    sparkline,
  };
}
