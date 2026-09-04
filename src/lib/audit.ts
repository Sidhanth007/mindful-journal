import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Content-free audit trail. Records *that* an event happened and minimal
 * metadata (never journal text, passwords, or OTP codes).
 */
export async function logAudit(
  action: string,
  opts: { userId?: string | null; metadata?: Record<string, unknown>; ip?: string | null } = {},
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId: opts.userId ?? null,
        metadata: opts.metadata ? (opts.metadata as Prisma.InputJsonValue) : undefined,
        ip: opts.ip ?? null,
      },
    });
  } catch (err) {
    // Auditing must never break the user-facing flow.
    console.error("[audit] failed to write log", err);
  }
}
