import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { dateToDay, dayToDate, formatDay } from "@/lib/dates";
import { getDashboardStats } from "@/lib/stats";
import { getLastWeekRecap } from "@/lib/recap";
import { WeeklyRecapCard } from "@/components/weekly-recap-card";
import { moodInfo } from "@/lib/journal";
import { Sparkline, StatTile } from "@/components/ui/stat-tile";
import { MoodBadge } from "./journal/mood";
import { openToday } from "./journal/actions";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AppHome() {
  const user = await requireUser();
  const firstName = user.name?.split(" ")[0] ?? "there";

  const [stats, recap] = await Promise.all([getDashboardStats(user.id, user.timezone), getLastWeekRecap(user.id, user.timezone, user.name)]);
  const today = stats.today;

  const [todayEntry, recent, todayCheckIn] = await Promise.all([
    prisma.journalEntry.findUnique({
      where: { userId_entryDate: { userId: user.id, entryDate: dayToDate(today) } },
      select: { id: true, moodScore: true, title: true },
    }),
    prisma.journalEntry.findMany({
      where: { userId: user.id },
      orderBy: { entryDate: "desc" },
      take: 5,
      select: { id: true, entryDate: true, moodScore: true, title: true, wordCount: true },
    }),
    prisma.checkIn.findUnique({
      where: { userId_checkDate: { userId: user.id, checkDate: dayToDate(today) } },
      select: { moodScore: true, energy: true },
    }),
  ]);

  const streak = stats.journalStreak.current;
  const streakLine =
    streak === 0
      ? "Start a streak with today's entry."
      : todayEntry
        ? `Nice — ${streak} ${streak === 1 ? "day" : "days"} in a row.`
        : `Write today to make it ${streak + 1}.`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Hello, {firstName} 👋</h1>
          <p className="mt-1 text-muted">{formatDay(today, { weekday: "long", month: "long", day: "numeric" })}</p>
        </div>
        <div className="text-right">
          <p className="text-5xl font-semibold leading-none tracking-tight">
            {streak}
            <span className="ml-1 text-base font-normal text-muted">day streak</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            {streakLine} Best: {stats.journalStreak.longest}.{stats.journalStreak.restDayUsedThisWeek ? " Rest day used this week." : ""}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-primary/40 bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {todayCheckIn ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>
                {moodInfo(todayCheckIn.moodScore).emoji}
              </span>
              <div>
                <p className="font-medium">Checked in: {moodInfo(todayCheckIn.moodScore).label}</p>
                <p className="text-sm text-muted">Mood {todayCheckIn.moodScore}/5{todayCheckIn.energy ? ` · ${["low", "medium", "high"][todayCheckIn.energy - 1]} energy` : ""}</p>
              </div>
            </div>
          ) : (
            <div>
              <p className="font-medium">Daily check-in</p>
              <p className="text-sm text-muted">Mood meter, what shaped it, habits and goals — about a minute.</p>
            </div>
          )}
          <Link
            href="/app/checkin"
            className={`rounded-lg px-4 py-2 text-sm font-medium ${todayCheckIn ? "border border-border hover:bg-accent/40" : "bg-primary text-primary-foreground hover:opacity-90"}`}
          >
            {todayCheckIn ? "View check-in" : "Check in now"}
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        {todayEntry ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Today&apos;s reflection is in.</p>
              <div className="mt-1 flex items-center gap-2">
                <MoodBadge score={todayEntry.moodScore} />
                {todayEntry.title ? <span className="font-medium">{todayEntry.title}</span> : null}
              </div>
            </div>
            <Link href={`/app/journal/${todayEntry.id}`} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/40">
              Open entry
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">How are you feeling today?</p>
              <p className="text-sm text-muted">A few honest sentences is plenty.</p>
            </div>
            <form action={openToday}>
              <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                Write today&apos;s entry
              </button>
            </form>
          </div>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Mood, last 30 days"
          value={stats.avgMood30 !== null ? `${stats.avgMood30} / 5` : "—"}
          detail={
            stats.avgMood30 === null
              ? "No entries yet"
              : stats.moodDelta === null
                ? moodInfo(Math.round(stats.avgMood30)).label
                : `${stats.moodDelta > 0 ? "▲" : stats.moodDelta < 0 ? "▼" : "•"} ${Math.abs(stats.moodDelta)} vs previous 30 days`
          }
        >
          <Sparkline points={stats.sparkline} />
        </StatTile>
        <StatTile label="Entries this month" value={stats.entriesThisMonth} detail={`of ${stats.daysThisMonth} ${stats.daysThisMonth === 1 ? "day" : "days"} so far`} />
        <StatTile
          label="Habits today"
          value={stats.habits.total ? `${stats.habits.doneToday} / ${stats.habits.total}` : "—"}
          detail={
            stats.habits.total ? (
              <Link href="/app/habits" className="hover:underline">
                {stats.habits.doneToday === stats.habits.total ? "All done — nice." : "Check in →"}
              </Link>
            ) : (
              <Link href="/app/habits" className="hover:underline">
                Add a habit →
              </Link>
            )
          }
        />
        <StatTile
          label="Active goals"
          value={stats.goals.active}
          detail={
            <Link href="/app/goals" className="hover:underline">
              {stats.goals.active ? `${stats.goals.avgProgress}% average progress` : stats.goals.completed ? `${stats.goals.completed} completed` : "Set a goal →"}
            </Link>
          }
        />
      </section>

      {recap ? <WeeklyRecapCard recap={recap} /> : null}

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Recent reflections</h2>
          <div className="flex gap-4 text-sm">
            <Link href="/app/trends" className="text-muted hover:text-foreground">
              Trends
            </Link>
            <Link href="/app/journal" className="text-muted hover:text-foreground">
              View all
            </Link>
          </div>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">Your reflections will appear here.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {recent.map((e) => (
              <li key={e.id}>
                <Link href={`/app/journal/${e.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-accent/30">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 text-muted">{formatDay(dateToDay(e.entryDate), { month: "short", day: "numeric" })}</span>
                    <span className="truncate">{e.title ?? "Untitled"}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="hidden text-xs text-muted sm:inline">{e.wordCount} words</span>
                    <MoodBadge score={e.moodScore} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
