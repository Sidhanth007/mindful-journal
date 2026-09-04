"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { dayToDate } from "@/lib/dates";
import { goalSchema, toFormErrors, type FormState } from "@/lib/validation";

const MAX_GOALS = 30;

export async function saveGoal(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = goalSchema.safeParse({
    id: formData.get("id") || undefined,
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    targetDate: formData.get("targetDate") ?? "",
    progress: formData.get("progress") ?? 0,
    status: formData.get("status") ?? "ACTIVE",
  });
  if (!parsed.success) return toFormErrors(parsed.error);
  const { id, title, description, targetDate, progress, status } = parsed.data;

  // Reaching 100% marks the goal complete; anything else un-completes it.
  const resolvedStatus: "ACTIVE" | "COMPLETED" | "PAUSED" =
    progress >= 100 ? "COMPLETED" : status === "COMPLETED" ? "ACTIVE" : status;
  const data = {
    title,
    description: description || null,
    targetDate: targetDate ? dayToDate(targetDate) : null,
    progress,
    status: resolvedStatus,
  };

  if (id) {
    const { count } = await prisma.goal.updateMany({ where: { id, userId: user.id }, data });
    if (!count) return { message: "That goal no longer exists." };
    await logAudit("goal.update", { userId: user.id });
  } else {
    const total = await prisma.goal.count({ where: { userId: user.id } });
    if (total >= MAX_GOALS) return { message: `You can keep up to ${MAX_GOALS} goals. Delete one first.` };
    await prisma.goal.create({ data: { ...data, userId: user.id } });
    await logAudit("goal.create", { userId: user.id });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  revalidatePath("/app/goals");
  revalidatePath("/app");
  return { success: id ? "Goal updated." : "Goal added." };
}

export async function deleteGoal(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const { count } = await prisma.goal.deleteMany({ where: { id, userId: user.id } });
  if (count) await logAudit("goal.delete", { userId: user.id });
  revalidatePath("/app/goals");
  revalidatePath("/app");
}
