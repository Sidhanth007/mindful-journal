import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

export type OtpPurpose = "VERIFY_EMAIL" | "RESET_PASSWORD";

function hashCode(code: string, userId: string) {
  // Salted with the user id + server secret so a leaked table row is useless.
  return createHash("sha256")
    .update(`${userId}:${code}:${process.env.AUTH_SECRET ?? ""}`)
    .digest("hex");
}

/**
 * Creates a fresh OTP for the user (invalidating any older unused ones for the
 * same purpose) and returns the plaintext code to be emailed.
 * Returns `null` if a code was issued too recently (resend cooldown).
 */
export async function issueOtp(userId: string, purpose: OtpPurpose): Promise<string | null> {
  const recent = await prisma.otpCode.findFirst({
    where: { userId, purpose, usedAt: null, createdAt: { gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000) } },
    select: { id: true },
  });
  if (recent) return null;

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");

  await prisma.$transaction([
    prisma.otpCode.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() }, // retire older codes
    }),
    prisma.otpCode.create({
      data: {
        userId,
        purpose,
        codeHash: hashCode(code, userId),
        expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);

  return code;
}

export type VerifyOtpResult = "ok" | "invalid" | "expired" | "locked";

/**
 * Verifies a code. Consumes it on success; increments the attempt counter on
 * failure and locks the code after OTP_MAX_ATTEMPTS.
 */
export async function verifyOtp(userId: string, purpose: OtpPurpose, code: string): Promise<VerifyOtpResult> {
  const record = await prisma.otpCode.findFirst({
    where: { userId, purpose, usedAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return "invalid";
  if (record.expiresAt < new Date()) return "expired";
  if (record.attempts >= OTP_MAX_ATTEMPTS) return "locked";

  const expected = Buffer.from(record.codeHash, "hex");
  const actual = Buffer.from(hashCode(code, userId), "hex");
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);

  if (!matches) {
    await prisma.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return record.attempts + 1 >= OTP_MAX_ATTEMPTS ? "locked" : "invalid";
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return "ok";
}
