"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { sendPasswordResetCode, sendVerificationCode } from "@/lib/email";
import { issueOtp, OTP_TTL_MINUTES, verifyOtp } from "@/lib/otp";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendCodeSchema,
  resetPasswordSchema,
  timezoneSchema,
  toFormErrors,
  verifyEmailSchema,
  type FormState,
} from "@/lib/validation";

const PENDING_EMAIL_COOKIE = "mj_pending_email";
const GENERIC_ERROR = "Something went wrong. Please try again.";

async function setPendingEmail(email: string) {
  const store = await cookies();
  store.set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
}

export async function getPendingEmail(): Promise<string | null> {
  const store = await cookies();
  return store.get(PENDING_EMAIL_COOKIE)?.value ?? null;
}

async function clearPendingEmail() {
  const store = await cookies();
  store.delete(PENDING_EMAIL_COOKIE);
}

function safeNextPath(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/app";
}

// ───────────────────────── Register ─────────────────────────

export async function register(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    timezone: formData.get("timezone") ?? "",
  });
  if (!parsed.success) return toFormErrors(parsed.error);

  const ip = await getClientIp();
  const limit = rateLimit(`register:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.ok) return { message: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };

  const { name, email, password } = parsed.data;
  const timezone = timezoneSchema.safeParse(parsed.data.timezone).success && parsed.data.timezone ? parsed.data.timezone : "UTC";

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
  if (existing) {
    // Don't reveal whether the email is registered; behave the same as a new
    // sign-up but route them to verification/login sensibly.
    if (!existing.emailVerified) {
      const code = await issueOtp(existing.id, "VERIFY_EMAIL");
      if (code) await sendVerificationCode({ email, name }, code, OTP_TTL_MINUTES);
      await setPendingEmail(email);
      redirect("/verify-email");
    }
    return { errors: { email: ["An account with this email already exists. Try logging in."] } };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const isAdmin = process.env.ADMIN_EMAIL?.toLowerCase() === email;

  const user = await prisma.user.create({
    data: { name, email, passwordHash, timezone, role: isAdmin ? "ADMIN" : "USER" },
    select: { id: true },
  });

  await logAudit("user.register", { userId: user.id, ip });

  const code = await issueOtp(user.id, "VERIFY_EMAIL");
  try {
    if (code) await sendVerificationCode({ email, name }, code, OTP_TTL_MINUTES);
  } catch (err) {
    console.error("[register] email send failed", err);
    return { message: "Account created, but we couldn't send the verification email. Use 'Resend code' on the next page." };
  }

  await setPendingEmail(email);
  redirect("/verify-email");
}

// ───────────────────────── Verify email ─────────────────────────

export async function verifyEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = verifyEmailSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
  });
  if (!parsed.success) return toFormErrors(parsed.error);

  const { email, code } = parsed.data;
  const ip = await getClientIp();
  const limit = rateLimit(`verify:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return { message: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
  if (!user) return { errors: { code: ["That code is not valid."] } };
  if (user.emailVerified) {
    await clearPendingEmail();
    redirect("/login?verified=1");
  }

  const result = await verifyOtp(user.id, "VERIFY_EMAIL", code);
  if (result !== "ok") {
    const msg =
      result === "expired"
        ? "That code has expired. Request a new one."
        : result === "locked"
          ? "Too many wrong attempts. Request a new code."
          : "That code is not valid.";
    return { errors: { code: [msg] } };
  }

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  await logAudit("user.verify_email", { userId: user.id, ip });
  await clearPendingEmail();
  redirect("/login?verified=1");
}

export async function resendVerificationCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resendCodeSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return toFormErrors(parsed.error);
  const { email } = parsed.data;

  const ip = await getClientIp();
  const limit = rateLimit(`resend:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.ok) return { message: `Too many requests. Try again in ${limit.retryAfterSeconds}s.` };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, emailVerified: true } });
  // Always respond the same way to avoid leaking account existence.
  const generic = { success: "If that email is registered and unverified, a new code is on its way." };
  if (!user || user.emailVerified) return generic;

  const code = await issueOtp(user.id, "VERIFY_EMAIL");
  if (!code) return { message: "Please wait a minute before requesting another code." };
  try {
    await sendVerificationCode({ email, name: user.name }, code, OTP_TTL_MINUTES);
  } catch {
    return { message: GENERIC_ERROR };
  }
  await setPendingEmail(email);
  return generic;
}

// ───────────────────────── Login / logout ─────────────────────────

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return toFormErrors(parsed.error);

  const ip = await getClientIp();
  const limit = rateLimit(`login:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return { message: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };

  const { email, password } = parsed.data;
  const next = safeNextPath(formData.get("next"));

  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (err) {
    if (err instanceof AuthError) {
      const code = (err as { code?: string }).code;
      if (code === "unverified") {
        const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
        if (user) {
          const otp = await issueOtp(user.id, "VERIFY_EMAIL");
          if (otp) {
            try {
              await sendVerificationCode({ email, name: user.name }, otp, OTP_TTL_MINUTES);
            } catch {
              /* user can resend from the verify page */
            }
          }
        }
        await setPendingEmail(email);
        redirect("/verify-email?reason=unverified");
      }
      if (code === "suspended") {
        await logAudit("user.login_blocked_suspended", { ip, metadata: { email } });
        return { message: "This account has been suspended. Contact support if you think this is a mistake." };
      }
      await logAudit("user.login_failed", { ip });
      return { message: "Incorrect email or password." };
    }
    throw err;
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  await logAudit("user.login", { userId: user?.id, ip });
  redirect(next);
}

export async function logout() {
  await signOut({ redirect: false });
  redirect("/login");
}

// ───────────────────────── Password reset ─────────────────────────

export async function forgotPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return toFormErrors(parsed.error);
  const { email } = parsed.data;

  const ip = await getClientIp();
  const limit = rateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000);
  if (!limit.ok) return { message: `Too many requests. Try again in ${limit.retryAfterSeconds}s.` };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, emailVerified: true } });
  if (user && user.emailVerified) {
    const code = await issueOtp(user.id, "RESET_PASSWORD");
    if (code) {
      try {
        await sendPasswordResetCode({ email, name: user.name }, code, OTP_TTL_MINUTES);
      } catch {
        return { message: GENERIC_ERROR };
      }
    }
    await logAudit("user.password_reset_requested", { userId: user.id, ip });
  }

  // Same response whether or not the account exists.
  await setPendingEmail(email);
  redirect("/reset-password");
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    email: formData.get("email"),
    code: formData.get("code"),
    password: formData.get("password"),
  });
  if (!parsed.success) return toFormErrors(parsed.error);
  const { email, code, password } = parsed.data;

  const ip = await getClientIp();
  const limit = rateLimit(`reset:${ip}`, 10, 15 * 60 * 1000);
  if (!limit.ok) return { message: `Too many attempts. Try again in ${limit.retryAfterSeconds}s.` };

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return { errors: { code: ["That code is not valid."] } };

  const result = await verifyOtp(user.id, "RESET_PASSWORD", code);
  if (result !== "ok") {
    const msg =
      result === "expired"
        ? "That code has expired. Request a new one."
        : result === "locked"
          ? "Too many wrong attempts. Request a new code."
          : "That code is not valid.";
    return { errors: { code: [msg] } };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  // Bumping sessionVersion logs the account out of every existing session.
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, sessionVersion: { increment: 1 } } });
  await logAudit("user.password_reset", { userId: user.id, ip });
  await clearPendingEmail();
  redirect("/login?reset=1");
}
