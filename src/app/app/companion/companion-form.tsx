"use client";

import { useActionState, useState } from "react";
import { askCompanion, type CompanionState } from "./actions";
import { COMPANION_KINDS, type CompanionKind } from "@/lib/companion";
import { FormMessage } from "@/components/ui/form";
import { CrisisNotice } from "./crisis-notice";

export type ScopeOption = { value: string; label: string; count: number };

export function CompanionForm({
  scopes,
  entryOption,
  initialKind,
}: {
  scopes: ScopeOption[];
  entryOption: { id: string; label: string } | null;
  initialKind?: CompanionKind;
}) {
  const [state, action, pending] = useActionState<CompanionState, FormData>(askCompanion, undefined);
  const [kind, setKind] = useState<CompanionKind>(initialKind ?? "REFLECTION");
  const [scope, setScope] = useState<string>(entryOption ? "entry" : (scopes.find((s) => s.count > 0)?.value ?? "7"));

  const selectedScope = scope === "entry" ? null : scopes.find((s) => s.value === scope);
  const shareCount = scope === "entry" ? 1 : (selectedScope?.count ?? 0);
  const canSend = shareCount > 0 && !pending;

  return (
    <div className="flex flex-col gap-6">
      <form action={action} className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5">
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="scope" value={scope} />
        {entryOption ? <input type="hidden" name="entryId" value={entryOption.id} /> : null}

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">What would you like?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {COMPANION_KINDS.map((k) => (
              <label
                key={k.kind}
                className={`cursor-pointer rounded-xl border p-3 transition ${kind === k.kind ? "border-primary bg-accent/60 ring-2 ring-primary/30" : "border-border bg-background hover:border-primary/60"}`}
              >
                <input type="radio" name="kind-choice" value={k.kind} checked={kind === k.kind} onChange={() => setKind(k.kind)} className="sr-only" />
                <span className="block font-medium">{k.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{k.blurb}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-medium">Which entries to share</legend>
          <div className="flex flex-wrap gap-2">
            {entryOption ? (
              <ScopeChip active={scope === "entry"} onClick={() => setScope("entry")} label={`This entry · ${entryOption.label}`} />
            ) : null}
            {scopes.map((s) => (
              <ScopeChip key={s.value} active={scope === s.value} onClick={() => setScope(s.value)} label={`${s.label} · ${s.count} ${s.count === 1 ? "entry" : "entries"}`} disabled={s.count === 0} />
            ))}
          </div>
          <p className="text-xs text-muted">
            Only the {shareCount === 1 ? "entry" : `${shareCount} entries`} you pick here {shareCount === 1 ? "is" : "are"} sent to the AI provider (Google Gemini) for this one response — nothing else from your account. Responses are saved below so you can revisit or delete them.
          </p>
        </fieldset>

        {state?.status === "error" ? <FormMessage message={state.message} /> : null}

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted">The companion is a supportive tool, not a mental-health professional.</p>
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Thinking…" : COMPANION_KINDS.find((k) => k.kind === kind)?.verb}
          </button>
        </div>
      </form>

      {state?.risk ? <CrisisNotice /> : null}

      {state?.status === "ok" ? (
        <section className="rounded-xl border border-primary/40 bg-card p-5" aria-live="polite">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">{COMPANION_KINDS.find((k) => k.kind === state.kind)?.title}</p>
          <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed sm:text-base">{state.text}</div>
          <p className="mt-4 text-xs text-muted">
            Based on {state.entryCount} {state.entryCount === 1 ? "entry" : "entries"} · AI-generated, may be imperfect · not medical advice
          </p>
        </section>
      ) : null}
    </div>
  );
}

function ScopeChip({ label, active, onClick, disabled }: { label: string; active: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active ? "border-primary bg-accent/70 text-foreground" : "border-border bg-background text-muted hover:border-primary/60"
      }`}
    >
      {label}
    </button>
  );
}
