import type { InputHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export function Field({
  label,
  id,
  errors,
  hint,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  errors?: string[];
  hint?: string;
}) {
  const invalid = Boolean(errors?.length);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 aria-invalid:border-red-500"
        {...input}
      />
      {invalid ? (
        <p id={`${id}-error`} className="text-xs text-red-600 dark:text-red-400">
          {errors!.join(" ")}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  pending,
  variant = "primary",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { pending?: boolean; variant?: "primary" | "ghost" }) {
  const base =
    "inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground hover:opacity-90"
      : "border border-border bg-transparent hover:bg-accent/40";
  return (
    <button type="submit" disabled={pending} className={`${base} ${styles}`} {...rest}>
      {pending ? "Please wait…" : children}
    </button>
  );
}

export function FormMessage({ message, tone = "error" }: { message?: string; tone?: "error" | "success" | "info" }) {
  if (!message) return null;
  const styles =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
        : "border-border bg-accent/40 text-foreground";
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>
      {message}
    </p>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  );
}
