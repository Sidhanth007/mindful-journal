"use client";

import { useActionState } from "react";
import { resendVerificationCode, verifyEmail } from "../actions";
import { AuthCard, Field, FormMessage, SubmitButton } from "@/components/ui/form";

export function VerifyEmailForm({ email, unverified }: { email: string; unverified: boolean }) {
  const [state, action, pending] = useActionState(verifyEmail, undefined);
  const [resendState, resendAction, resending] = useActionState(resendVerificationCode, undefined);

  return (
    <AuthCard
      title="Check your email"
      subtitle={
        email
          ? `We sent a 6-digit code to ${email}. It expires in 10 minutes.`
          : "Enter the email you registered with and the 6-digit code we sent you."
      }
    >
      <form action={action} className="flex flex-col gap-4" noValidate>
        {unverified ? <FormMessage tone="info" message="Please verify your email before logging in. We've sent you a fresh code." /> : null}
        {email ? (
          <input type="hidden" name="email" value={email} />
        ) : (
          <Field label="Email" id="email" name="email" type="email" autoComplete="email" required errors={state?.errors?.email} />
        )}
        <Field
          label="Verification code"
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
        <FormMessage message={state?.message} />
        <SubmitButton pending={pending}>Verify email</SubmitButton>
      </form>

      <form action={resendAction} className="mt-4 flex flex-col gap-2">
        {email ? <input type="hidden" name="email" value={email} /> : null}
        <FormMessage message={resendState?.success} tone="success" />
        <FormMessage message={resendState?.message} />
        {email ? (
          <SubmitButton pending={resending} variant="ghost">
            Resend code
          </SubmitButton>
        ) : null}
      </form>
    </AuthCard>
  );
}
