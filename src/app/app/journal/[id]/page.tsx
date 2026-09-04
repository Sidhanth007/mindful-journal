import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addDays, dateToDay, formatDay, todayInTimezone } from "@/lib/dates";
import { FormMessage } from "@/components/ui/form";
import { templateByKey } from "@/lib/journal";
import { EntryForm } from "../entry-form";
import { EmotionChips, MoodBadge } from "../mood";
import { deleteEntry } from "../actions";

export const metadata: Metadata = { title: "Journal entry" };

export default async function EntryPage({ params, searchParams }: PageProps<"/app/journal/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;

  const entry = await prisma.journalEntry.findFirst({ where: { id, userId: user.id } });
  if (!entry) notFound();

  const day = dateToDay(entry.entryDate);
  const editing = query.edit === "1";

  if (editing) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit reflection</h1>
          <p className="mt-1 text-sm text-muted">{formatDay(day)}</p>
        </div>
        <EntryForm
          initial={{
            id: entry.id,
            entryDate: day,
            title: entry.title ?? "",
            moodScore: entry.moodScore,
            emotions: entry.emotions,
            content: entry.content,
            gratitude: entry.gratitude ?? "",
            template: entry.template ?? "",
          }}
          maxDate={addDays(todayInTimezone(user.timezone), 1)}
        />
      </div>
    );
  }

  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <FormMessage tone="success" message={query.saved ? "Entry saved." : undefined} />

      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{formatDay(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
          <MoodBadge score={entry.moodScore} size="lg" />
        </div>
        {entry.title ? <h1 className="text-2xl font-semibold tracking-tight">{entry.title}</h1> : null}
        <div className="flex flex-wrap items-center gap-2">
          {templateByKey(entry.template) ? <span className="rounded-full bg-accent px-2 py-0.5 text-xs text-muted">Template · {templateByKey(entry.template)!.title}</span> : null}
          <EmotionChips emotions={entry.emotions} />
        </div>
      </header>

      <div className="whitespace-pre-wrap rounded-xl border border-border bg-card p-5 text-sm leading-relaxed sm:text-base">{entry.content}</div>

      {entry.gratitude ? (
        <p className="rounded-xl border border-border bg-accent/30 p-4 text-sm">
          <span className="font-medium">Grateful for:</span> {entry.gratitude}
        </p>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>
          {entry.wordCount} words · last edited {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(entry.updatedAt)}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/app/companion?entry=${entry.id}`} className="rounded-lg border border-primary/50 px-3 py-1.5 text-sm text-primary hover:bg-accent/40">
            Reflect with the companion
          </Link>
          <Link href="/app/journal" className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent/40">
            All entries
          </Link>
          <Link href={`/app/journal/${entry.id}?edit=1`} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Edit
          </Link>
          <form action={deleteEntry}>
            <input type="hidden" name="id" value={entry.id} />
            <button
              type="submit"
              className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
              formNoValidate
            >
              Delete
            </button>
          </form>
        </div>
      </footer>
    </article>
  );
}
