import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { UserMenu } from "@/app/app/user-menu";
import { AdminNav } from "./nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/admin" className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight">
              Mindful Journal
              <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-primary">Admin</span>
            </Link>
            <AdminNav />
          </div>
          <div className="flex items-center gap-3">
            <Link href="/app" className="hidden rounded-md px-2.5 py-1.5 text-[13px] text-muted hover:bg-accent/40 hover:text-foreground sm:inline">
              ← Back to app
            </Link>
            <UserMenu name={admin.name} email={admin.email} isAdmin />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-6xl px-6 py-3 text-xs text-muted">Admin views show aggregate and account data only. Journal text, check-in notes and AI responses are never displayed here.</div>
      </footer>
    </div>
  );
}
