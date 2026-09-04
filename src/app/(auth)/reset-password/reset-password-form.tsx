"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword } from "../actions";
import { AuthCard, Field, FormMessage, SubmitButton } from "@/components/ui/form";

export function ResetPasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  return (
    <AuthCard
      title="Choose a new password"
      subtitle={email ? `If ${email} is registered, a code has been sent to it.` : "Enter your email, the code we sent, and a new password."}
    >
      <form action={action} className="flex flex-col gap-4" noValidate>
        {email ? (
          <input type="hidden" name="email" value={email} />
        ) : (
          <Field label="Email" id="email" name="email" type="email" autoComplete="email" required errors={state?.errors?.email} />
        )}
        <Field
          label="Reset code"
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="123456"
          required
          errors={state?.errors?.code}
        />
        <Field
          label="New password"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters, with a letter and a number."
          errors={state?.errors?.password}
        />
        <FormMessage message={state?.message} />
        <SubmitButton pending={pending}>Update password</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Didn&apos;t get a code?{" "}
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Request again
        </Link>
      </p>
    </AuthCard>
  );
}
