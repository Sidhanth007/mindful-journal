import type { Metadata } from "next";
import { requireAdmin } from "@/lib/session";
import { getAdminOverview } from "@/lib/admin-stats";
import { StatTile } from "@/components/ui/stat-tile";
import { moodInfo } from "@/lib/journal";

export const metadata: Metadata = { title: "Admin overview" };

function Bars({ rows, max, color = "bg-chart-1" }: { rows: { label: string; value: number; aria?: string }[]; max: number; color?: string }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[72px_1fr_40px] items-center gap-3 text-xs">
          <span className="text-muted">{r.label}</span>
          <div className="h-2 overflow-hidden rounded-full bg-border" role="img" aria-label={r.aria ?? `${r.label}: ${r.value}`}>
            <div className={`h-full rounded-full ${color}`} style={{ width: `${max ? Math.round((r.value / max) * 100) : 0}%` }} />
          </div>
          <span className="text-right tabular-nums">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const o = await getAdminOverview();
  const fmt = (n: number) => n.toLocaleString();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted">Aggregate application analytics. Nothing here identifies what any user wrote.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">Users</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Total accounts" value={fmt(o.users.total)} detail={`${o.users.verified} verified · ${o.users.admins} admin`} />
          <StatTile label="New this week" value={fmt(o.users.newThisWeek)} />
          <StatTile label="Active, last 7 days" value={fmt(o.users.active7)} detail={`${o.users.active30} in the last 30 days`} />
          <StatTile label="Suspended" value={fmt(o.users.suspended)} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">Content</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Journal entries" value={fmt(o.content.entries)} detail={o.content.avgWords ? `${o.content.avgWords} words on average` : undefined} />
          <StatTile label="Check-ins" value={fmt(o.content.checkIns)} />
          <StatTile label="Active habits" value={fmt(o.content.habits)} detail={`${fmt(o.content.habitLogs)} check-offs`} />
          <StatTile label="Goals" value={fmt(o.content.goals)} detail={`${o.content.goalsCompleted} completed`} />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-muted">AI companion</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Responses, all time" value={fmt(o.ai.responses)} detail={`${o.ai.responses7} in the last 7 days`} />
          <StatTile label="Input tokens" value={fmt(o.ai.inputTokens)} />
          <StatTile label="Output tokens" value={fmt(o.ai.outputTokens)} />
          <StatTile label="Failed, last 7 days" value={fmt(o.ai.failed7)} detail="provider errors / limits" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-medium">Sign-ups per week</h2>
          <Bars rows={o.signupsByWeek.map((w) => ({ label: w.label, value: w.count }))} max={Math.max(1, ...o.signupsByWeek.map((w) => w.count))} />
        </section>
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-medium">Entries + check-ins per day</h2>
          <Bars
            rows={o.activityByDay.map((d) => ({ label: d.label, value: d.entries + d.checkIns, aria: `${d.label}: ${d.entries} entries, ${d.checkIns} check-ins` }))}
            max={Math.max(1, ...o.activityByDay.map((d) => d.entries + d.checkIns))}
          />
        </section>
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-medium">Mood mix (all entries)</h2>
          <Bars rows={o.moodMix.map((m) => ({ label: `${moodInfo(m.score).emoji} ${moodInfo(m.score).label}`, value: m.count }))} max={Math.max(1, ...o.moodMix.map((m) => m.count))} />
        </section>
      </div>
    </div>
  );
}
