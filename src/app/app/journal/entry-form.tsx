"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveEntry } from "./actions";
import { Field, FormMessage, SubmitButton } from "@/components/ui/form";
import { MoodRadioGroup } from "./mood";
import { EMOTION_PRESETS, MAX_CONTENT_LENGTH, MAX_EMOTIONS } from "@/lib/journal";
import { countWords } from "@/lib/dates";

export type EntryFormValues = {
  id?: string;
  entryDate: string;
  title: string;
  moodScore?: number;
  emotions: string[];
  content: string;
  gratitude: string;
  template?: string;
};

export function EntryForm({ initial, maxDate, prompt }: { initial: EntryFormValues; maxDate: string; prompt?: string }) {
  const [state, action, pending] = useActionState(saveEntry, undefined);
  const [content, setContent] = useState(initial.content);
  const [selected, setSelected] = useState<string[]>(initial.emotions.filter((e) => (EMOTION_PRESETS as readonly string[]).includes(e)));
  const customInitial = initial.emotions.filter((e) => !(EMOTION_PRESETS as readonly string[]).includes(e)).join(", ");

  const words = countWords(content);
  const isEdit = Boolean(initial.id);

  function toggle(tag: string) {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length >= MAX_EMOTIONS ? prev : [...prev, tag]));
  }

  return (
    <form action={action} className="flex flex-col gap-6" noValidate>
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {initial.template ? <input type="hidden" name="template" value={initial.template} /> : null}

      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <Field label="Date" id="entryDate" name="entryDate" type="date" defaultValue={initial.entryDate} max={maxDate} required errors={state?.errors?.entryDate} />
        <Field label="Title (optional)" id="title" name="title" defaultValue={initial.title} placeholder="A short headline for today" maxLength={120} errors={state?.errors?.title} />
      </div>

      <MoodRadioGroup defaultValue={initial.moodScore} errors={state?.errors?.moodScore} />

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">
          Emotions <span className="font-normal text-muted">(up to {MAX_EMOTIONS})</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {EMOTION_PRESETS.map((tag) => {
            const on = selected.includes(tag);
            return (
              <label
                key={tag}
                className={`cursor-pointer select-none rounded-full border px-3 py-1 text-sm transition ${
                  on ? "border-primary bg-accent/70 text-foreground" : "border-border bg-background text-muted hover:border-primary/60"
                }`}
              >
                <input type="checkbox" name="emotions" value={tag} checked={on} onChange={() => toggle(tag)} className="sr-only" />
                {tag}
              </label>
            );
          })}
        </div>
        <Field
          label="Other emotions"
          id="customEmotions"
          name="customEmotions"
          defaultValue={customInitial}
          placeholder="comma separated, e.g. curious, restless"
          hint="Letters only; separate with commas."
          errors={state?.errors?.emotions}
        />
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <label htmlFor="content" className="text-sm font-medium">
            Your reflection
          </label>
          <span className="text-xs text-muted">
            {words} {words === 1 ? "word" : "words"}
          </span>
        </div>
        {prompt && !isEdit ? <p className="rounded-lg bg-accent/40 px-3 py-2 text-sm text-muted">Prompt: {prompt}</p> : null}
        <textarea
          id="content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={10}
          maxLength={MAX_CONTENT_LENGTH}
          required
          placeholder="Write freely. This space is private to you."
          aria-invalid={state?.errors?.content ? true : undefined}
          className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 aria-invalid:border-red-500"
        />
        {state?.errors?.content ? <p className="text-xs text-red-600 dark:text-red-400">{state.errors.content.join(" ")}</p> : null}
      </div>

      <Field
        label="One thing I'm grateful for (optional)"
        id="gratitude"
        name="gratitude"
        defaultValue={initial.gratitude}
        maxLength={500}
        placeholder="e.g. a quiet walk after work"
        errors={state?.errors?.gratitude}
      />

      <FormMessage message={state?.message} />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href={isEdit ? `/app/journal/${initial.id}` : "/app/journal"} className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/40">
          Cancel
        </Link>
        <div className="sm:w-48">
          <SubmitButton pending={pending}>{isEdit ? "Save changes" : "Save entry"}</SubmitButton>
        </div>
      </div>
    </form>
  );
}
