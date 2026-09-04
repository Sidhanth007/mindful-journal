"use client";

import Link from "next/link";
import { useActionState } from "react";
import { acceptSuggestion, reflectOnCheckIn, type AcceptState, type ReflectState } from "./actions";
import type { CheckInSuggestion } from "@/lib/ai";
import { FormMessage } from "@/components/ui/form";
import { CrisisNotice } from "../companion/crisis-notice";

function SuggestionRow({ suggestion: s }: { suggestion: CheckInSuggestion }) {
  const [state, action, pending] = useActionState<AcceptState, FormData>(acceptSuggestion, undefined);
  const done = state?.status === "ok";
  const href = s.type === "new_habit" ? "/app/habits" : "/app/goals";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
      <span>
        {s.type === "new_habit" ? (
          <>
            <span className="font-medium">
              New habit: {s.icon ? `${s.icon} ` : ""}
              {s.name}
            </span>
            <span className="block text-xs text-muted">{s.why}</span>
          </>
        ) : (
          <>
            <span className="font-medium">{s.status === "PAUSED" ? "Pause" : s.status === "COMPLETED" ? "Mark complete" : "Resume"} a goal</span>
            <span className="block text-xs text-muted">{s.why}</span>
          </>
        )}
        {state?.status === "error" ? <span className="block text-xs text-red-600 dark:text-red-400">{state.message}</span> : null}
      </span>
      {done ? (
        <span className="text-xs text-emerald-700 dark:text-emerald-300">
          ✓ {state.message}{" "}
          <Link href={href} className="underline">
            View
          </Link>
        </span>
      ) : (
        <form action={action}>
          <input type="hidden" name="type" value={s.type} />
          {s.type === "new_habit" ? (
            <>
              <input type="hidden" name="name" value={s.name} />
              <input type="hidden" name="icon" value={s.icon ?? ""} />
              <input type="hidden" name="why" value={s.why} />
            </>
          ) : (
            <>
              <input type="hidden" name="goalId" value={s.goalId} />
              <input type="hidden" name="status" value={s.status} />
            </>
          )}
          <button type="submit" disabled={pending} className="rounded-lg border border-primary/60 px-3 py-1 text-xs text-primary hover:bg-accent/40 disabled:opacity-60">
            {pending ? "Adding…" : "Accept"}
          </button>
        </form>
      )}
    </li>
  );
}

export function ReflectPanel({ checkDate, configured }: { checkDate: string; configured: boolean }) {
  const [state, action, pending] = useActionState<ReflectState, FormData>(reflectOnCheckIn, undefined);

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-primary/40 bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">Reflect on this with the companion</h2>
          <p className="text-xs text-muted">Sends this check-in, your habits and goals, the last 6 check-ins, and today&apos;s journal entry (if any) to the AI provider for one response.</p>
        </div>
        <form action={action}>
          <input type="hidden" name="checkDate" value={checkDate} />
          <button
            type="submit"
            disabled={pending || !configured}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Thinking…" : "Reflect"}
          </button>
        </form>
      </div>

      {!configured ? <p className="text-xs text-muted">The companion isn&apos;t configured yet (GEMINI_API_KEY missing).</p> : null}
      {state?.status === "error" ? <FormMessage message={state.message} /> : null}
      {state?.risk ? <CrisisNotice /> : null}

      {state?.status === "ok" ? (
        <div className="flex flex-col gap-4" aria-live="polite">
          <div className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">{state.reflection}</div>

          {state.suggestions.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Suggestions — yours to accept or ignore</p>
              <ul className="flex flex-col gap-2">
                {state.suggestions.map((s, i) => (
                  <SuggestionRow key={i} suggestion={s} />
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted">No changes suggested this time.</p>
          )}

          <p className="text-xs text-muted">AI-generated, may be imperfect · a supportive tool, not medical advice</p>
        </div>
      ) : null}
    </section>
  );
}
