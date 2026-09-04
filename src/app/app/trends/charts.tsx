"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { MoodBucket, MoodPoint, WeekPoint } from "@/lib/stats";
import { moodInfo } from "@/lib/journal";

const SERIES = "var(--chart-1)";
const GRID = "var(--border)";
const INK_MUTED = "var(--muted)";

function TooltipBox({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="font-medium">{title}</p>
      {rows.map(([k, v]) => (
        <p key={k} className="text-muted">
          {k}: <span className="text-foreground">{v}</span>
        </p>
      ))}
    </div>
  );
}

function DataTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-2 text-xs">
      <summary className="cursor-pointer text-muted hover:text-foreground">Show data table</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {head.map((h) => (
                <th key={h} className="border-b border-border py-1 pr-3 font-medium text-muted">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="border-b border-border py-1 pr-3 tabular-nums">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

const axisProps = { tick: { fill: INK_MUTED, fontSize: 11 }, axisLine: { stroke: GRID }, tickLine: false as const };

export function MoodLineChart({ data }: { data: MoodPoint[] }) {
  const logged = data.filter((d) => d.mood !== null);
  if (logged.length === 0) return <Empty text="No mood entries in this range yet." />;
  const tickEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div>
      <div className="h-56 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" interval={tickEvery - 1} {...axisProps} />
            <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tickFormatter={(v: number) => moodInfo(v).emoji} {...axisProps} />
            <Tooltip
              cursor={{ stroke: GRID }}
              content={(p) => {
                const d = p.payload?.[0]?.payload as MoodPoint | undefined;
                if (!d || d.mood === null) return null;
                const m = moodInfo(d.mood);
                return <TooltipBox title={d.label} rows={[["Mood", `${m.emoji} ${m.label} (${d.mood}/5)`], ...(d.title ? ([["Entry", d.title]] as [string, string][]) : [])]} />;
              }}
            />
            <Line type="monotone" dataKey="mood" stroke={SERIES} strokeWidth={2} strokeLinecap="round" connectNulls={false} dot={{ r: 4, fill: SERIES, stroke: "var(--card)", strokeWidth: 2 }} activeDot={{ r: 6, fill: SERIES, stroke: "var(--card)", strokeWidth: 2 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <DataTable caption="Mood by day" head={["Day", "Mood"]} rows={logged.map((d) => [d.label, `${d.mood}/5 ${moodInfo(d.mood!).label}`])} />
    </div>
  );
}

export function WeeklyBarChart({ data }: { data: WeekPoint[] }) {
  if (data.every((d) => d.entries === 0)) return <Empty text="No entries in this range yet." />;
  return (
    <div>
      <div className="h-48 w-full">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -20 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip
              cursor={{ fill: "var(--accent)", opacity: 0.4 }}
              content={(p) => {
                const d = p.payload?.[0]?.payload as WeekPoint | undefined;
                if (!d) return null;
                return <TooltipBox title={`Week of ${d.label}`} rows={[["Entries", String(d.entries)], ["Words", d.words.toLocaleString()]]} />;
              }}
            />
            <Bar dataKey="entries" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable caption="Entries per week" head={["Week of", "Entries", "Words"]} rows={data.map((d) => [d.label, d.entries, d.words])} />
    </div>
  );
}

export function MoodDistributionChart({ data }: { data: MoodBucket[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <Empty text="Nothing to show yet." />;
  const rows = data.map((d) => ({ ...d, label: `${moodInfo(d.score).emoji} ${moodInfo(d.score).label}` }));
  return (
    <div>
      <div className="h-48 w-full">
        <ResponsiveContainer>
          <BarChart data={rows} margin={{ top: 12, right: 12, bottom: 0, left: -20 }} barCategoryGap="30%">
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} />
            <Tooltip
              cursor={{ fill: "var(--accent)", opacity: 0.4 }}
              content={(p) => {
                const d = p.payload?.[0]?.payload as (MoodBucket & { label: string }) | undefined;
                if (!d) return null;
                return <TooltipBox title={d.label} rows={[["Days", String(d.count)], ["Share", `${Math.round((d.count / total) * 100)}%`]]} />;
              }}
            />
            <Bar dataKey="count" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable caption="Mood distribution" head={["Mood", "Days", "Share"]} rows={rows.map((d) => [d.label, d.count, `${Math.round((d.count / total) * 100)}%`])} />
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted">{text}</p>;
}
