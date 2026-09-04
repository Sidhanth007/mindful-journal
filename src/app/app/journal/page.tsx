import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { dateToDay, formatDay } from "@/lib/dates";
import { MOODS } from "@/lib/journal";
import { FormMessage } from "@/components/ui/form";
import { EmotionChips, MoodBadge } from "./mood";
import { openToday } from "./actions";

export const metadata: Metadata = { title: "Journal" };

const PAGE_SIZE = 10;

export default async function JournalPage({ searchParams }: PageProps<"/app/journal">) {
  const user = await requireUser();
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  const q = first(params.q).trim().slice(0, 100);
  const moodParam = Number(first(params.mood));
  const mood = moodParam >= 1 && moodParam <= 5 ? moodParam : undefined;
  const page = Math.max(1, Number(first(params.page)) || 1);

  const where = {
    userId: user.id,
    ...(mood ? { moodScore: mood } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { content: { contains: q, mode: "insensitive" as const } },
            { emotions: { has: q.toLowerCase() } },
          ],
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where,
      orderBy: { entryDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, entryDate: true, title: true, moodScore: true, emotions: true, content: true, wordCount: true },
    }),
    prisma.journalEntry.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (mood) sp.set("mood", String(mood));
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/app/journal${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Journal</h1>
          <p className="mt-1 text-sm text-muted">
            {total} {total === 1 ? "entry" : "entries"}
            {q || mood ? " matching your filters" : ""}
          </p>
        </div>
        <form action={openToday}>
          <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Write today&apos;s entry
          </button>
        </form>
      </div>

      <FormMessage tone="success" message={params.deleted ? "Entry deleted." : undefined} />

      <form className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end" method="get">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="q" className="text-sm font-medium">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Words, titles, or an emotion"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="mood" className="text-sm font-medium">
            Mood
          </label>
          <select
            id="mood"
            name="mood"
            defaultValue={mood ?? ""}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Any</option>
            {MOODS.map((m) => (
              <option key={m.score} value={m.score}>
                {m.emoji} {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/40">
            Filter
          </button>
          {q || mood ? (
            <Link href="/app/journal" className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground">
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted">
          {q || mood ? "Nothing matches those filters." : "No entries yet. Your first reflection is one click away."}
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((e) => {
            const day = dateToDay(e.entryDate);
            const excerpt = e.content.length > 180 ? `${e.content.slice(0, 180).trimEnd()}…` : e.content;
            return (
              <li key={e.id}>
                <Link href={`/app/journal/${e.id}`} className="block rounded-xl border border-border bg-card p-4 transition hover:border-primary/60">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{formatDay(day)}</span>
                    <MoodBadge score={e.moodScore} />
                  </div>
                  {e.title ? <h2 className="mt-2 font-medium">{e.title}</h2> : null}
                  <p className="mt-1 text-sm leading-relaxed text-muted">{excerpt}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <EmotionChips emotions={e.emotions} />
                    <span className="text-xs text-muted">{e.wordCount} words</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 ? (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? (
            <Link href={link(page - 1)} className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent/40">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={link(page + 1)} className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent/40">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
