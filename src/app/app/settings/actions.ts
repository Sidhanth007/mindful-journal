"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { changePasswordSchema, deleteAccountSchema, profileSchema, toFormErrors, type FormState } from "@/lib/validation";

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({ name: formData.get("name"), timezone: formData.get("timezone") });
  if (!parsed.success) return toFormErrors(parsed.error);

  await prisma.user.update({ where: { id: user.id }, data: { name: parsed.data.name, timezone: parsed.data.timezone } });
  await logAudit("user.update_profile", { userId: user.id });
  revalidatePath("/app", "layout");
  return { success: "Profile saved." };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({ currentPassword: formData.get("currentPassword"), newPassword: formData.get("newPassword") });
  if (!parsed.success) return toFormErrors(parsed.error);

  const ip = await getClientIp();
  const limit = rateLimit(`pwchange:${user.id}`, 5, 15 * 60 * 1000);
  if (!limit.ok) return { message: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await bcrypt.compare(parsed.data.currentPassword, row.passwordHash))) {
    return { errors: { currentPassword: ["That isn't your current password."] } };
  }
  if (await bcrypt.compare(parsed.data.newPassword, row.passwordHash)) {
    return { errors: { newPassword: ["Choose a password you haven't used here before."] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
  await logAudit("user.password_change", { userId: user.id, ip });

  // Every session (including this one) is now stale — sign out and ask to log in again.
  await signOut({ redirect: false });
  redirect("/login?reason=revoked");
}

export async function logOutEverywhere(): Promise<void> {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { sessionVersion: { increment: 1 } } });
  await logAudit("user.logout_everywhere", { userId: user.id, ip: await getClientIp() });
  await signOut({ redirect: false });
  redirect("/login?reason=revoked");
}

export async function deleteAiHistory(): Promise<void> {
  const user = await requireUser();
  const { count } = await prisma.aiInteraction.deleteMany({ where: { userId: user.id } });
  await logAudit("user.delete_ai_history", { userId: user.id, metadata: { count } });
  revalidatePath("/app/companion");
  redirect("/app/settings?ok=ai");
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (user.role === "ADMIN") return { message: "The admin account can't delete itself from here." };

  const parsed = deleteAccountSchema.safeParse({ confirmEmail: formData.get("confirmEmail"), password: formData.get("password") });
  if (!parsed.success) return toFormErrors(parsed.error);
  if (parsed.data.confirmEmail !== user.email.toLowerCase()) return { errors: { confirmEmail: ["Type your email exactly as shown."] } };

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await bcrypt.compare(parsed.data.password, row.passwordHash))) return { errors: { password: ["Incorrect password."] } };

  const ip = await getClientIp();
  await logAudit("user.delete_account", { userId: null, ip, metadata: { email: user.email } });
  await prisma.user.delete({ where: { id: user.id } }); // cascades everything the user owns
  await signOut({ redirect: false });
  redirect("/login?deleted=1");
}
