import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Data-access-layer guard. Verifies the session cookie AND re-checks the
 * account in the database (so a suspended/deleted user, or a session revoked
 * by a password change, is cut off immediately — not when the JWT expires).
 * Memoised per request.
 */
export const requireUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, status: true, timezone: true, sessionVersion: true },
  });

  if (!user || user.status === "SUSPENDED") redirect("/login?reason=inactive");
  if ((session.user.sv ?? 0) !== user.sessionVersion) redirect("/login?reason=revoked");
  return user;
});

export const requireAdmin = cache(async () => {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/app");
  return user;
});
