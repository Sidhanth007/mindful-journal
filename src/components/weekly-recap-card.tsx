import { formatDay } from "@/lib/dates";
import { moodInfo } from "@/lib/journal";
import { factorLabel } from "@/lib/checkin";
import type { WeeklyRecapView } from "@/lib/recap";

export function WeeklyRecapCard({ recap }: { recap: WeeklyRecapView }) {
  const s = recap.stats;
  const delta = s.avgMood !== null && s.prevAvgMood !== null ? Math.round((s.avgMood - s.prevAvgMood) * 10) / 10 : null;

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">Last week</h2>
        <span className="text-xs text-muted">{recap.label}</span>
      </div>

      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs text-muted">Average mood</dt>
          <dd className="mt-0.5 text-xl font-semibold">
            {s.avgMood !== null ? `${s.avgMood} / 5` : "—"}
            {delta !== null ? <span className={`ml-2 text-xs font-normal ${delta > 0 ? "text-emerald-700 dark:text-emerald-300" : delta < 0 ? "text-rose-700 dark:text-rose-300" : "text-muted"}`}>{delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta)} vs week before</span> : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Best / hardest day</dt>
          <dd className="mt-0.5">
            {s.bestDay ? `${moodInfo(s.bestDay.mood).emoji} ${formatDay(s.bestDay.day, { weekday: "short" })}` : "—"}
            <span className="text-muted"> · </span>
            {s.hardestDay ? `${moodInfo(s.hardestDay.mood).emoji} ${formatDay(s.hardestDay.day, { weekday: "short" })}` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Habits kept</dt>
          <dd className="mt-0.5">{s.habitsPossible ? `${s.habitsDone} of ${s.habitsPossible}` : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Written</dt>
          <dd className="mt-0.5">
            {s.entries} {s.entries === 1 ? "entry" : "entries"}
            {s.totalWords ? ` · ${s.totalWords.toLocaleString()} words` : ""}
            {s.checkIns ? ` · ${s.checkIns} check-ins` : ""}
          </dd>
        </div>
      </dl>

      {s.topHelped || s.topHurt ? (
        <p className="mt-3 text-sm text-muted">
          {s.topHelped ? (
            <>
              👍 <span className="text-foreground">{factorLabel(s.topHelped.key)}</span> helped most ({s.topHelped.count}×)
            </>
          ) : null}
          {s.topHelped && s.topHurt ? " · " : null}
          {s.topHurt ? (
            <>
              👎 <span className="text-foreground">{factorLabel(s.topHurt.key)}</span> made days harder ({s.topHurt.count}×)
            </>
          ) : null}
        </p>
      ) : null}

      {recap.aiLine ? <p className="mt-3 rounded-lg bg-accent/60 px-3 py-2 text-sm leading-relaxed">{recap.aiLine}</p> : null}
    </section>
  );
}
