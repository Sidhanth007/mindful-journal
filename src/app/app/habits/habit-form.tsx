"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { saveHabit } from "./actions";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";

const ICONS = ["🚶", "🏃", "💧", "📖", "🧘", "😴", "🥗", "✍️", "🎯", "🎵", "🧹", "☀️", "💊", "🚭", "🧠", "🤝"];

export function HabitForm({ initial, onDone }: { initial?: { id: string; name: string; description: string; icon: string }; onDone?: () => void }) {
  const [state, action, pending] = useActionState(saveHabit, undefined);
  const [icon, setIcon] = useState(initial?.icon ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const key = initial?.id ?? "new";

  useEffect(() => {
    if (state?.success) {
      if (!initial) formRef.current?.reset();
      onDone?.();
    }
  }, [state, initial, onDone]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3" noValidate>
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="icon" value={icon} />

      <Field label="Habit" id={`name-${key}`} name="name" defaultValue={initial?.name ?? ""} placeholder="e.g. 10-minute walk" maxLength={60} required errors={state?.errors?.name} />

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-sm font-medium">
          Icon <span className="font-normal text-muted">(optional)</span>
        </legend>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setIcon("")}
            aria-pressed={icon === ""}
            className={`h-9 rounded-lg border px-2 text-xs transition ${icon === "" ? "border-primary bg-accent/70" : "border-border bg-background text-muted hover:border-primary/60"}`}
          >
            none
          </button>
          {ICONS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIcon(i)}
              aria-pressed={icon === i}
              aria-label={`Icon ${i}`}
              className={`h-9 w-9 rounded-lg border text-lg transition ${icon === i ? "border-primary bg-accent/70 ring-2 ring-primary/30" : "border-border bg-background hover:border-primary/60"}`}
            >
              {i}
            </button>
          ))}
        </div>
        {state?.errors?.icon ? <p className="text-xs text-red-600 dark:text-red-400">{state.errors.icon.join(" ")}</p> : null}
      </fieldset>

      <Field
        label="Why it matters (optional)"
        id={`description-${key}`}
        name="description"
        defaultValue={initial?.description ?? ""}
        placeholder="A short reminder of why you're doing this"
        maxLength={200}
        errors={state?.errors?.description}
      />
      <FormMessage message={state?.message} />
      {!initial ? <FormMessage tone="success" message={state?.success} /> : null}
      <div className="sm:w-40">
        <SubmitButton pending={pending}>{initial ? "Save" : "Add habit"}</SubmitButton>
      </div>
    </form>
  );
}
