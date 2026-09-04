import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { addDays, dateToDay, dayToDate, formatDay, todayInTimezone } from "@/lib/dates";
import { computeStreaks } from "@/lib/streaks";
import { HabitCard, type HabitView } from "./habit-card";
import { HabitForm } from "./habit-form";

export const metadata: Metadata = { title: "Habits" };

export default async function HabitsPage() {
  const user = await requireUser();
  const today = todayInTimezone(user.timezone);
  // Current calendar week, Monday → Sunday.
  const dow = (dayToDate(today).getUTCDay() + 6) % 7; // Mon = 0
  const weekStart = addDays(today, -dow);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayLabels = days.map((d) => formatDay(d, { weekday: "short" }).slice(0, 3));

  const habits = await prisma.habit.findMany({
    where: { userId: user.id },
    orderBy: [{ isArchived: "asc" }, { createdAt: "asc" }],
    include: {
      // All completed logs are needed so the longest streak is accurate.
      logs: { where: { completed: true }, select: { logDate: true } },
    },
  });

  const views: HabitView[] = habits.map((h) => {
    const doneDays = h.logs.map((l) => dateToDay(l.logDate));
    const { current, longest, forgiven, restDayUsedThisWeek } = computeStreaks(doneDays, today);
    return {
      id: h.id,
      name: h.name,
      description: h.description,
      icon: h.icon,
      isArchived: h.isArchived,
      doneDays: doneDays.filter((d) => days.includes(d)),
      forgivenDays: forgiven.filter((d) => days.includes(d)),
      restDayUsedThisWeek,
      current,
      longest,
    };
  });

  const active = views.filter((h) => !h.isArchived);
  const archived = views.filter((h) => h.isArchived);
  const doneToday = active.filter((h) => h.doneDays.includes(today)).length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Habits</h1>
        <p className="mt-1 text-sm text-muted">
          {active.length === 0
            ? "Small, repeatable actions add up. Add your first habit below."
            : `${doneToday} of ${active.length} done today · week of ${formatDay(weekStart, { month: "short", day: "numeric" })}. Tap a day to check it off. One missed day a week is forgiven (shown as ◌).`}
        </p>
      </div>

      {active.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {active.map((h) => (
            <HabitCard key={h.id} habit={h} days={days} today={today} dayLabels={dayLabels} />
          ))}
        </ul>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-medium">Add a habit</h2>
        <HabitForm />
      </section>

      {archived.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">Archived</h2>
          <ul className="flex flex-col gap-3 opacity-80">
            {archived.map((h) => (
              <HabitCard key={h.id} habit={h} days={days} today={today} dayLabels={dayLabels} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
