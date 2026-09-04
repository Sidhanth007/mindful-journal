import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addDays, dateToDay, dayToDate, formatDay, todayInTimezone } from "@/lib/dates";
import { COMPANION_KINDS, DAILY_LIMIT, KIND_TITLES, type CompanionKind } from "@/lib/companion";
import { CompanionForm } from "./companion-form";
import { deleteInteraction } from "./actions";

export const metadata: Metadata = { title: "Companion" };

export default async function CompanionPage({ searchParams }: PageProps<"/app/companion">) {
  const user = await requireUser();
  const params = await searchParams;
  const today = todayInTimezone(user.timezone);
  const configured = Boolean(process.env.GEMINI_API_KEY);

  const entryId = typeof params.entry === "string" ? params.entry : null;
  const requestedKind = typeof params.kind === "string" && COMPANION_KINDS.some((k) => k.kind === params.kind) ? (params.kind as CompanionKind) : undefined;

  const [count7, count30, entry, history, usedToday] = await Promise.all([
    prisma.journalEntry.count({ where: { userId: user.id, entryDate: { gte: dayToDate(addDays(today, -6)) } } }),
    prisma.journalEntry.count({ where: { userId: user.id, entryDate: { gte: dayToDate(addDays(today, -29)) } } }),
    entryId ? prisma.journalEntry.findFirst({ where: { id: entryId, userId: user.id }, select: { id: true, entryDate: true, title: true } }) : null,
    prisma.aiInteraction.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10, select: { id: true, kind: true, response: true, entryIds: true, createdAt: true } }),
    prisma.aiInteraction.count({ where: { userId: user.id, createdAt: { gte: dayToDate(today) } } }),
  ]);

  const entryOption = entry ? { id: entry.id, label: entry.title ?? formatDay(dateToDay(entry.entryDate), { month: "short", day: "numeric" }) } : null;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Companion</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          A supportive AI that reads only the entries you choose and reflects back with warmth. It is not a therapist, a diagnosis, or an emergency service — if you&apos;re in crisis, please contact local emergency services or a helpline.
        </p>
      </div>

      {!configured ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">
          The companion isn&apos;t configured yet — add <code className="rounded bg-accent/50 px-1">GEMINI_API_KEY</code> to <code className="rounded bg-accent/50 px-1">.env.local</code> and restart the server.
        </p>
      ) : null}

      <CompanionForm
        scopes={[
          { value: "7", label: "Last 7 days", count: count7 },
          { value: "30", label: "Last 30 days", count: count30 },
        ]}
        entryOption={entryOption}
        initialKind={requestedKind}
      />

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Earlier responses</h2>
          <span className="text-xs text-muted">
            {usedToday} of {DAILY_LIMIT} used today
          </span>
        </div>
        {history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">Responses you ask for will be kept here.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {history.map((h) => (
              <li key={h.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>
                    <span className="font-medium text-foreground">{KIND_TITLES[h.kind] ?? h.kind}</span> ·{" "}
                    {new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(h.createdAt)} · {h.entryIds.length} {h.entryIds.length === 1 ? "entry" : "entries"}
                  </span>
                  <form action={deleteInteraction}>
                    <input type="hidden" name="id" value={h.id} />
                    <button type="submit" className="rounded-lg px-2 py-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40">
                      Delete
                    </button>
                  </form>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm">{h.response.slice(0, 140).replace(/\s+/g, " ")}{h.response.length > 140 ? "…" : ""}</summary>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{h.response}</div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted">
        Want to reflect on a specific day?{" "}
        <Link href="/app/journal" className="underline hover:text-foreground">
          Open it from your journal
        </Link>{" "}
        and choose “Reflect with the companion”.
      </p>
    </div>
  );
}
