import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Mindful Journal
          </Link>
          <ThemeToggle compact />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-6 py-12">
        {children}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto w-full max-w-5xl px-6 py-4 text-xs text-muted">
          A supportive wellness tool — not a substitute for professional care.
        </div>
      </footer>
    </div>
  );
}
