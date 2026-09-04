import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addDays, DAY_RE, dayToDate, todayInTimezone } from "@/lib/dates";
import { promptForDay, TEMPLATES, templateByKey } from "@/lib/journal";
import { EntryForm } from "../entry-form";

export const metadata: Metadata = { title: "New entry" };

export default async function NewEntryPage({ searchParams }: PageProps<"/app/journal/new">) {
  const user = await requireUser();
  const params = await searchParams;
  const today = todayInTimezone(user.timezone);
  const requested = typeof params.date === "string" && DAY_RE.test(params.date) ? params.date : today;
  const template = templateByKey(typeof params.template === "string" ? params.template : null);

  // Pre-fill the mood from that day's check-in so it's only entered once.
  const checkIn = await prisma.checkIn.findUnique({
    where: { userId_checkDate: { userId: user.id, checkDate: dayToDate(requested) } },
    select: { moodScore: true },
  });

  const linkFor = (key?: string) => `/app/journal/new?date=${requested}${key ? `&template=${key}` : ""}`;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New reflection</h1>
        <p className="mt-1 text-sm text-muted">One entry per day. Take your time — there are no wrong answers.</p>
      </div>

      <section className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Start from</p>
        <div className="flex flex-wrap gap-2">
          <Link href={linkFor()} aria-current={!template ? "true" : undefined} className={`rounded-full border px-3 py-1.5 text-sm transition ${!template ? "border-primary bg-accent/70" : "border-border bg-background text-muted hover:border-primary/60"}`}>
            Free write
          </Link>
          {TEMPLATES.map((t) => (
            <Link key={t.key} href={linkFor(t.key)} title={t.blurb} aria-current={template?.key === t.key ? "true" : undefined} className={`rounded-full border px-3 py-1.5 text-sm transition ${template?.key === t.key ? "border-primary bg-accent/70" : "border-border bg-background text-muted hover:border-primary/60"}`}>
              {t.title}
            </Link>
          ))}
        </div>
        {template ? <p className="text-xs text-muted">{template.blurb}</p> : null}
      </section>

      <EntryForm
        key={template?.key ?? "free"}
        initial={{ entryDate: requested, title: template?.title ?? "", moodScore: checkIn?.moodScore, emotions: [], content: template?.scaffold ?? "", gratitude: "", template: template?.key ?? "" }}
        maxDate={addDays(today, 1)}
        prompt={template ? undefined : promptForDay(requested)}
      />
    </div>
  );
}
