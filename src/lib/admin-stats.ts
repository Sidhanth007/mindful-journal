import "server-only";
import { prisma } from "@/lib/prisma";
import { addDays, dateToDay, dayToDate, formatDay, todayInTimezone } from "@/lib/dates";
import { lastNDays } from "@/lib/streaks";

export type AdminOverview = {
  today: string;
  users: { total: number; verified: number; suspended: number; admins: number; active7: number; active30: number; newThisWeek: number };
  content: { entries: number; checkIns: number; habits: number; habitLogs: number; goals: number; goalsCompleted: number; avgWords: number };
  ai: { responses: number; responses7: number; inputTokens: number; outputTokens: number; failed7: number };
  signupsByWeek: { label: string; count: number }[];
  activityByDay: { day: string; label: string; entries: number; checkIns: number }[];
  moodMix: { score: number; count: number }[];
};

export async function getAdminOverview(): Promise<AdminOverview> {
  const today = todayInTimezone("UTC");
  const since7 = new Date(Date.now() - 7 * 86_400_000);
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const since8w = new Date(Date.now() - 8 * 7 * 86_400_000);
  const days14 = lastNDays(today, 14);

  const [
    total,
    verified,
    suspended,
    admins,
    active7,
    active30,
    newThisWeek,
    entries,
    checkIns,
    habits,
    habitLogs,
    goals,
    goalsCompleted,
    wordAgg,
    aiAgg,
    ai7,
    failed7,
    recentUsers,
    recentEntries,
    recentCheckIns,
    moodGroups,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { emailVerified: { not: null } } }),
    prisma.user.count({ where: { status: "SUSPENDED" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.user.count({ where: { lastActiveAt: { gte: since7 } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: since30 } } }),
    prisma.user.count({ where: { createdAt: { gte: since7 } } }),
    prisma.journalEntry.count(),
    prisma.checkIn.count(),
    prisma.habit.count({ where: { isArchived: false } }),
    prisma.habitLog.count({ where: { completed: true } }),
    prisma.goal.count(),
    prisma.goal.count({ where: { status: "COMPLETED" } }),
    prisma.journalEntry.aggregate({ _avg: { wordCount: true } }),
    prisma.aiInteraction.aggregate({ _count: { _all: true }, _sum: { inputTokens: true, outputTokens: true } }),
    prisma.aiInteraction.count({ where: { createdAt: { gte: since7 } } }),
    prisma.auditLog.count({ where: { action: "ai.failed", createdAt: { gte: since7 } } }),
    prisma.user.findMany({ where: { createdAt: { gte: since8w } }, select: { createdAt: true } }),
    prisma.journalEntry.findMany({ where: { entryDate: { gte: dayToDate(days14[0]) } }, select: { entryDate: true } }),
    prisma.checkIn.findMany({ where: { checkDate: { gte: dayToDate(days14[0]) } }, select: { checkDate: true } }),
    prisma.journalEntry.groupBy({ by: ["moodScore"], _count: { _all: true } }),
  ]);

  // Sign-ups per week (Mon-start), last 8 weeks.
  const weekStartOf = (day: string) => {
    const d = dayToDate(day);
    return addDays(day, -((d.getUTCDay() + 6) % 7));
  };
  const weeks: { label: string; count: number }[] = [];
  const weekMap = new Map<string, number>();
  for (let i = 7; i >= 0; i--) {
    const ws = weekStartOf(addDays(today, -7 * i));
    weekMap.set(ws, 0);
  }
  for (const u of recentUsers) {
    const ws = weekStartOf(dateToDay(u.createdAt));
    if (weekMap.has(ws)) weekMap.set(ws, (weekMap.get(ws) ?? 0) + 1);
  }
  for (const [ws, count] of weekMap) weeks.push({ label: formatDay(ws, { month: "short", day: "numeric" }), count });

  const entriesByDay = new Map<string, number>();
  for (const e of recentEntries) {
    const d = dateToDay(e.entryDate);
    entriesByDay.set(d, (entriesByDay.get(d) ?? 0) + 1);
  }
  const checkInsByDay = new Map<string, number>();
  for (const c of recentCheckIns) {
    const d = dateToDay(c.checkDate);
    checkInsByDay.set(d, (checkInsByDay.get(d) ?? 0) + 1);
  }

  return {
    today,
    users: { total, verified, suspended, admins, active7, active30, newThisWeek },
    content: {
      entries,
      checkIns,
      habits,
      habitLogs,
      goals,
      goalsCompleted,
      avgWords: Math.round(wordAgg._avg.wordCount ?? 0),
    },
    ai: {
      responses: aiAgg._count._all,
      responses7: ai7,
      inputTokens: aiAgg._sum.inputTokens ?? 0,
      outputTokens: aiAgg._sum.outputTokens ?? 0,
      failed7,
    },
    signupsByWeek: weeks,
    activityByDay: days14.map((day) => ({
      day,
      label: formatDay(day, { month: "short", day: "numeric" }),
      entries: entriesByDay.get(day) ?? 0,
      checkIns: checkInsByDay.get(day) ?? 0,
    })),
    moodMix: [1, 2, 3, 4, 5].map((score) => ({ score, count: moodGroups.find((g) => g.moodScore === score)?._count._all ?? 0 })),
  };
}
