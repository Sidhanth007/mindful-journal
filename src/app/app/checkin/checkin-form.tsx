"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveCheckIn } from "./actions";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { moodInfo } from "@/lib/journal";
import { ENERGY_LABELS, FACTORS, GOAL_STATUS_LABELS, MOOD_WORDS, type FactorEffect, type GoalCheckStatus } from "@/lib/checkin";

export type CheckInInitial = {
  checkDate: string;
  moodScore: number;
  energy: number | null;
  factors: { key: string; effect: FactorEffect }[];
  goalStatuses: Record<string, GoalCheckStatus>;
  note: string;
};

export type HabitOption = { id: string; name: string; icon: string | null; done: boolean; streak: number };
export type GoalOption = { id: string; title: string; progress: number };

export function CheckInForm({ initial, habits, goals, isEdit }: { initial: CheckInInitial; habits: HabitOption[]; goals: GoalOption[]; isEdit: boolean }) {
  const [state, action, pending] = useActionState(saveCheckIn, undefined);
  const [mood, setMood] = useState(initial.moodScore);
  const [energy, setEnergy] = useState<number | null>(initial.energy);
  const [factors, setFactors] = useState<Record<string, FactorEffect | undefined>>(Object.fromEntries(initial.factors.map((f) => [f.key, f.effect])));
  const [habitsDone, setHabitsDone] = useState<Record<string, boolean>>(Object.fromEntries(habits.map((h) => [h.id, h.done])));
  const [goalStatuses, setGoalStatuses] = useState<Record<string, GoalCheckStatus | undefined>>(initial.goalStatuses);

  const m = moodInfo(mood);

  // helped → hurt → off
  function cycleFactor(key: string) {
    setFactors((prev) => {
      const cur = prev[key];
      const next: FactorEffect | undefined = cur === undefined ? "helped" : cur === "helped" ? "hurt" : undefined;
      return { ...prev, [key]: next };
    });
  }

  return (
    <form action={action} className="flex flex-col gap-8" noValidate>
      <input type="hidden" name="checkDate" value={initial.checkDate} />
      <input type="hidden" name="moodScore" value={mood} />
      {energy ? <input type="hidden" name="energy" value={energy} /> : null}
      {Object.entries(factors)
        .filter(([, e]) => e)
        .map(([k, e]) => (
          <input key={k} type="hidden" name="factor" value={`${k}:${e}`} />
        ))}
      {Object.entries(habitsDone)
        .filter(([, v]) => v)
        .map(([id]) => (
          <input key={id} type="hidden" name="habitDone" value={id} />
        ))}
      {Object.entries(goalStatuses)
        .filter(([, v]) => v)
        .map(([id, v]) => (
          <input key={id} type="hidden" name={`goal:${id}`} value={v} />
        ))}

      {/* Step 1 — mood meter */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">1 · How are you feeling right now?</h2>
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="text-6xl leading-none" aria-hidden>
            {m.emoji}
          </div>
          <p className="text-lg font-medium">{MOOD_WORDS[mood]}</p>
          <label htmlFor="mood-meter" className="sr-only">
            Mood from 1 (very low) to 5 (great)
          </label>
          <input
            id="mood-meter"
            type="range"
            min={1}
            max={5}
            step={1}
            value={mood}
            onChange={(e) => setMood(Number(e.target.value))}
            className="w-full max-w-md accent-primary"
            aria-valuetext={`${mood} of 5, ${m.label}`}
          />
          <div className="flex w-full max-w-md justify-between text-[11px] text-muted">
            <span>Very low</span>
            <span>Great</span>
          </div>
        </div>
        {state?.errors?.moodScore ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{state.errors.moodScore.join(" ")}</p> : null}

        <div className="mt-6 flex flex-col gap-2">
          <p className="text-sm font-medium">
            Energy <span className="font-normal text-muted">(optional)</span>
          </p>
          <div className="flex gap-2">
            {ENERGY_LABELS.map((label, i) => {
              const v = i + 1;
              const on = energy === v;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setEnergy(on ? null : v)}
                  aria-pressed={on}
                  className={`rounded-full border px-4 py-1.5 text-sm transition ${on ? "border-primary bg-accent/70" : "border-border bg-background text-muted hover:border-primary/60"}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Step 2 — factors */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">2 · What&apos;s shaping today&apos;s mood?</h2>
        <p className="mt-1 text-xs text-muted">Tap once for “helped” 👍, twice for “made it harder” 👎, a third time to clear.</p>
        <div className="mt-4 flex flex-col gap-4">
          {FACTORS.map((group) => (
            <div key={group.group}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{group.group}</p>
              <div className="flex flex-wrap gap-2">
                {group.items.map((f) => {
                  const effect = factors[f.key];
                  const cls =
                    effect === "helped"
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : effect === "hurt"
                        ? "border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
                        : "border-border bg-background text-muted hover:border-primary/60";
                  return (
                    <button key={f.key} type="button" onClick={() => cycleFactor(f.key)} aria-pressed={Boolean(effect)} className={`rounded-full border px-3 py-1.5 text-sm transition ${cls}`}>
                      {effect === "helped" ? "👍 " : effect === "hurt" ? "👎 " : ""}
                      {f.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          <label htmlFor="note" className="text-sm font-medium">
            Anything else? <span className="font-normal text-muted">(optional)</span>
          </label>
          <input
            id="note"
            name="note"
            defaultValue={initial.note}
            maxLength={500}
            placeholder="A line or two in your own words"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
          {state?.errors?.note ? <p className="text-xs text-red-600 dark:text-red-400">{state.errors.note.join(" ")}</p> : null}
        </div>
      </section>

      {/* Step 3 — habits & goals */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-medium">3 · Habits and goals</h2>
        {habits.length === 0 && goals.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Nothing set up yet —{" "}
            <Link href="/app/habits" className="underline hover:text-foreground">
              add a habit
            </Link>{" "}
            or{" "}
            <Link href="/app/goals" className="underline hover:text-foreground">
              a goal
            </Link>{" "}
            and they&apos;ll appear here.
          </p>
        ) : null}

        {habits.length > 0 ? (
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Today&apos;s habits</p>
            <ul className="flex flex-col gap-2">
              {habits.map((h) => {
                const on = habitsDone[h.id];
                return (
                  <li key={h.id}>
                    <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition ${on ? "border-primary bg-accent/50" : "border-border bg-background hover:border-primary/60"}`}>
                      <span className="flex items-center gap-2">
                        <input type="checkbox" checked={on} onChange={() => setHabitsDone((p) => ({ ...p, [h.id]: !p[h.id] }))} className="h-4 w-4 accent-primary" />
                        <span aria-hidden>{h.icon || "✅"}</span>
                        {h.name}
                      </span>
                      <span className="text-xs text-muted">🔥 {h.streak}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {goals.length > 0 ? (
          <div className="mt-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">How are your goals going?</p>
            <ul className="flex flex-col gap-3">
              {goals.map((g) => (
                <li key={g.id} className="rounded-lg border border-border bg-background px-3 py-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{g.title}</span>
                    <span className="text-xs text-muted">{g.progress}%</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(Object.keys(GOAL_STATUS_LABELS) as GoalCheckStatus[]).map((s) => {
                      const on = goalStatuses[g.id] === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setGoalStatuses((p) => ({ ...p, [g.id]: on ? undefined : s }))}
                          aria-pressed={on}
                          className={`rounded-full border px-3 py-1 text-xs transition ${on ? "border-primary bg-accent/70 text-foreground" : "border-border text-muted hover:border-primary/60"}`}
                        >
                          {GOAL_STATUS_LABELS[s]}
                        </button>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      <FormMessage message={state?.message} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/app" className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/40">
          Cancel
        </Link>
        <div className="sm:w-48">
          <SubmitButton pending={pending}>{isEdit ? "Update check-in" : "Save check-in"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
