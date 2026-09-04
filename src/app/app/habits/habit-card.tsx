"use client";

import { useState } from "react";
import { HabitForm } from "./habit-form";
import { deleteHabit, setHabitArchived, toggleHabitLog } from "./actions";

export type HabitView = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  isArchived: boolean;
  doneDays: string[];
  forgivenDays: string[];
  restDayUsedThisWeek: boolean;
  current: number;
  longest: number;
};

export function HabitCard({ habit, days, today, dayLabels }: { habit: HabitView; days: string[]; today: string; dayLabels: string[] }) {
  const [editing, setEditing] = useState(false);
  const done = new Set(habit.doneDays);
  const forgiven = new Set(habit.forgivenDays);

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            {habit.icon || "✅"}
          </span>
          <div className="min-w-0">
            <h3 className="font-medium">{habit.name}</h3>
            {habit.description ? <p className="text-sm text-muted">{habit.description}</p> : null}
            <p className="mt-1 text-xs text-muted">
              🔥 {habit.current}-day streak · best {habit.longest}
              {habit.restDayUsedThisWeek ? " · rest day used this week" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          {!habit.isArchived ? (
            <button type="button" onClick={() => setEditing((v) => !v)} className="rounded-lg px-2 py-1 text-muted hover:bg-accent/40 hover:text-foreground">
              {editing ? "Close" : "Edit"}
            </button>
          ) : null}
          <form action={setHabitArchived}>
            <input type="hidden" name="id" value={habit.id} />
            <input type="hidden" name="archived" value={habit.isArchived ? "0" : "1"} />
            <button type="submit" className="rounded-lg px-2 py-1 text-muted hover:bg-accent/40 hover:text-foreground">
              {habit.isArchived ? "Restore" : "Archive"}
            </button>
          </form>
          {habit.isArchived ? (
            <form action={deleteHabit}>
              <input type="hidden" name="id" value={habit.id} />
              <button type="submit" className="rounded-lg px-2 py-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40">
                Delete
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {editing ? (
        <div className="mt-4 border-t border-border pt-4">
          <HabitForm initial={{ id: habit.id, name: habit.name, description: habit.description ?? "", icon: habit.icon ?? "" }} onDone={() => setEditing(false)} />
        </div>
      ) : null}

      {!habit.isArchived ? (
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {days.map((day, i) => {
            const isDone = done.has(day);
            const isForgiven = !isDone && forgiven.has(day);
            const isToday = day === today;
            const isFuture = day > today;
            return (
              <form key={day} action={toggleHabitLog} className="flex flex-col items-center gap-1">
                <input type="hidden" name="habitId" value={habit.id} />
                <input type="hidden" name="day" value={day} />
                <span className={`text-[10px] uppercase tracking-wide ${isToday ? "font-semibold text-foreground" : "text-muted"}`}>
                  {dayLabels[i]}
                  <span className="block text-center text-[10px] font-normal normal-case">{Number(day.slice(8, 10))}</span>
                </span>
                <button
                  type="submit"
                  disabled={isFuture}
                  aria-pressed={isDone}
                  aria-label={`${habit.name} on ${day}: ${isFuture ? "upcoming" : isDone ? "done" : isForgiven ? "rest day (forgiven)" : "not done"}`}
                  className={`flex h-9 w-full items-center justify-center rounded-lg border text-base transition disabled:cursor-not-allowed disabled:opacity-35 ${
                    isDone
                      ? "border-primary bg-primary text-primary-foreground"
                      : isForgiven
                        ? "border-dashed border-primary/60 bg-background text-primary"
                        : "border-border bg-background text-muted hover:border-primary/60"
                  } ${isToday ? "ring-2 ring-primary/30" : ""}`}
                >
                  {isDone ? "✓" : isForgiven ? "◌" : ""}
                </button>
              </form>
            );
          })}
        </div>
      ) : null}
    </li>
  );
}
