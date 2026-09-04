import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { dateToDay, todayInTimezone } from "@/lib/dates";
import { GoalCard, NewGoalForm, type GoalView } from "./goal-forms";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage() {
  const user = await requireUser();
  const today = todayInTimezone(user.timezone);

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { targetDate: "asc" }, { createdAt: "asc" }],
  });

  const views: GoalView[] = goals.map((g) => {
    const targetDate = g.targetDate ? dateToDay(g.targetDate) : null;
    return {
      id: g.id,
      title: g.title,
      description: g.description,
      targetDate,
      progress: g.progress,
      status: g.status,
      overdue: Boolean(targetDate && targetDate < today && g.status === "ACTIVE"),
    };
  });

  const active = views.filter((g) => g.status === "ACTIVE");
  const paused = views.filter((g) => g.status === "PAUSED");
  const completed = views.filter((g) => g.status === "COMPLETED");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="mt-1 text-sm text-muted">
          {views.length === 0 ? "Pick something meaningful and break it into steps you can see progress on." : `${active.length} active · ${completed.length} completed`}
        </p>
      </div>

      {active.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {active.map((g) => (
            <GoalCard key={g.id} goal={g} />
          ))}
        </ul>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-medium">Add a goal</h2>
        <NewGoalForm />
      </section>

      {paused.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">Paused</h2>
          <ul className="flex flex-col gap-3">
            {paused.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </ul>
        </section>
      ) : null}

      {completed.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted">Completed</h2>
          <ul className="flex flex-col gap-3">
            {completed.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
