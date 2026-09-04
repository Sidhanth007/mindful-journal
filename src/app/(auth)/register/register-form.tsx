"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { register } from "../actions";
import { AuthCard, Field, FormMessage, SubmitButton } from "@/components/ui/form";

export function RegisterForm() {
  const [state, action, pending] = useActionState(register, undefined);
  const tzRef = useRef<HTMLInputElement>(null);

  // Capture the browser's timezone so "today" matches the user's clock.
  useEffect(() => {
    if (tzRef.current) tzRef.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  }, []);

  return (
    <AuthCard title="Create your account" subtitle="Your journal is private to you. We'll email you a code to verify your address.">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <input ref={tzRef} type="hidden" name="timezone" defaultValue="" />
        <Field label="Name" id="name" name="name" autoComplete="name" required errors={state?.errors?.name} />
        <Field label="Email" id="email" name="email" type="email" autoComplete="email" required errors={state?.errors?.email} />
        <Field
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters, with a letter and a number."
          errors={state?.errors?.password}
        />
        <FormMessage message={state?.message} />
        <SubmitButton pending={pending}>Create account</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
