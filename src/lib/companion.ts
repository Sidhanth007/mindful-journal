// Client-safe constants for the AI companion (no server-only imports here).

export type CompanionKind = "REFLECTION" | "PATTERNS" | "SELF_CARE" | "PROMPT";

export const COMPANION_KINDS: { kind: CompanionKind; title: string; blurb: string; verb: string }[] = [
  { kind: "REFLECTION", title: "Reflect with me", blurb: "A warm, thoughtful reflection on what you wrote — and a gentle question to sit with.", verb: "Reflect" },
  { kind: "PATTERNS", title: "Notice patterns", blurb: "General themes across your recent entries: what tends to lift you, what tends to weigh on you.", verb: "Find patterns" },
  { kind: "SELF_CARE", title: "Self-care ideas", blurb: "A few small, realistic things you could try this week, based on how you've been feeling.", verb: "Suggest ideas" },
  { kind: "PROMPT", title: "Give me a prompt", blurb: "A journaling prompt tailored to where you are right now.", verb: "Get a prompt" },
];

/** Titles for every stored interaction kind, including ones not offered on the Companion page. */
export const KIND_TITLES: Record<string, string> = {
  REFLECTION: "Reflect with me",
  PATTERNS: "Notice patterns",
  SELF_CARE: "Self-care ideas",
  PROMPT: "Journaling prompt",
  CHECKIN: "Check-in reflection",
};

export const AI_PROVIDER_NAME = "Google Gemini";
export const AI_KEY_ENV = "GEMINI_API_KEY";
export const DEFAULT_MODEL = "gemini-3.6-flash";
export const DAILY_LIMIT = 30;
