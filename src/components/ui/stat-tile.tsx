import type { ReactNode } from "react";

export function StatTile({ label, value, detail, children }: { label: string; value: ReactNode; detail?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      {detail ? <p className="text-xs text-muted">{detail}</p> : null}
      {children}
    </div>
  );
}

/** Tiny 14-point sparkline; nulls are gaps. */
export function Sparkline({ points, min = 1, max = 5 }: { points: (number | null)[]; min?: number; max?: number }) {
  const w = 120;
  const h = 28;
  const n = points.length;
  const step = n > 1 ? w / (n - 1) : w;
  const y = (v: number) => h - 3 - ((v - min) / (max - min)) * (h - 6);

  let d = "";
  let pen = false;
  points.forEach((p, i) => {
    if (p === null) {
      pen = false;
      return;
    }
    d += `${pen ? "L" : "M"}${(i * step).toFixed(1)},${y(p).toFixed(1)} `;
    pen = true;
  });
  const last = [...points].reverse().find((p) => p !== null);
  const lastIndex = last === undefined ? -1 : points.lastIndexOf(last);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="mt-1 overflow-visible" aria-hidden>
      <path d={d.trim()} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      {lastIndex >= 0 && last != null ? <circle cx={lastIndex * step} cy={y(last)} r={4} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} /> : null}
    </svg>
  );
}
