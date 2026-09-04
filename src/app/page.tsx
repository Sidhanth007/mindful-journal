import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const features = [
  { icon: "🎚️", title: "Daily check-in", body: "A mood meter, what shaped the day, and a quick look at habits and goals — about a minute." },
  { icon: "📓", title: "Reflection journal", body: "Write freely, tag emotions, note one thing you're grateful for. One entry per day, all yours." },
  { icon: "✅", title: "Habits & goals", body: "Small repeatable actions with streaks, and goals you can see progress on." },
  { icon: "📈", title: "Trends", body: "Mood over time, what tends to help and what makes days harder, your most common emotions." },
  { icon: "💬", title: "A supportive companion", body: "AI reflections, gentle questions, self-care ideas and journaling prompts — based only on what you choose to share." },
  { icon: "🔒", title: "Private by design", body: "Your writing is readable only by you. Export or delete everything, any time." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight">Mindful Journal</span>
          <nav className="flex items-center gap-2 text-sm">
            <ThemeToggle compact />
            <Link href="/login" className="rounded-lg px-3 py-1.5 hover:bg-accent/40">
              Log in
            </Link>
            <Link href="/register" className="rounded-lg bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:opacity-90">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16">
        <section className="flex flex-col gap-5">
          <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">A calm place to notice how you&apos;re doing — and take care of yourself.</h1>
          <p className="max-w-2xl text-lg text-muted">
            Mindful Journal is a mental-fitness companion: a one-minute daily check-in, a private journal, habits and goals, trends over time, and a supportive AI that reflects back only what you choose to share.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/register" className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              Create a free account
            </Link>
            <Link href="/login" className="rounded-lg border border-border px-5 py-2.5 text-sm hover:bg-accent/40">
              I already have one
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="rounded-xl border border-border bg-card p-5">
              <div className="text-2xl" aria-hidden>
                {f.icon}
              </div>
              <h2 className="mt-2 font-medium">{f.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">{f.body}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 rounded-xl border border-border bg-card p-6 sm:grid-cols-2">
          <div>
            <h2 className="font-medium">How your data is handled</h2>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm leading-relaxed text-muted">
              <li>• Journal text and check-in notes are readable only by you.</li>
              <li>• The AI companion sees only the entries you pick, for one response at a time.</li>
              <li>• The admin sees counts and account status — never your writing.</li>
              <li>• Export everything as JSON or delete your account and all its data from Settings.</li>
            </ul>
          </div>
          <div>
            <h2 className="font-medium">What this is — and isn&apos;t</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Mindful Journal and its AI companion are supportive wellness tools. They are <strong className="text-foreground">not</strong> a replacement for a mental-health professional, a diagnosis, or emergency services. If you are in crisis or thinking about harming yourself, please contact your local emergency number or a crisis line right away — for example{" "}
              <strong className="text-foreground">988</strong> (US), <strong className="text-foreground">116 123</strong> (UK &amp; Ireland), <strong className="text-foreground">9152987821</strong> (iCall, India), or{" "}
              <a href="https://findahelpline.com" className="underline" target="_blank" rel="noopener noreferrer">
                findahelpline.com
              </a>
              .
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-muted">
          <span>Mindful Journal · demo build</span>
          <span>A supportive wellness tool — not a substitute for professional care.</span>
        </div>
      </footer>
    </div>
  );
}
