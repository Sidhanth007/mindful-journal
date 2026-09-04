import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getTrends, type RangeDays } from "@/lib/stats";
import { formatDay } from "@/lib/dates";
import { moodInfo } from "@/lib/journal";
import { factorLabel } from "@/lib/checkin";
import { getLastWeekRecap } from "@/lib/recap";
import { WeeklyRecapCard } from "@/components/weekly-recap-card";
import { StatTile } from "@/components/ui/stat-tile";
import { MoodDistributionChart, MoodLineChart, WeeklyBarChart } from "./charts";

export const metadata: Metadata = { title: "Trends" };

const RANGES: { days: RangeDays; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

export default async function TrendsPage({ searchParams }: PageProps<"/app/trends">) {
  const user = await requireUser();
  const params = await searchParams;
  const requested = Number(Array.isArray(params.range) ? params.range[0] : params.range);
  const range: RangeDays = requested === 7 || requested === 90 ? requested : 30;

  const [t, recap] = await Promise.all([getTrends(user.id, user.timezone, range), getLastWeekRecap(user.id, user.timezone, user.name)]);
  const { summary } = t;
  const consistency = Math.round((summary.entries / summary.daysInRange) * 100);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Trends</h1>
          <p className="mt-1 text-sm text-muted">
            {formatDay(t.from, { month: "short", day: "numeric" })} – {formatDay(t.to, { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <nav className="flex rounded-lg border border-border bg-card p-1 text-sm" aria-label="Date range">
          {RANGES.map((r) => (
            <Link
              key={r.days}
              href={`/app/trends?range=${r.days}`}
              aria-current={r.days === range ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 transition ${r.days === range ? "bg-accent/70 font-medium" : "text-muted hover:text-foreground"}`}
            >
              {r.label}
            </Link>
          ))}
        </nav>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Entries" value={summary.entries} detail={`${consistency}% of days journaled`} />
        <StatTile label="Average mood" value={summary.avgMood !== null ? `${summary.avgMood} / 5` : "—"} detail={summary.avgMood !== null ? moodInfo(Math.round(summary.avgMood)).label : "No entries yet"} />
        <StatTile label="Best day" value={summary.bestDay ? moodInfo(summary.bestDay.mood!).emoji : "—"} detail={summary.bestDay ? summary.bestDay.label : undefined} />
        <StatTile label="Average length" value={summary.avgWords ? `${summary.avgWords} words` : "—"} detail={summary.hardestDay ? `Hardest day: ${summary.hardestDay.label}` : undefined} />
      </section>

      {recap ? <WeeklyRecapCard recap={recap} /> : null}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-medium">Mood over time</h2>
        <p className="mb-2 text-xs text-muted">Each dot is a day you journaled. Gaps are days without an entry.</p>
        <MoodLineChart data={t.moodSeries} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-medium">Entries per week</h2>
          <p className="mb-2 text-xs text-muted">Weeks start on Monday.</p>
          <WeeklyBarChart data={t.weekly} />
        </section>
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-medium">Mood distribution</h2>
          <p className="mb-2 text-xs text-muted">How often each mood showed up.</p>
          <MoodDistributionChart data={t.distribution} />
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-medium">What tends to help — and what makes days harder</h2>
        <p className="mb-2 text-xs text-muted">From {t.checkInCount} {t.checkInCount === 1 ? "check-in" : "check-ins"} in this range.</p>
        {t.factors.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Do a{" "}
            <Link href="/app/checkin" className="underline hover:text-foreground">
              daily check-in
            </Link>{" "}
            and mark what shaped your mood to see this.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {t.factors.map((f) => {
              const total = f.helped + f.hurt;
              const helpedPct = Math.round((f.helped / total) * 100);
              return (
                <li key={f.key} className="grid grid-cols-[110px_1fr_90px] items-center gap-3 text-sm">
                  <span className="truncate">{factorLabel(f.key)}</span>
                  <div className="flex h-2 overflow-hidden rounded-full bg-border" role="img" aria-label={`${factorLabel(f.key)}: helped ${f.helped}, made harder ${f.hurt}`}>
                    <div className="h-full bg-emerald-500" style={{ width: `${helpedPct}%` }} />
                    <div className="h-full bg-rose-500" style={{ width: `${100 - helpedPct}%` }} />
                  </div>
                  <span className="text-right text-xs text-muted tabular-nums">
                    👍 {f.helped} · 👎 {f.hurt}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-medium">Most common emotions</h2>
        {t.emotions.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Tag emotions on your entries to see patterns here.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {t.emotions.map((e) => {
              const pct = Math.round((e.count / t.emotions[0].count) * 100);
              return (
                <li key={e.emotion} className="grid grid-cols-[110px_1fr_40px] items-center gap-3 text-sm">
                  <span className="truncate">{e.emotion}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-border" aria-hidden>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-right text-xs text-muted tabular-nums">{e.count}×</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted">These are simple summaries of what you logged — useful for noticing patterns, not a clinical measure of anything.</p>
    </div>
  );
}
