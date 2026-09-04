import { MOODS, moodInfo } from "@/lib/journal";

export function MoodBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  const m = moodInfo(score);
  const sizing = size === "lg" ? "px-3 py-1.5 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${m.color} ${sizing}`} title={m.label}>
      <span aria-hidden>{m.emoji}</span>
      {m.label}
    </span>
  );
}

export function MoodRadioGroup({ defaultValue, errors }: { defaultValue?: number; errors?: string[] }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-medium">How did you feel overall?</legend>
      <div className="grid grid-cols-5 gap-2">
        {MOODS.map((m) => (
          <label
            key={m.score}
            className="group flex cursor-pointer flex-col items-center gap-1 rounded-xl border border-border bg-background p-3 text-center transition hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-accent/60 has-[:checked]:ring-2 has-[:checked]:ring-primary/30"
          >
            <input type="radio" name="moodScore" value={m.score} defaultChecked={defaultValue === m.score} className="sr-only" required />
            <span className="text-2xl" aria-hidden>
              {m.emoji}
            </span>
            <span className="text-xs text-muted group-has-[:checked]:text-foreground">{m.label}</span>
          </label>
        ))}
      </div>
      {errors?.length ? <p className="text-xs text-red-600 dark:text-red-400">{errors.join(" ")}</p> : null}
    </fieldset>
  );
}

export function EmotionChips({ emotions }: { emotions: string[] }) {
  if (!emotions.length) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {emotions.map((e) => (
        <li key={e} className="rounded-full border border-border bg-background px-2 py-0.5 text-xs text-muted">
          {e}
        </li>
      ))}
    </ul>
  );
}
