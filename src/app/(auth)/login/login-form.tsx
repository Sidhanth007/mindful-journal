"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "../actions";
import { AuthCard, Field, FormMessage, SubmitButton } from "@/components/ui/form";

export function LoginForm({ notice, next }: { notice?: string; next?: string }) {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <AuthCard title="Welcome back" subtitle="Log in to continue your reflections.">
      <form action={action} className="flex flex-col gap-4" noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <FormMessage message={notice} tone="success" />
        <Field label="Email" id="email" name="email" type="email" autoComplete="email" required errors={state?.errors?.email} />
        <Field
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          errors={state?.errors?.password}
        />
        <div className="-mt-2 text-right">
          <Link href="/forgot-password" className="text-xs text-muted hover:text-foreground hover:underline">
            Forgot password?
          </Link>
        </div>
        <FormMessage message={state?.message} />
        <SubmitButton pending={pending}>Log in</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
