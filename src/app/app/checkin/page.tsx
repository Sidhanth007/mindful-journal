import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addDays, DAY_RE, dateToDay, dayToDate, formatDay, todayInTimezone } from "@/lib/dates";
import { computeStreaks } from "@/lib/streaks";
import { moodInfo } from "@/lib/journal";
import { FormMessage } from "@/components/ui/form";
import { ENERGY_LABELS, factorLabel, GOAL_STATUS_LABELS, type FactorEffect, type GoalCheckStatus } from "@/lib/checkin";
import { CheckInForm, type GoalOption, type HabitOption } from "./checkin-form";
import { ReflectPanel } from "./reflect-panel";

export const metadata: Metadata = { title: "Daily check-in" };

export default async function CheckInPage({ searchParams }: PageProps<"/app/checkin">) {
  const user = await requireUser();
  const params = await searchParams;
  const today = todayInTimezone(user.timezone);
  const requested = typeof params.date === "string" && DAY_RE.test(params.date) ? params.date : today;
  const day = requested > today ? today : requested < addDays(today, -7) ? today : requested;
  const editing = params.edit === "1";
  const saved = params.saved === "1";

  const [checkIn, habits, goals] = await Promise.all([
    prisma.checkIn.findUnique({ where: { userId_checkDate: { userId: user.id, checkDate: dayToDate(day) } } }),
    prisma.habit.findMany({ where: { userId: user.id, isArchived: false }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, icon: true, logs: { where: { completed: true }, select: { logDate: true } } } }),
    prisma.goal.findMany({ where: { userId: user.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, select: { id: true, title: true, progress: true } }),
  ]);

  const habitOptions: HabitOption[] = habits.map((h) => {
    const days = h.logs.map((l) => dateToDay(l.logDate));
    return { id: h.id, name: h.name, icon: h.icon, done: days.includes(day), streak: computeStreaks(days, day).current };
  });
  const goalOptions: GoalOption[] = goals.map((g) => ({ id: g.id, title: g.title, progress: g.progress }));

  const factors = (checkIn?.factors as unknown as { key: string; effect: FactorEffect }[] | undefined) ?? [];
  const statuses = (checkIn?.goalStatuses as Record<string, GoalCheckStatus> | undefined) ?? {};

  const title = day === today ? "Today's check-in" : `Check-in for ${formatDay(day, { weekday: "long", month: "long", day: "numeric" })}`;

  if (!checkIn || editing) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted">About a minute. No wrong answers.</p>
        </div>
        <CheckInForm
          initial={{
            checkDate: day,
            moodScore: checkIn?.moodScore ?? 3,
            energy: checkIn?.energy ?? null,
            factors,
            goalStatuses: statuses,
            note: checkIn?.note ?? "",
          }}
          habits={habitOptions}
          goals={goalOptions}
          isEdit={Boolean(checkIn)}
        />
      </div>
    );
  }

  const m = moodInfo(checkIn.moodScore);
  const helped = factors.filter((f) => f.effect === "helped");
  const hurt = factors.filter((f) => f.effect === "hurt");
  const doneCount = habitOptions.filter((h) => h.done).length;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <FormMessage tone="success" message={saved ? "Check-in saved." : undefined} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted">{formatDay(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
        </div>
        <Link href={`/app/checkin?date=${day}&edit=1`} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent/40">
          Edit
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <div className="text-4xl" aria-hidden>
            {m.emoji}
          </div>
          <p className="mt-1 font-medium">{m.label}</p>
          <p className="text-xs text-muted">mood {checkIn.moodScore}/5{checkIn.energy ? ` · ${ENERGY_LABELS[checkIn.energy - 1].toLowerCase()} energy` : ""}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:col-span-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">What shaped it</p>
          {factors.length === 0 ? <p className="mt-1 text-sm text-muted">Nothing marked.</p> : null}
          {helped.length ? <p className="mt-1 text-sm">👍 {helped.map((f) => factorLabel(f.key)).join(", ")}</p> : null}
          {hurt.length ? <p className="mt-1 text-sm">👎 {hurt.map((f) => factorLabel(f.key)).join(", ")}</p> : null}
          {checkIn.note ? <p className="mt-2 text-sm italic text-muted">“{checkIn.note}”</p> : null}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 text-sm">
        <p>
          <span className="font-medium">Habits:</span> {habitOptions.length ? `${doneCount} of ${habitOptions.length} done` : "none set up"}
          {habitOptions.length ? ` — ${habitOptions.map((h) => `${h.done ? "✓" : "○"} ${h.name}`).join(" · ")}` : ""}
        </p>
        {goalOptions.length ? (
          <p className="mt-2">
            <span className="font-medium">Goals:</span>{" "}
            {goalOptions.map((g) => `${g.title} (${statuses[g.id] ? GOAL_STATUS_LABELS[statuses[g.id]].toLowerCase() : "not rated"})`).join(" · ")}
          </p>
        ) : null}
      </section>

      <ReflectPanel checkDate={day} configured={Boolean(process.env.GEMINI_API_KEY)} />

      <p className="text-xs text-muted">
        Want to write more about today?{" "}
        <Link href={`/app/journal/new?date=${day}`} className="underline hover:text-foreground">
          Open the journal
        </Link>
        .
      </p>
    </div>
  );
}
