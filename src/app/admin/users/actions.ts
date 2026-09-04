"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";

function back(msg: string, kind: "ok" | "error" = "ok"): never {
  redirect(`/admin/users?${kind}=${encodeURIComponent(msg)}`);
}

export async function setUserStatus(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
  if (!id) back("Missing user.", "error");
  if (id === admin.id) back("You can't change your own status.", "error");

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
  if (!target) back("User not found.", "error");
  if (target.role === "ADMIN") back("Admin accounts can't be suspended.", "error");

  await prisma.user.update({ where: { id }, data: { status } });
  await logAudit(status === "SUSPENDED" ? "admin.suspend_user" : "admin.reactivate_user", {
    userId: admin.id,
    ip: await getClientIp(),
    metadata: { targetUserId: id, targetEmail: target.email },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  back(status === "SUSPENDED" ? `Suspended ${target.email}.` : `Reactivated ${target.email}.`);
}

export async function deleteUser(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const confirm = String(formData.get("confirm") ?? "")
    .trim()
    .toLowerCase();
  if (!id) back("Missing user.", "error");
  if (id === admin.id) back("You can't delete your own account from here.", "error");

  const target = await prisma.user.findUnique({ where: { id }, select: { email: true, role: true } });
  if (!target) back("User not found.", "error");
  if (target.role === "ADMIN") back("Admin accounts can't be deleted here.", "error");
  if (confirm !== target.email.toLowerCase()) back("Type the user's email exactly to confirm deletion.", "error");

  await prisma.user.delete({ where: { id } }); // cascades entries, check-ins, habits, goals, AI responses
  await logAudit("admin.delete_user", { userId: admin.id, ip: await getClientIp(), metadata: { targetUserId: id, targetEmail: target.email } });
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  back(`Deleted ${target.email} and all their data.`);
}
