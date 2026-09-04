import * as z from "zod";

const email = z
  .email({ error: "Please enter a valid email address." })
  .trim()
  .toLowerCase()
  .max(254);

const password = z
  .string()
  .min(8, { error: "Password must be at least 8 characters." })
  .max(128, { error: "Password is too long." })
  .regex(/[a-zA-Z]/, { error: "Password must contain a letter." })
  .regex(/[0-9]/, { error: "Password must contain a number." });

const otpCode = z
  .string()
  .trim()
  .regex(/^\d{6}$/, { error: "Enter the 6-digit code from your email." });

export const registerSchema = z.object({
  name: z.string().trim().min(2, { error: "Name must be at least 2 characters." }).max(80),
  email,
  password,
  timezone: z.string().trim().max(64).optional().or(z.literal("")),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Password is required." }).max(128),
});

export const verifyEmailSchema = z.object({
  email,
  code: otpCode,
});

export const resendCodeSchema = z.object({ email });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  email,
  code: otpCode,
  password,
});

// ───────────────────────── Journal ─────────────────────────

const emotionTag = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(24, { error: "Emotion tags must be 24 characters or fewer." })
  .regex(/^[a-z][a-z\s-]*$/, { error: "Emotion tags can only contain letters, spaces and hyphens." });

export const journalEntrySchema = z.object({
  id: z.string().trim().min(1).optional(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pick a valid date." }),
  title: z.string().trim().max(120, { error: "Title must be 120 characters or fewer." }).optional().or(z.literal("")),
  moodScore: z.coerce.number().int().min(1, { error: "Pick how you felt." }).max(5, { error: "Pick how you felt." }),
  emotions: z.array(emotionTag).max(8, { error: "Choose up to 8 emotions." }).default([]),
  content: z
    .string()
    .trim()
    .min(1, { error: "Write at least a few words." })
    .max(20_000, { error: "Entries are limited to 20,000 characters." }),
  gratitude: z.string().trim().max(500, { error: "Keep gratitude to 500 characters." }).optional().or(z.literal("")),
  template: z.string().trim().max(40).optional().or(z.literal("")),
});

// ───────────────────────── Habits & goals ─────────────────────────

export const habitSchema = z.object({
  id: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1, { error: "Give the habit a name." }).max(60, { error: "Keep the name under 60 characters." }),
  description: z.string().trim().max(200, { error: "Keep the description under 200 characters." }).optional().or(z.literal("")),
  icon: z.string().trim().max(4, { error: "Use a single emoji." }).optional().or(z.literal("")),
});

export const goalSchema = z.object({
  id: z.string().trim().min(1).optional(),
  title: z.string().trim().min(2, { error: "Give the goal a title." }).max(120, { error: "Keep the title under 120 characters." }),
  description: z.string().trim().max(500, { error: "Keep the description under 500 characters." }).optional().or(z.literal("")),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pick a valid date." }).optional().or(z.literal("")),
  progress: z.coerce.number().int().min(0).max(100, { error: "Progress is 0–100." }).default(0),
  status: z.enum(["ACTIVE", "COMPLETED", "PAUSED"]).default("ACTIVE"),
});

// ───────────────────────── Daily check-in ─────────────────────────

export const checkInSchema = z.object({
  checkDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pick a valid date." }),
  moodScore: z.coerce.number().int().min(1, { error: "Move the meter to how you feel." }).max(5),
  energy: z.coerce.number().int().min(1).max(3).optional(),
  factors: z.array(z.object({ key: z.string().min(1).max(32), effect: z.enum(["helped", "hurt"]) })).max(20).default([]),
  goalStatuses: z.record(z.string().min(1), z.enum(["ON_TRACK", "SLIPPING", "STUCK"])).default({}),
  habitsDone: z.array(z.string().min(1)).max(50).default([]),
  note: z.string().trim().max(500, { error: "Keep the note under 500 characters." }).optional().or(z.literal("")),
});

// ───────────────────────── Settings ─────────────────────────

const timezone = z
  .string()
  .trim()
  .max(64)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, { error: "Pick a valid timezone." });

export const profileSchema = z.object({
  name: z.string().trim().min(2, { error: "Name must be at least 2 characters." }).max(80),
  timezone,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { error: "Enter your current password." }).max(128),
  newPassword: password,
});

export const deleteAccountSchema = z.object({
  confirmEmail: email,
  password: z.string().min(1, { error: "Enter your password to confirm." }).max(128),
});

export const timezoneSchema = timezone;

export type FieldErrors = Record<string, string[] | undefined>;

export type FormState =
  | {
      errors?: FieldErrors;
      message?: string;
      success?: string;
    }
  | undefined;

/** Turn a Zod error into the `{ errors }` shape our forms render. */
export function toFormErrors(error: z.ZodError): FormState {
  return { errors: z.flattenError(error).fieldErrors as FieldErrors };
}
