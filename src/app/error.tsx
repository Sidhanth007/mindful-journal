"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="text-6xl" aria-hidden>
        🌧️
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="max-w-sm text-sm text-muted">
        The page hit an unexpected error. Your data is safe — try again, and if it keeps happening, let us know.
        {error.digest ? <span className="mt-1 block font-mono text-[11px]">ref {error.digest}</span> : null}
      </p>
      <div className="flex gap-3">
        <button type="button" onClick={reset} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          Try again
        </button>
        <Link href="/app" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/40">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
