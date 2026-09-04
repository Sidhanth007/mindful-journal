import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-6xl" aria-hidden>
        🍃
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">That page isn&apos;t here</h1>
      <p className="max-w-sm text-sm text-muted">It may have been moved or deleted, or the link was mistyped. Nothing of yours is lost.</p>
      <div className="flex gap-3">
        <Link href="/app" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Go to dashboard
        </Link>
        <Link href="/" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/40">
          Home
        </Link>
      </div>
    </div>
  );
}
