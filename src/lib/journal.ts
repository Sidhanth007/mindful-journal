export type MoodScore = 1 | 2 | 3 | 4 | 5;

export const MOODS: { score: MoodScore; label: string; emoji: string; color: string }[] = [
  { score: 1, label: "Very low", emoji: "😞", color: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300" },
  { score: 2, label: "Low", emoji: "😕", color: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300" },
  { score: 3, label: "Okay", emoji: "😐", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  { score: 4, label: "Good", emoji: "🙂", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" },
  { score: 5, label: "Great", emoji: "😄", color: "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300" },
];

export function moodInfo(score: number) {
  return MOODS.find((m) => m.score === score) ?? MOODS[2];
}

/** Suggested emotion tags; users can add their own. */
export const EMOTION_PRESETS = [
  "calm",
  "grateful",
  "hopeful",
  "content",
  "energised",
  "proud",
  "loved",
  "focused",
  "tired",
  "stressed",
  "anxious",
  "sad",
  "lonely",
  "frustrated",
  "overwhelmed",
  "bored",
] as const;

export const MAX_EMOTIONS = 8;
export const MAX_CONTENT_LENGTH = 20_000;

export const JOURNAL_PROMPTS = [
  "What is one thing that went well today, however small?",
  "What drained your energy today, and what restored it?",
  "What are you looking forward to tomorrow?",
  "Describe a moment today when you felt most like yourself.",
  "What is something you're carrying that you could set down?",
  "Who or what are you grateful for right now?",
  "What would you tell a friend who had the day you just had?",
];

// ───────────────────────── Guided templates ─────────────────────────

export type JournalTemplate = { key: string; title: string; blurb: string; scaffold: string };

export const TEMPLATES: JournalTemplate[] = [
  {
    key: "three-good-things",
    title: "Three good things",
    blurb: "Small or big — three things that went well, and why.",
    scaffold: "Three good things today\n\n1. \n   Why it happened / what it meant:\n\n2. \n   Why it happened / what it meant:\n\n3. \n   Why it happened / what it meant:\n",
  },
  {
    key: "worry-reframe",
    title: "Worry dump → reframe",
    blurb: "Get the worry out of your head, then look at it from one step back.",
    scaffold:
      "What's on my mind\n\n\n\nWhat I can control here\n\n\n\nWhat I can't control (and can set down for now)\n\n\n\nA kinder way to say the same worry\n\n\n\nOne small next step\n\n",
  },
  {
    key: "sunday-review",
    title: "Sunday review",
    blurb: "Look back on the week and set an intention for the next one.",
    scaffold:
      "This week\n\nWhat went well:\n\n\nWhat was hard:\n\n\nWhat I learned about myself:\n\n\nNext week\n\nOne thing I want to protect:\n\n\nOne thing I want to try:\n",
  },
];

export function templateByKey(key: string | null | undefined): JournalTemplate | undefined {
  return key ? TEMPLATES.find((t) => t.key === key) : undefined;
}

export function promptForDay(day: string): string {
  const n = day.split("-").reduce((acc, part) => acc + Number(part), 0);
  return JOURNAL_PROMPTS[n % JOURNAL_PROMPTS.length];
}
