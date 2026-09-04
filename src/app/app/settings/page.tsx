import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { FormMessage } from "@/components/ui/form";
import { DeleteAccountForm, PasswordForm, ProfileForm } from "./settings-forms";
import { deleteAiHistory, logOutEverywhere } from "./actions";

export const metadata: Metadata = { title: "Settings" };

function Section({ title, blurb, children, danger }: { title: string; blurb?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <section className={`rounded-xl border bg-card p-5 ${danger ? "border-red-200 dark:border-red-900" : "border-border"}`}>
      <h2 className="font-medium">{title}</h2>
      {blurb ? <p className="mb-4 mt-1 text-sm text-muted">{blurb}</p> : <div className="mb-4" />}
      {children}
    </section>
  );
}

export default async function SettingsPage({ searchParams }: PageProps<"/app/settings">) {
  const user = await requireUser();
  const params = await searchParams;
  const aiCount = await prisma.aiInteraction.count({ where: { userId: user.id } });

  let timezones: string[] = [];
  try {
    timezones = Intl.supportedValuesOf("timeZone");
  } catch {
    timezones = ["UTC", "Asia/Kolkata", "Europe/London", "America/New_York"];
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted">Your account, your data, your rules.</p>
      </div>

      <FormMessage tone="success" message={params.ok === "ai" ? "All AI responses deleted." : undefined} />

      <Section title="Profile">
        <ProfileForm name={user.name ?? ""} timezone={user.timezone} timezones={timezones} />
      </Section>

      <Section title="Your data" blurb="Everything you've written belongs to you. Download a copy any time.">
        <div className="flex flex-col gap-3 sm:flex-row">
          <a href="/api/export" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90" download>
            Export my data (JSON)
          </a>
          <form action={deleteAiHistory}>
            <button type="submit" disabled={aiCount === 0} className="inline-flex items-center justify-center rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/40 disabled:cursor-not-allowed disabled:opacity-50">
              Delete all AI responses ({aiCount})
            </button>
          </form>
        </div>
        <p className="mt-3 text-xs text-muted">
          Privacy in short: journal text is only ever readable by you. The AI companion receives only the entries or check-ins you explicitly choose to share, one response at a time (provider: Google Gemini). The admin dashboard shows aggregate counts and account status — never your writing.
        </p>
      </Section>

      <Section title="Security">
        <PasswordForm />
        <div className="mt-5 border-t border-border pt-4">
          <form action={logOutEverywhere} className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">Signed in somewhere you don&apos;t recognise? End every session, including this one.</p>
            <button type="submit" className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent/40">
              Log out everywhere
            </button>
          </form>
        </div>
      </Section>

      <Section title="Delete account" danger>
        <DeleteAccountForm email={user.email} isAdmin={user.role === "ADMIN"} />
      </Section>
    </div>
  );
}
