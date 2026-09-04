"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/theme-toggle";

export function UserMenu({ name, email, isAdmin }: { name: string | null; email: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = (name?.trim()[0] ?? email[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground ring-offset-2 ring-offset-card transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {initial}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-card text-sm shadow-lg">
          <div className="border-b border-border px-3 py-2.5">
            <p className="truncate font-medium">{name ?? "Your account"}</p>
            <p className="truncate text-xs text-muted">{email}</p>
            {isAdmin ? <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-primary">Admin</span> : null}
          </div>
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs text-muted">Theme</span>
            <ThemeToggle compact />
          </div>
          <Link href="/app/settings" role="menuitem" onClick={() => setOpen(false)} className="block px-3 py-2 hover:bg-accent/40">
            Settings
          </Link>
          {isAdmin ? (
            <Link href="/admin" role="menuitem" onClick={() => setOpen(false)} className="block px-3 py-2 hover:bg-accent/40">
              Admin panel
            </Link>
          ) : null}
          <form action={logout}>
            <button type="submit" role="menuitem" className="block w-full px-3 py-2 text-left hover:bg-accent/40">
              Log out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
