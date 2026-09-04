"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { DAY_RE, dayToDate, todayInTimezone, addDays } from "@/lib/dates";
import { habitSchema, toFormErrors, type FormState } from "@/lib/validation";

const MAX_ACTIVE_HABITS = 20;

export async function saveHabit(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = habitSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    icon: formData.get("icon") ?? "",
  });
  if (!parsed.success) return toFormErrors(parsed.error);
  const { id, name, description, icon } = parsed.data;
  const data = { name, description: description || null, icon: icon || null };

  if (id) {
    const { count } = await prisma.habit.updateMany({ where: { id, userId: user.id }, data });
    if (!count) return { message: "That habit no longer exists." };
    await logAudit("habit.update", { userId: user.id });
  } else {
    const active = await prisma.habit.count({ where: { userId: user.id, isArchived: false } });
    if (active >= MAX_ACTIVE_HABITS) return { message: `You can track up to ${MAX_ACTIVE_HABITS} habits at once. Archive one first.` };
    await prisma.habit.create({ data: { ...data, userId: user.id } });
    await logAudit("habit.create", { userId: user.id });
  }

  revalidatePath("/app/habits");
  revalidatePath("/app");
  return { success: id ? "Habit updated." : "Habit added." };
}

/** Flip a day's check-in for a habit. */
export async function toggleHabitLog(formData: FormData): Promise<void> {
  const user = await requireUser();
  const habitId = String(formData.get("habitId") ?? "");
  const day = String(formData.get("day") ?? "");
  if (!habitId || !DAY_RE.test(day)) return;

  const today = todayInTimezone(user.timezone);
  if (day > addDays(today, 1)) return; // no future check-ins

  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId: user.id }, select: { id: true } });
  if (!habit) return;

  const logDate = dayToDate(day);
  const existing = await prisma.habitLog.findUnique({ where: { habitId_logDate: { habitId, logDate } }, select: { id: true } });
  if (existing) {
    await prisma.habitLog.delete({ where: { id: existing.id } });
  } else {
    await prisma.habitLog.create({ data: { habitId, logDate, completed: true } });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  revalidatePath("/app/habits");
  revalidatePath("/app");
}

export async function setHabitArchived(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  const archived = formData.get("archived") === "1";
  if (!id) return;
  await prisma.habit.updateMany({ where: { id, userId: user.id }, data: { isArchived: archived } });
  await logAudit(archived ? "habit.archive" : "habit.unarchive", { userId: user.id });
  revalidatePath("/app/habits");
  revalidatePath("/app");
}

export async function deleteHabit(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { count } = await prisma.habit.deleteMany({ where: { id, userId: user.id } });
  if (count) await logAudit("habit.delete", { userId: user.id });
  revalidatePath("/app/habits");
  revalidatePath("/app");
  redirect("/app/habits");
}
