"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { deleteGoal, saveGoal } from "./actions";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import type { FormState } from "@/lib/validation";

export type GoalView = {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null; // YYYY-MM-DD
  progress: number;
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
  overdue: boolean;
};

const STATUS_LABEL: Record<GoalView["status"], string> = { ACTIVE: "Active", COMPLETED: "Completed", PAUSED: "Paused" };

export function NewGoalForm() {
  const [state, action, pending] = useActionState(saveGoal, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.success) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-3" noValidate>
      <Field label="Goal" id="title-new" name="title" placeholder="e.g. Sleep 7+ hours on weeknights" maxLength={120} required errors={state?.errors?.title} />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <Field label="Why / how (optional)" id="description-new" name="description" placeholder="What does progress look like?" maxLength={500} errors={state?.errors?.description} />
        <Field label="Target date (optional)" id="targetDate-new" name="targetDate" type="date" errors={state?.errors?.targetDate} />
      </div>
      <FormMessage message={state?.message} />
      <FormMessage tone="success" message={state?.success} />
      <div className="sm:w-40">
        <SubmitButton pending={pending}>Add goal</SubmitButton>
      </div>
    </form>
  );
}

export function GoalCard({ goal }: { goal: GoalView }) {
  const [editing, setEditing] = useState(false);
  const [progress, setProgress] = useState(goal.progress);
  const [state, action, pending] = useActionState(
    async (prev: FormState, formData: FormData) => {
      const result = await saveGoal(prev, formData);
      if (result?.success) setEditing(false);
      return result;
    },
    undefined as FormState,
  );

  const tone = goal.status === "COMPLETED" ? "bg-emerald-500" : goal.status === "PAUSED" ? "bg-slate-400" : "bg-primary";

  return (
    <li className={`rounded-xl border border-border bg-card p-4 ${goal.status !== "ACTIVE" ? "opacity-90" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`font-medium ${goal.status === "COMPLETED" ? "line-through decoration-muted" : ""}`}>{goal.title}</h3>
          {goal.description ? <p className="text-sm text-muted">{goal.description}</p> : null}
          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
            <span>{STATUS_LABEL[goal.status]}</span>
            {goal.targetDate ? <span className={goal.overdue ? "text-red-600 dark:text-red-400" : ""}>Target {goal.targetDate}{goal.overdue ? " · overdue" : ""}</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <button type="button" onClick={() => setEditing((v) => !v)} className="rounded-lg px-2 py-1 text-muted hover:bg-accent/40 hover:text-foreground">
            {editing ? "Close" : "Update"}
          </button>
          <form action={deleteGoal}>
            <input type="hidden" name="id" value={goal.id} />
            <button type="submit" className="rounded-lg px-2 py-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40">
              Delete
            </button>
          </form>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={goal.progress} aria-valuemin={0} aria-valuemax={100}>
          <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${goal.progress}%` }} />
        </div>
        <span className="w-10 text-right text-xs font-medium tabular-nums">{goal.progress}%</span>
      </div>

      {editing ? (
        <form action={action} className="mt-4 flex flex-col gap-3 border-t border-border pt-4" noValidate>
          <input type="hidden" name="id" value={goal.id} />
          <Field label="Goal" id={`title-${goal.id}`} name="title" defaultValue={goal.title} maxLength={120} required errors={state?.errors?.title} />
          <Field label="Why / how" id={`description-${goal.id}`} name="description" defaultValue={goal.description ?? ""} maxLength={500} errors={state?.errors?.description} />
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Target date" id={`targetDate-${goal.id}`} name="targetDate" type="date" defaultValue={goal.targetDate ?? ""} errors={state?.errors?.targetDate} />
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`status-${goal.id}`} className="text-sm font-medium">
                Status
              </label>
              <select
                id={`status-${goal.id}`}
                name="status"
                defaultValue={goal.status}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              >
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`progress-${goal.id}`} className="text-sm font-medium">
                Progress: {progress}%
              </label>
              <input
                id={`progress-${goal.id}`}
                name="progress"
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                className="accent-primary"
              />
            </div>
          </div>
          <FormMessage message={state?.message} />
          <div className="sm:w-40">
            <SubmitButton pending={pending}>Save</SubmitButton>
          </div>
        </form>
      ) : null}
    </li>
  );
}
