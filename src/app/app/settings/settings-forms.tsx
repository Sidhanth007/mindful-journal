"use client";

import { useActionState } from "react";
import { changePassword, deleteAccount, updateProfile } from "./actions";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";

export function ProfileForm({ name, timezone, timezones }: { name: string; timezone: string; timezones: string[] }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const options = timezones.includes(timezone) ? timezones : [timezone, ...timezones];
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Name" id="name" name="name" defaultValue={name} maxLength={80} required errors={state?.errors?.name} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="timezone" className="text-sm font-medium">
          Timezone
        </label>
        <select id="timezone" name="timezone" defaultValue={timezone} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30">
          {options.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted">Decides what counts as “today” for entries, check-ins and streaks.</p>
        {state?.errors?.timezone ? <p className="text-xs text-red-600 dark:text-red-400">{state.errors.timezone.join(" ")}</p> : null}
      </div>
      <FormMessage message={state?.message} />
      <FormMessage tone="success" message={state?.success} />
      <div className="sm:w-40">
        <SubmitButton pending={pending}>Save</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <Field label="Current password" id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required errors={state?.errors?.currentPassword} />
      <Field label="New password" id="newPassword" name="newPassword" type="password" autoComplete="new-password" required hint="At least 8 characters, with a letter and a number. You'll be logged out everywhere." errors={state?.errors?.newPassword} />
      <FormMessage message={state?.message} />
      <div className="sm:w-48">
        <SubmitButton pending={pending}>Change password</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteAccountForm({ email, isAdmin }: { email: string; isAdmin: boolean }) {
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  if (isAdmin) {
    return <p className="text-sm text-muted">The admin account can&apos;t be deleted from here — it would leave the app without an administrator.</p>;
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted">
        This permanently deletes your account and <strong className="text-foreground">everything in it</strong> — journal entries, check-ins, habits, goals and AI responses. There is no undo. Export your data first if you want a copy.
      </p>
      <Field label={`Type your email (${email}) to confirm`} id="confirmEmail" name="confirmEmail" type="email" autoComplete="off" required errors={state?.errors?.confirmEmail} />
      <Field label="Your password" id="deletePassword" name="password" type="password" autoComplete="current-password" required errors={state?.errors?.password} />
      <FormMessage message={state?.message} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40 sm:w-64"
      >
        {pending ? "Deleting…" : "Delete my account and all data"}
      </button>
    </form>
  );
}
