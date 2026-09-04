"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { addDays, dateToDay, dayToDate, todayInTimezone } from "@/lib/dates";
import { computeStreaks } from "@/lib/streaks";
import { runCheckInReflection, screenForRisk, type CheckInSuggestion } from "@/lib/ai";
import { DAILY_LIMIT } from "@/lib/companion";
import { FACTOR_KEYS, type FactorEffect, type GoalCheckStatus } from "@/lib/checkin";
import { checkInSchema, toFormErrors, type FormState } from "@/lib/validation";
import type { Prisma } from "@/generated/prisma/client";

export type FactorPick = { key: string; effect: FactorEffect };

export async function saveCheckIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  // factors arrive as "key:effect" strings; goal statuses as goal:<id>=<status>.
  const factors: FactorPick[] = formData
    .getAll("factor")
    .map(String)
    .map((v) => v.split(":"))
    .filter(([k, e]) => FACTOR_KEYS.includes(k) && (e === "helped" || e === "hurt"))
    .map(([key, effect]) => ({ key, effect: effect as FactorEffect }));

  const goalStatuses: Record<string, GoalCheckStatus> = {};
  for (const [name, value] of formData.entries()) {
    if (name.startsWith("goal:") && typeof value === "string" && value) goalStatuses[name.slice(5)] = value as GoalCheckStatus;
  }

  const parsed = checkInSchema.safeParse({
    checkDate: formData.get("checkDate"),
    moodScore: formData.get("moodScore"),
    energy: formData.get("energy") || undefined,
    factors,
    goalStatuses,
    habitsDone: formData.getAll("habitDone").map(String),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return toFormErrors(parsed.error);

  const { checkDate, moodScore, energy, note, habitsDone } = parsed.data;
  const today = todayInTimezone(user.timezone);
  if (checkDate > addDays(today, 1) || checkDate < addDays(today, -7)) {
    return { message: "Check-ins can only be recorded for the last week." };
  }

  // Only keep statuses for goals the user actually owns.
  const ownedGoals = await prisma.goal.findMany({ where: { userId: user.id, status: "ACTIVE" }, select: { id: true } });
  const ownedIds = new Set(ownedGoals.map((g) => g.id));
  const cleanStatuses = Object.fromEntries(Object.entries(parsed.data.goalStatuses).filter(([id]) => ownedIds.has(id)));

  const data = {
    moodScore,
    energy: energy ?? null,
    factors: parsed.data.factors as unknown as Prisma.InputJsonValue,
    goalStatuses: cleanStatuses as Prisma.InputJsonValue,
    note: note || null,
  };

  await prisma.checkIn.upsert({
    where: { userId_checkDate: { userId: user.id, checkDate: dayToDate(checkDate) } },
    create: { ...data, userId: user.id, checkDate: dayToDate(checkDate) },
    update: data,
  });

  // Keep the day's journal entry mood in step with the check-in (one mood per day).
  await prisma.journalEntry.updateMany({
    where: { userId: user.id, entryDate: dayToDate(checkDate), NOT: { moodScore } },
    data: { moodScore },
  });

  // Sync habit check-ins for that day to what was ticked.
  const habits = await prisma.habit.findMany({ where: { userId: user.id, isArchived: false }, select: { id: true } });
  const logDate = dayToDate(checkDate);
  const wanted = new Set(habitsDone.filter((id) => habits.some((h) => h.id === id)));
  await prisma.$transaction([
    prisma.habitLog.deleteMany({ where: { logDate, habitId: { in: habits.map((h) => h.id).filter((id) => !wanted.has(id)) } } }),
    ...[...wanted].map((habitId) =>
      prisma.habitLog.upsert({ where: { habitId_logDate: { habitId, logDate } }, create: { habitId, logDate, completed: true }, update: { completed: true } }),
    ),
  ]);

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  await logAudit("checkin.save", { userId: user.id });

  revalidatePath("/app");
  revalidatePath("/app/checkin");
  revalidatePath("/app/habits");
  revalidatePath("/app/trends");
  revalidatePath("/app/journal");
  redirect(`/app/checkin?date=${checkDate}&saved=1`);
}

// ───────────────────────── AI reflection on a check-in ─────────────────────────

export type ReflectState =
  | { status: "ok"; reflection: string; suggestions: CheckInSuggestion[]; risk: boolean }
  | { status: "error"; message: string; risk?: boolean }
  | undefined;

export async function reflectOnCheckIn(_prev: ReflectState, formData: FormData): Promise<ReflectState> {
  const user = await requireUser();
  const day = String(formData.get("checkDate") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { status: "error", message: "Save a check-in first." };

  const burst = rateLimit(`ai:${user.id}`, 5, 60 * 1000);
  if (!burst.ok) return { status: "error", message: `Give it a moment — try again in ${burst.retryAfterSeconds}s.` };
  const dayStart = dayToDate(todayInTimezone(user.timezone));
  const usedToday = await prisma.aiInteraction.count({ where: { userId: user.id, createdAt: { gte: dayStart } } });
  if (usedToday >= DAILY_LIMIT) return { status: "error", message: `You've reached today's limit of ${DAILY_LIMIT} companion responses.` };

  const checkIn = await prisma.checkIn.findUnique({ where: { userId_checkDate: { userId: user.id, checkDate: dayToDate(day) } } });
  if (!checkIn) return { status: "error", message: "Save a check-in first." };

  const [habits, goals, recent, entry] = await Promise.all([
    prisma.habit.findMany({ where: { userId: user.id, isArchived: false }, select: { id: true, name: true, logs: { where: { completed: true }, select: { logDate: true } } } }),
    prisma.goal.findMany({ where: { userId: user.id, status: "ACTIVE" }, select: { id: true, title: true, progress: true } }),
    prisma.checkIn.findMany({ where: { userId: user.id, checkDate: { gte: dayToDate(addDays(day, -6)), lt: dayToDate(day) } }, orderBy: { checkDate: "asc" }, select: { checkDate: true, moodScore: true, factors: true } }),
    prisma.journalEntry.findUnique({ where: { userId_entryDate: { userId: user.id, entryDate: dayToDate(day) } }, select: { entryDate: true, title: true, content: true, moodScore: true, emotions: true, gratitude: true } }),
  ]);

  const factors = checkIn.factors as unknown as FactorPick[];
  const statuses = checkIn.goalStatuses as Record<string, GoalCheckStatus>;

  const input = {
    day,
    moodScore: checkIn.moodScore,
    energy: checkIn.energy,
    factors,
    note: checkIn.note,
    habits: habits.map((h) => {
      const days = h.logs.map((l) => dateToDay(l.logDate));
      return { id: h.id, name: h.name, doneToday: days.includes(day), streak: computeStreaks(days, day).current };
    }),
    goals: goals.map((g) => ({ id: g.id, title: g.title, progress: g.progress, status: statuses[g.id] ?? null })),
    recentCheckIns: recent.map((r) => ({ day: dateToDay(r.checkDate), moodScore: r.moodScore, factors: r.factors as unknown as FactorPick[] })),
    todayEntry: entry,
  };

  const risk = screenForRisk(`${checkIn.note ?? ""}\n${entry?.content ?? ""}`);
  const result = await runCheckInReflection(input, user.name);
  if (!result.ok) {
    await logAudit("ai.failed", { userId: user.id, metadata: { kind: "CHECKIN", reason: result.reason } });
    return { status: "error", message: result.message, risk };
  }

  await prisma.aiInteraction.create({
    data: { userId: user.id, kind: "CHECKIN", entryIds: [], response: result.reflection, inputTokens: result.inputTokens, outputTokens: result.outputTokens },
  });
  await logAudit("ai.respond", { userId: user.id, metadata: { kind: "CHECKIN", model: result.model, suggestions: result.suggestions.length, risk } });

  return { status: "ok", reflection: result.reflection, suggestions: result.suggestions, risk };
}

export type AcceptState = { status: "ok" | "error"; message: string } | undefined;

/** One-tap acceptance of a companion suggestion. */
export async function acceptSuggestion(_prev: AcceptState, formData: FormData): Promise<AcceptState> {
  const user = await requireUser();
  const type = String(formData.get("type") ?? "");
  let result: AcceptState;

  if (type === "new_habit") {
    const name = String(formData.get("name") ?? "").trim().slice(0, 60);
    const icon = String(formData.get("icon") ?? "").trim().slice(0, 4);
    const why = String(formData.get("why") ?? "").trim().slice(0, 200);
    if (!name) return { status: "error", message: "That suggestion is missing a name." };

    const existing = await prisma.habit.findFirst({
      where: { userId: user.id, isArchived: false, name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      result = { status: "ok", message: "Already in your habits." };
    } else {
      const active = await prisma.habit.count({ where: { userId: user.id, isArchived: false } });
      if (active >= 20) return { status: "error", message: "You already track 20 habits — archive one first." };
      await prisma.habit.create({ data: { userId: user.id, name, icon: icon || null, description: why || null } });
      await logAudit("habit.create", { userId: user.id, metadata: { via: "suggestion" } });
      result = { status: "ok", message: "Added to your habits." };
    }
  } else if (type === "goal_status") {
    const goalId = String(formData.get("goalId") ?? "");
    const status = String(formData.get("status") ?? "");
    if (!goalId || !["ACTIVE", "PAUSED", "COMPLETED"].includes(status)) return { status: "error", message: "That suggestion isn't valid." };
    const { count } = await prisma.goal.updateMany({
      where: { id: goalId, userId: user.id },
      data: { status: status as "ACTIVE" | "PAUSED" | "COMPLETED", ...(status === "COMPLETED" ? { progress: 100 } : {}) },
    });
    if (!count) return { status: "error", message: "That goal no longer exists." };
    await logAudit("goal.update", { userId: user.id, metadata: { via: "suggestion" } });
    result = { status: "ok", message: status === "PAUSED" ? "Goal paused." : status === "COMPLETED" ? "Goal marked complete." : "Goal resumed." };
  } else {
    return { status: "error", message: "Unknown suggestion." };
  }

  revalidatePath("/app");
  revalidatePath("/app/habits");
  revalidatePath("/app/goals");
  revalidatePath("/app/checkin");
  return result;
}
