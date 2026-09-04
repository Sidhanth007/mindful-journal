import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { FormMessage } from "@/components/ui/form";
import { deleteUser, setUserStatus } from "./actions";

export const metadata: Metadata = { title: "Admin · Users" };

const PAGE_SIZE = 25;

export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  const admin = await requireAdmin();
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = first(params.q).trim().slice(0, 100);
  const status = first(params.status);
  const page = Math.max(1, Number(first(params.page)) || 1);

  const statusFilter: "ACTIVE" | "SUSPENDED" | undefined = status === "SUSPENDED" ? "SUSPENDED" : status === "ACTIVE" ? "ACTIVE" : undefined;
  const where = {
    ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(status === "UNVERIFIED" ? { emailVerified: null } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        createdAt: true,
        lastActiveAt: true,
        _count: { select: { journalEntries: true, checkIns: true, aiInteractions: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const fmtDate = (d: Date | null) => (d ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(d) : "—");
  const link = (p: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return `/admin/users${s ? `?${s}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted">
          {total} {total === 1 ? "account" : "accounts"}
          {q || status ? " matching your filters" : ""}
        </p>
      </div>

      <FormMessage tone="success" message={first(params.ok) || undefined} />
      <FormMessage message={first(params.error) || undefined} />

      <form method="get" className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="q" className="text-sm font-medium">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Email or name" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select id="status" name="status" defaultValue={status} className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30">
            <option value="">Any</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="UNVERIFIED">Unverified</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/40">
            Filter
          </button>
          {q || status ? (
            <Link href="/admin/users" className="rounded-lg px-3 py-2 text-sm text-muted hover:text-foreground">
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-3 py-2.5 font-medium">Status</th>
              <th className="px-3 py-2.5 font-medium text-right">Entries</th>
              <th className="px-3 py-2.5 font-medium text-right">Check-ins</th>
              <th className="px-3 py-2.5 font-medium text-right">AI</th>
              <th className="px-3 py-2.5 font-medium">Joined</th>
              <th className="px-3 py-2.5 font-medium">Last active</th>
              <th className="px-4 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  No accounts match.
                </td>
              </tr>
            ) : null}
            {users.map((u) => {
              const self = u.id === admin.id;
              const isAdmin = u.role === "ADMIN";
              return (
                <tr key={u.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name ?? "—"}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                    <div className="mt-1 flex gap-1">
                      {isAdmin ? <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-primary">Admin</span> : null}
                      {self ? <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">You</span> : null}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${u.status === "SUSPENDED" ? "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"}`}>
                      {u.status === "SUSPENDED" ? "Suspended" : "Active"}
                    </span>
                    <div className="mt-1 text-[11px] text-muted">{u.emailVerified ? "verified" : "unverified"}</div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{u._count.journalEntries}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{u._count.checkIns}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{u._count.aiInteractions}</td>
                  <td className="px-3 py-3 text-xs text-muted">{fmtDate(u.createdAt)}</td>
                  <td className="px-3 py-3 text-xs text-muted">{fmtDate(u.lastActiveAt)}</td>
                  <td className="px-4 py-3">
                    {self || isAdmin ? (
                      <span className="block text-right text-xs text-muted">protected</span>
                    ) : (
                      <div className="flex flex-col items-end gap-2">
                        <form action={setUserStatus}>
                          <input type="hidden" name="id" value={u.id} />
                          <input type="hidden" name="status" value={u.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"} />
                          <button type="submit" className="rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-accent/40">
                            {u.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                          </button>
                        </form>
                        <details className="text-right">
                          <summary className="cursor-pointer text-xs text-red-700 hover:underline dark:text-red-300">Delete…</summary>
                          <form action={deleteUser} className="mt-2 flex flex-col items-end gap-1.5">
                            <input type="hidden" name="id" value={u.id} />
                            <input name="confirm" placeholder="type the email to confirm" className="w-56 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-red-500" autoComplete="off" />
                            <button type="submit" className="rounded-lg border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40">
                              Delete account and all data
                            </button>
                          </form>
                        </details>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
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
