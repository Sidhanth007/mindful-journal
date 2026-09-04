#!/usr/bin/env node
/**
 * Seeds a demo account with ~30 days of realistic activity so charts and
 * dashboards look alive when presenting. Safe to re-run: it removes and
 * recreates the demo user each time. Only touches the demo account.
 *
 *   npm run seed:demo            → demo@mindful.local / DemoPass1
 *   DEMO_EMAIL=... DEMO_PASSWORD=... npm run seed:demo
 */
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Client } from "pg";
import bcrypt from "bcryptjs";

const envText = (() => {
  try {
    return readFileSync(".env.local", "utf8");
  } catch {
    return "";
  }
})();
const DATABASE_URL = process.env.DATABASE_URL ?? envText.match(/^DATABASE_URL="?([^"\n]+)/m)?.[1];
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found (set it or fill .env.local).");
  process.exit(1);
}

const EMAIL = (process.env.DEMO_EMAIL ?? "demo@mindful.local").toLowerCase();
const PASSWORD = process.env.DEMO_PASSWORD ?? "DemoPass1";
const DAYS = 30;

const id = () => randomUUID().replace(/-/g, "").slice(0, 25);
const day = (offset) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - offset);
  return d.toISOString().slice(0, 10);
};
const rand = (seed) => {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
};
const r = rand(42);
const pick = (arr) => arr[Math.floor(r() * arr.length)];

const TITLES = ["Slow morning", "Busy but good", "Rainy day thoughts", "Small wins", "Tired", "A good call with a friend", "Long walk", "Flat, but okay", "Bright afternoon", "Deadline day"];
const SENTENCES = [
  "Woke up before the alarm and had a quiet coffee before anyone else was up.",
  "Work was full-on today; the meeting ran long but we got somewhere in the end.",
  "Managed a walk after lunch, which helped more than I expected.",
  "Felt a bit scattered in the afternoon. Too many tabs open, in every sense.",
  "Called Mum in the evening. She sounded well, which was a relief.",
  "Ate properly for once. Noticing that makes a difference to my mood.",
  "Slept badly, kept waking up. Dragged through the morning.",
  "Finished the thing I'd been putting off for a week. Lighter now.",
  "Rain all day. Stayed in, read, didn't feel guilty about it.",
  "Argued about something small and then felt silly about it.",
  "Grateful for a slow evening and nothing urgent.",
  "Tried to journal without judging what came out. Mostly worked.",
];
const GRATITUDE = ["a warm shower", "a message from an old friend", "coffee", "the walk home", "getting to bed early", "a quiet flat", "sunlight on the desk", null, null];
const EMOTIONS_BY_MOOD = {
  1: ["sad", "overwhelmed", "tired", "lonely"],
  2: ["stressed", "tired", "anxious", "frustrated"],
  3: ["calm", "tired", "bored", "content"],
  4: ["content", "calm", "hopeful", "focused"],
  5: ["grateful", "energised", "proud", "loved"],
};
const FACTORS_HELP = ["sleep", "exercise", "friends", "nature", "achievement", "rest", "food"];
const FACTORS_HURT = ["sleep", "work", "stress", "screens", "money", "health"];

