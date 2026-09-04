import Link from "next/link";
import { requireUser } from "@/lib/session";
import { BottomTabs, TopNav } from "./nav";
import { UserMenu } from "./user-menu";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/app" className="shrink-0 text-base font-semibold tracking-tight">
              Mindful Journal
            </Link>
            <TopNav isAdmin={isAdmin} />
          </div>
          <UserMenu name={user.name} email={user.email} isAdmin={isAdmin} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:px-6 sm:py-8 sm:pb-8">{children}</main>
      <BottomTabs isAdmin={isAdmin} />
    </div>
  );
}
