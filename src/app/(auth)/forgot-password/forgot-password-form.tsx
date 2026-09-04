"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword } from "../actions";
import { AuthCard, Field, FormMessage, SubmitButton } from "@/components/ui/form";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPassword, undefined);

  return (
    <AuthCard title="Reset your password" subtitle="Enter your email and we'll send a 6-digit code.">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <Field label="Email" id="email" name="email" type="email" autoComplete="email" required errors={state?.errors?.email} />
        <FormMessage message={state?.message} />
        <SubmitButton pending={pending}>Send code</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
