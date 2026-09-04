import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Admin · Audit log" };

const PAGE_SIZE = 50;

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  await requireAdmin();
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const action = first(params.action).slice(0, 60);
  const page = Math.max(1, Number(first(params.page)) || 1);

  const where = action ? { action: action.endsWith(".") ? { startsWith: action } : action } : {};

  const [rows, total, actions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, action: true, ip: true, metadata: true, createdAt: true, user: { select: { email: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => `/admin/audit?${new URLSearchParams({ ...(action ? { action } : {}), ...(p > 1 ? { page: String(p) } : {}) }).toString()}`;
  const fmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-muted">{total} events. Records that something happened — never what was written.</p>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="action" className="text-sm font-medium">
            Action
          </label>
          <select id="action" name="action" defaultValue={action} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30">
            <option value="">All</option>
            <option value="user.">All user.*</option>
            <option value="admin.">All admin.*</option>
            <option value="ai.">All ai.*</option>
            {actions.map((a) => (
              <option key={a.action} value={a.action}>
                {a.action}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/40">
          Filter
        </button>
        {action ? (
          <Link href="/admin/audit" className="px-2 py-2 text-sm text-muted hover:text-foreground">
            Clear
          </Link>
        ) : null}
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-3 py-2.5 font-medium">Action</th>
              <th className="px-3 py-2.5 font-medium">Account</th>
              <th className="px-3 py-2.5 font-medium">IP</th>
              <th className="px-4 py-2.5 font-medium">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No events.
                </td>
              </tr>
            ) : null}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-muted">{fmt.format(r.createdAt)}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                <td className="px-3 py-2 text-xs">{r.user?.email ?? <span className="text-muted">—</span>}</td>
                <td className="px-3 py-2 font-mono text-xs text-muted">{r.ip ?? "—"}</td>
                <td className="px-4 py-2 font-mono text-[11px] text-muted">{r.metadata ? JSON.stringify(r.metadata) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? (
            <Link href={link(page - 1)} className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent/40">
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={link(page + 1)} className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent/40">
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </div>
  );
}