const c = new Client({ connectionString: DATABASE_URL });
await c.connect();
try {
  await c.query("BEGIN");
  await c.query('DELETE FROM "User" WHERE email = $1', [EMAIL]);

  const userId = id();
  const hash = await bcrypt.hash(PASSWORD, 10);
  await c.query(
    'INSERT INTO "User"(id,email,name,"passwordHash","emailVerified",timezone,"lastActiveAt","createdAt","updatedAt") VALUES ($1,$2,$3,$4,now(),$5,now(),now() - interval \'35 days\',now())',
    [userId, EMAIL, "Demo User", hash, "Asia/Kolkata"],
  );

  const habits = [
    ["Morning walk", "🚶", "Ten minutes outside before screens"],
    ["Lights out by 11", "😴", "Sleep is the lever for everything else"],
    ["Read 10 pages", "📖", null],
    ["No phone at dinner", "📵", null],
  ].map(([name, icon, description]) => ({ id: id(), name, icon, description }));
  for (const h of habits) {
    await c.query('INSERT INTO "Habit"(id,"userId",name,icon,description,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,now() - interval \'32 days\',now())', [h.id, userId, h.name, h.icon, h.description]);
  }

  const goals = [
    ["Run a 5k without stopping", "Three short runs a week, building up slowly", 55, "ACTIVE", 20],
    ["Finish the photography course", "Two modules left", 70, "ACTIVE", 45],
    ["Call one friend a week", null, 100, "COMPLETED", null],
    ["Learn to cook five dinners", "Rotate through a small set until they're easy", 30, "PAUSED", null],
  ];
  for (const [title, description, progress, status, targetIn] of goals) {
    await c.query(
      'INSERT INTO "Goal"(id,"userId",title,description,progress,status,"targetDate","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,now() - interval \'30 days\',now())',
      [id(), userId, title, description, progress, status, targetIn ? day(-targetIn) : null],
    );
  }

  // A gently improving mood with a dip in week two.
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = day(i);
    const base = 3 + (DAYS - i) / DAYS; // 3 → 4
    const dip = i >= 12 && i <= 16 ? -1.2 : 0;
    const mood = Math.max(1, Math.min(5, Math.round(base + dip + (r() - 0.5) * 1.6)));
    const skipEntry = r() < 0.22; // not every day has a journal entry
    const skipCheckIn = r() < 0.1;

    if (!skipCheckIn) {
      const helped = [...new Set([pick(FACTORS_HELP), pick(FACTORS_HELP)])].slice(0, mood >= 4 ? 2 : 1).map((k) => ({ key: k, effect: "helped" }));
      const hurt = mood <= 3 ? [...new Set([pick(FACTORS_HURT), pick(FACTORS_HURT)])].slice(0, mood <= 2 ? 2 : 1).map((k) => ({ key: k, effect: "hurt" })) : [];
      await c.query(
        'INSERT INTO "CheckIn"(id,"userId","checkDate","moodScore",energy,factors,"goalStatuses",note,"createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)',
        [id(), userId, d, mood, Math.max(1, Math.min(3, Math.round(mood / 2))), JSON.stringify([...helped, ...hurt]), "{}", r() < 0.3 ? pick(SENTENCES) : null, `${d}T08:30:00Z`],
      );
    }

    if (!skipEntry) {
      const content = [pick(SENTENCES), pick(SENTENCES), r() < 0.5 ? pick(SENTENCES) : null].filter(Boolean).join(" ");
      const emotions = [...new Set([pick(EMOTIONS_BY_MOOD[mood]), pick(EMOTIONS_BY_MOOD[mood])])];
      await c.query(
        'INSERT INTO "JournalEntry"(id,"userId","entryDate",title,content,"moodScore",emotions,gratitude,"wordCount","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)',
        [id(), userId, d, r() < 0.7 ? pick(TITLES) : null, content, mood, emotions, pick(GRATITUDE), content.split(/\s+/).length, `${d}T21:15:00Z`],
      );
    }

    for (const h of habits) {
      const p = h.name.startsWith("Morning") ? 0.75 : h.name.startsWith("Lights") ? 0.55 : 0.5;
      if (r() < p + (mood - 3) * 0.08) {
        await c.query('INSERT INTO "HabitLog"(id,"habitId","logDate",completed,"createdAt") VALUES ($1,$2,$3,true,$4)', [id(), h.id, d, `${d}T22:00:00Z`]);
      }
    }
  }

  await c.query('INSERT INTO "AuditLog"(id,"userId",action,metadata,"createdAt") VALUES ($1,$2,$3,$4,now())', [id(), userId, "user.register", JSON.stringify({ via: "seed-demo" })]);
  await c.query("COMMIT");

  console.log(`Demo account ready.\n  email:    ${EMAIL}\n  password: ${PASSWORD}\n  data:     ${DAYS} days of check-ins/entries, ${habits.length} habits, ${goals.length} goals`);
} catch (err) {
  await c.query("ROLLBACK");
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
