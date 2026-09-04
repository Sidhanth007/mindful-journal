# Mindful Journal

An AI-supported mental fitness and daily reflection journal (demo/showcase build).

> Mindful Journal and its AI assistant are supportive wellness tools. They are **not**
> a replacement for a mental-health professional, a diagnosis, or emergency services.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS 4**
- **PostgreSQL** (Neon) via **Prisma 7** (`@prisma/adapter-pg`)
- **Auth.js v5** — email + password, OTP email verification via **Brevo**
- **Google Gemini** (AI Studio API, free tier) for the supportive AI companion
- **Recharts** for mood and journaling trends

## Clone & run

```bash
git clone <your-repo-url> mindful-journal
cd mindful-journal
cp .env.example .env.local   # then fill in the values (see "Environment variables" below)
npm install                  # also generates the Prisma client (postinstall)
npm run db:migrate           # creates the tables in your Postgres database
npm run dev                  # http://localhost:3005
```

Requirements: Node 20+, a Postgres database (Neon free tier works), and — optionally — Brevo and Google Gemini keys.

Other useful commands:

```bash
npm run build && npm start   # production build + server on :3005
npm run lint                 # eslint
npx prisma studio            # browse data locally
npm run seed:demo            # demo account with 30 days of data
```

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (framework preset: Next.js — detected automatically).
2. **Build command:** `npx prisma migrate deploy && next build` — applies pending migrations to your database on every deploy. (Or keep the default `next build` and run `npm run db:migrate` yourself.)
3. **Environment variables** (Project → Settings → Environment Variables): every key from `.env.example` — `DATABASE_URL`, `AUTH_SECRET`, `ADMIN_EMAIL`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `GEMINI_API_KEY`, `GEMINI_MODEL` — and set `NEXT_PUBLIC_APP_URL` to your Vercel URL. Use Neon's **pooled** connection string for `DATABASE_URL`.
4. Deploy. The first account to register with `ADMIN_EMAIL` becomes the admin.

Notes: the in-memory rate limiter is per serverless instance (fine for a demo); HSTS and the production CSP switch on automatically when `NODE_ENV=production`.

## Project layout

```
prisma/schema.prisma        data model (users, OTPs, journal entries, check-ins, habits, goals, AI, recaps, audit)
prisma/migrations/          SQL migrations, applied in order
prisma.config.ts            Prisma CLI config (loads .env.local)
scripts/seed-demo.mjs       demo data generator
src/proxy.ts                request guard: protects /app and /admin
src/auth.ts, auth.config.ts Auth.js (email + password, JWT sessions)
src/app/(auth)/             login, register, verify-email, forgot/reset password
src/app/app/                signed-in app: dashboard, check-in, journal, habits, goals, trends, companion, settings
src/app/admin/              single-admin analytics, user management, audit log
src/app/api/                Auth.js endpoints and the JSON data export
src/components/             shared UI (form fields, stat tiles, theme toggle, recap card)
src/lib/                    server logic: prisma client, session guard, validation, OTP, email, AI, stats, streaks
src/generated/prisma        generated client (git-ignored; created by `npm install`)
.env.example                all environment variables, documented
```

Conventions: a folder's `page.tsx` is the URL, `layout.tsx` wraps everything beneath it, `actions.ts` holds that feature's server actions (every one starts with `requireUser()` / `requireAdmin()`), and `*-form.tsx` files are the interactive client parts.

## Demo data

```bash
npm run seed:demo        # creates demo@mindful.local / DemoPass1 with 30 days of activity
```

Re-running replaces the demo account. Delete it from the admin panel (Users → Delete) when done.

## Privacy model

- Journal text and check-in notes are readable only by their owner (every query is scoped by user id).
- The AI companion (Google Gemini) receives only the entries/check-ins the user explicitly selects, one response at a time.
- Admin views show aggregates and account status only — never content.
- Users can export everything as JSON or delete their account (cascade) from **Settings**.
- Password change / "log out everywhere" bumps `sessionVersion`, invalidating all other sessions.

## Running a demo

1. `npm run dev` → http://localhost:3005 (port 3005 is fixed so it never clashes with other local projects on 3000).
2. Log in as the admin (`ADMIN_EMAIL` in `.env.local`) or as the seeded demo user (`npm run seed:demo`).
3. Suggested walkthrough: Dashboard → **Check in now** → save → **Reflect** (AI) → accept a suggestion → Habits → Journal → Trends (30 days) → Companion → Settings (export) → avatar → Admin panel.

### Environment variables

| Variable | Purpose | Where to get it |
|---|---|---|
| `DATABASE_URL` | Neon Postgres connection string | neon.tech → project → Connect |
| `AUTH_SECRET` | Signs session cookies | `openssl rand -base64 32` |
| `ADMIN_EMAIL` | The one account that gets the ADMIN role on registration | — |
| `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` | OTP verification / password-reset emails (free: 300/day) | brevo.com → SMTP & API → API keys; verify the sender first |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | AI companion (free tier; `gemini-3.6-flash`) | aistudio.google.com → Get API key |

Without `BREVO_API_KEY` in development, OTP codes are printed to the server console instead of emailed. Without `GEMINI_API_KEY`, the companion shows a "not configured" notice and everything else works.

### Limits & known trade-offs

- Rate limiting is in-memory (per server instance) — fine for a demo, swap for Redis for multi-instance production.
- Gemini's free tier may use prompts to improve Google products; the UI states exactly which entries are shared. Use a paid key for stricter privacy.
- `npm audit` reports `deepmerge-ts` via the Prisma **CLI** (dev tooling only, not shipped to the app); the only "fix" is downgrading to Prisma 6, which is not recommended.
- Rotate the Neon database password before any public demo if it has ever been shared in chat or screenshots.

## Build phases

1. Scaffold ✅
2. Database + auth (register, login, Brevo OTP, password reset) ✅
3. Journal & mood ✅
4. Habits & goals ✅
5. Dashboard & trends ✅
6. AI companion (Gemini) + daily check-in ✅
7. Admin dashboard (single admin) ✅
8. Privacy, security hardening & polish ✅
9. Deployment (optional)
