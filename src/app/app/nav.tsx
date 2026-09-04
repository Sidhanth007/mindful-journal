"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Item = { href: string; label: string; icon: string; exact?: boolean };

const PRIMARY: Item[] = [
  { href: "/app", label: "Home", icon: "🏠", exact: true },
  { href: "/app/checkin", label: "Check-in", icon: "🎚️" },
  { href: "/app/journal", label: "Journal", icon: "📓" },
  { href: "/app/habits", label: "Habits", icon: "✅" },
];

const SECONDARY: Item[] = [
  { href: "/app/goals", label: "Goals", icon: "🎯" },
  { href: "/app/trends", label: "Trends", icon: "📈" },
  { href: "/app/companion", label: "Companion", icon: "💬" },
];

function isActive(pathname: string, item: Item) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

/** Desktop / tablet: a single tight row of links under the wordmark row. */
export function TopNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = [...PRIMARY, ...SECONDARY, ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: "🛠️" }] : [])];

  return (
    <nav className="hidden items-center gap-0.5 sm:flex" aria-label="Main">
      {items.map((l) => {
        const active = isActive(pathname, l);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-[13px] transition ${
              active ? "bg-accent/70 font-medium text-foreground" : "text-muted hover:bg-accent/40 hover:text-foreground"
            }`}
          >
            {l.label === "Home" ? "Dashboard" : l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Mobile: bottom tab bar with a "More" sheet for the rest. */
export function BottomTabs({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const more = [...SECONDARY, ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: "🛠️" }] : [])];
  const moreActive = more.some((l) => isActive(pathname, l));

  return (
    <>
      {open ? <button type="button" aria-label="Close menu" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/30 sm:hidden" /> : null}
      {open ? (
        <div className="fixed inset-x-0 bottom-14 z-40 mx-3 rounded-xl border border-border bg-card p-2 shadow-lg sm:hidden" role="menu">
          {more.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${isActive(pathname, l) ? "bg-accent/70 font-medium" : "hover:bg-accent/40"}`}
            >
              <span aria-hidden>{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </div>
      ) : null}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid h-14 grid-cols-5 border-t border-border bg-card sm:hidden" aria-label="Main">
        {PRIMARY.map((l) => {
          const active = isActive(pathname, l);
          return (
            <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${active ? "font-medium text-primary" : "text-muted"}`}>
              <span className="text-lg leading-none" aria-hidden>
                {l.icon}
              </span>
              {l.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${moreActive || open ? "font-medium text-primary" : "text-muted"}`}
        >
          <span className="text-lg leading-none" aria-hidden>
            ⋯
          </span>
          More
        </button>
      </nav>
    </>
  );
}
