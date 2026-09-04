"use client";

import { useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";
const KEY = "mj-theme";
const EVENT = "mj-theme-change";

function read(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(pref: ThemePref) {
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function setPref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* private mode etc. — still apply for this page */
  }
  apply(pref);
  window.dispatchEvent(new Event(EVENT));
}

const OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀️" },
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "system", label: "Auto", icon: "◐" },
];

/** Inline in <head> so the stored choice applies before first paint (no flash). */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const pref = useSyncExternalStore(subscribe, read, () => "system" as ThemePref);

  return (
    <div role="radiogroup" aria-label="Theme" className={`inline-flex rounded-lg border border-border bg-background p-0.5 ${compact ? "text-xs" : "text-sm"}`}>
      {OPTIONS.map((o) => {
        const on = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.label}
            onClick={() => setPref(o.value)}
            className={`flex items-center gap-1 rounded-md px-2 py-1 transition ${on ? "bg-accent font-medium text-foreground" : "text-muted hover:text-foreground"}`}
          >
            <span aria-hidden>{o.icon}</span>
            {compact ? <span className="sr-only">{o.label}</span> : o.label}
          </button>
        );
      })}
    </div>
  );
}
