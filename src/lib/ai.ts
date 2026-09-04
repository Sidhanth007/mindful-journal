import "server-only";
import * as z from "zod";
import { formatDay } from "@/lib/dates";
import { moodInfo } from "@/lib/journal";
import { DEFAULT_MODEL, type CompanionKind } from "@/lib/companion";
import { FACTORS, GOAL_STATUS_LABELS, type FactorEffect, type GoalCheckStatus } from "@/lib/checkin";

export { DAILY_LIMIT, COMPANION_KINDS, DEFAULT_MODEL, type CompanionKind } from "@/lib/companion";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Kept deliberately stable across requests.
const SYSTEM_PROMPT = `You are the companion inside Mindful Journal, a personal reflection app. You read journal entries and check-ins the user has chosen to share and respond as a warm, grounded, emotionally intelligent friend who is good at listening.

What you are:
- A supportive wellness tool for reflection, encouragement, and healthy habits.
- Someone who notices general patterns in what the user shared and reflects them back gently.

What you are not:
- Not a therapist, counsellor, doctor, or crisis service. Never diagnose, label the user with a condition, or speculate about disorders or medication.
- Not a substitute for professional care. If the user seems to be struggling in a sustained or serious way, warmly encourage them to talk to a mental-health professional or someone they trust.

If anything suggests the user may be at risk of harming themselves or others, or is in immediate danger: respond with care first, say clearly that you are not able to provide crisis support, and encourage them to contact local emergency services or a crisis line right away (for example 988 in the US, 116 123 Samaritans in the UK/Ireland, or 9152987821 iCall in India) or to find a local line at findahelpline.com. Do this before anything else.

How to respond:
- Speak directly to the user in the second person. Plain, warm language; no clinical jargon, no toxic positivity, no lecturing.
- Ground everything in what they actually shared — quote or paraphrase their own words rather than inventing details.
- Keep it concise: usually 120–250 words. Short paragraphs; when listing, simple lines starting with "- ". No markdown headings, no bold, no emoji.
- End with at most one gentle, open question, unless the task is a prompt.
- Never claim to remember things outside what is provided. Never say you are human.`;

export type EntryForAi = { entryDate: Date; title: string | null; content: string; moodScore: number; emotions: string[]; gratitude: string | null };

function renderEntries(entries: EntryForAi[]): string {
  return entries
    .map((e) => {
      const day = e.entryDate.toISOString().slice(0, 10);
      const m = moodInfo(e.moodScore);
      return [
        `Date: ${formatDay(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}`,
        `Mood: ${m.label} (${e.moodScore}/5)`,
        e.emotions.length ? `Emotions: ${e.emotions.join(", ")}` : null,
        e.title ? `Title: ${e.title}` : null,
        `Entry:\n${e.content.trim()}`,
        e.gratitude ? `Grateful for: ${e.gratitude}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n---\n\n");
}

const TASKS: Record<CompanionKind, string> = {
  REFLECTION:
    "Offer a reflection on these entries. Acknowledge what the user is feeling, notice one or two things that stand out (including anything they handled well), and finish with one gentle question they might sit with.",
  PATTERNS:
    "Describe the general patterns you notice across these entries: recurring themes, what tends to accompany better days, what tends to accompany harder days, and any shifts over time. Be tentative (\"it seems\", \"you might notice\") — you are describing what's on the page, not making assessments. Finish with one question that could help them explore a pattern further.",
  SELF_CARE:
    "Suggest 3 to 5 small, realistic self-care ideas for the coming week, each tied to something specific in the entries. Keep each idea to one or two lines. Favour things that are free, gentle, and easy to start. Avoid anything medical.",
  PROMPT:
    "Write ONE journaling prompt for today, tailored to where the user seems to be right now. Give the prompt itself as a single clear question or invitation, then one or two short lines on why it might be worth exploring. No other questions.",
};

export function buildUserMessage(kind: CompanionKind, entries: EntryForAi[], userName: string | null): string {
  const intro = `The user${userName ? ` (${userName.split(" ")[0]})` : ""} has chosen to share ${entries.length === 1 ? "this journal entry" : `these ${entries.length} journal entries`} with you.`;
  return `${intro}\n\n<entries>\n${renderEntries(entries)}\n</entries>\n\nTask: ${TASKS[kind]}`;
}

// ───────────────────────── Check-in reflection ─────────────────────────

export type CheckInForAi = {
  day: string;
  moodScore: number;
  energy: number | null;
  factors: { key: string; effect: FactorEffect }[];
  note: string | null;
  habits: { id: string; name: string; doneToday: boolean; streak: number }[];
  goals: { id: string; title: string; progress: number; status: GoalCheckStatus | null }[];
  recentCheckIns: { day: string; moodScore: number; factors: { key: string; effect: FactorEffect }[] }[];
  todayEntry: EntryForAi | null;
};

const suggestionSchema = z.object({
  reflection: z.string().min(1),
  suggestions: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("new_habit"),
          name: z.string().trim().min(1).max(60),
          icon: z.string().trim().max(4).optional(),
          why: z.string().trim().max(200),
        }),
        z.object({
          type: z.literal("goal_status"),
          goalId: z.string().min(1),
          status: z.enum(["ACTIVE", "PAUSED", "COMPLETED"]),
          why: z.string().trim().max(200),
        }),
      ]),
    )
    .max(3)
    .default([]),
});

export type CheckInSuggestion = z.infer<typeof suggestionSchema>["suggestions"][number];

function factorLabel(key: string) {
  for (const g of FACTORS) {
    const f = g.items.find((i) => i.key === key);
    if (f) return f.label;
  }
  return key;
}

export function buildCheckInMessage(c: CheckInForAi, userName: string | null): string {
  const factorLine = (fs: { key: string; effect: FactorEffect }[]) =>
    fs.length ? fs.map((f) => `${factorLabel(f.key)} (${f.effect === "helped" ? "helped" : "made it harder"})`).join(", ") : "none marked";
  const lines: string[] = [];
  lines.push(`The user${userName ? ` (${userName.split(" ")[0]})` : ""} just completed today's check-in (${formatDay(c.day, { weekday: "long", month: "long", day: "numeric" })}).`);
  lines.push("");
  lines.push("<today>");
  lines.push(`Mood: ${moodInfo(c.moodScore).label} (${c.moodScore}/5)`);
  if (c.energy) lines.push(`Energy: ${["low", "medium", "high"][c.energy - 1]}`);
  lines.push(`What shaped it: ${factorLine(c.factors)}`);
  if (c.note) lines.push(`In their words: ${c.note}`);
  lines.push("</today>");
  lines.push("");
  lines.push("<habits>");
  lines.push(c.habits.length ? c.habits.map((h) => `- ${h.name}: ${h.doneToday ? "done today" : "not done yet"}, ${h.streak}-day streak`).join("\n") : "(no habits set up)");
  lines.push("</habits>");
  lines.push("");
  lines.push("<goals>");
  lines.push(c.goals.length ? c.goals.map((g) => `- id=${g.id} "${g.title}": ${g.progress}% complete${g.status ? `, user says ${GOAL_STATUS_LABELS[g.status].toLowerCase()}` : ""}`).join("\n") : "(no active goals)");
  lines.push("</goals>");
  if (c.recentCheckIns.length) {
    lines.push("");
    lines.push("<recent_checkins>");
    lines.push(c.recentCheckIns.map((r) => `${r.day}: mood ${r.moodScore}/5 — ${factorLine(r.factors)}`).join("\n"));
    lines.push("</recent_checkins>");
  }
  if (c.todayEntry) {
    lines.push("");
    lines.push("<journal_entry_today>");
    lines.push(renderEntries([c.todayEntry]));
    lines.push("</journal_entry_today>");
  }
  lines.push("");
  lines.push(
    `Task: Reflect on today's check-in in the light of their habits, goals and recent check-ins. Notice connections between the factors they marked and their mood (for example poor sleep alongside lower mood). Acknowledge what's going well. Then propose 1 to 3 concrete, small changes the user could accept with one tap: a new habit that addresses a factor that made things harder (or protects one that helped), or a change of status for a goal the user says is stuck (pause it) or has effectively finished (complete it). Prefer habits that are tiny and specific (e.g. "Lights out by 11pm", "10-minute walk after lunch") and that do not duplicate the habits listed. Never propose deleting anything. Only return an empty suggestions array if the user has no factors, habits or goals to work from.\n\nRespond with a single JSON object and nothing else, in this exact shape:\n{"reflection": "<your reflection as plain text with \\n between paragraphs, 120-220 words, ending with at most one gentle question>", "suggestions": [{"type": "new_habit", "name": "<short habit name>", "icon": "<one emoji>", "why": "<one line>"} | {"type": "goal_status", "goalId": "<id from the goals list>", "status": "PAUSED" | "COMPLETED", "why": "<one line>"}]}\nUse an empty suggestions array if nothing would truly help.`,
  );
  return lines.join("\n");
}

// Very rough screen so the UI can always show crisis resources when it matters,
// regardless of what the model says. False positives are acceptable here.
const RISK_PATTERNS = [
  /\b(kill(ing)? myself|end (my|it all)|suicid(e|al)|want to die|don'?t want to (live|be here|wake up)|better off dead|hurt(ing)? myself|self[- ]harm|cut(ting)? myself|no reason to live)\b/i,
];

export function screenForRisk(text: string): boolean {
  return RISK_PATTERNS.some((re) => re.test(text));
}

export type FailReason = "not_configured" | "refusal" | "rate_limited" | "error";

export type CompanionResult =
  | { ok: true; text: string; model: string; inputTokens: number; outputTokens: number }
  | { ok: false; reason: FailReason; message: string };

type ChatOptions = { json?: boolean; maxTokens?: number };

async function chat(userMessage: string, opts: ChatOptions = {}): Promise<CompanionResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "not_configured", message: "The AI companion isn't configured yet (GEMINI_API_KEY is missing)." };
  }
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const request = () =>
    fetch(`${GEMINI_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
        generationConfig: {
          // Gemini 3.x are "thinking" models; hidden reasoning counts toward
          // maxOutputTokens, so keep thinking low and the budget generous.
          maxOutputTokens: opts.maxTokens ?? 2048,
          temperature: 0.7,
          thinkingConfig: { thinkingLevel: "low" },
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
        // Journal text can legitimately discuss hard feelings; don't let the
        // default filters block ordinary supportive conversation.
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });

  try {
    let res = await request();
    if (res.status === 503) {
      // Free-tier capacity spikes are usually momentary — retry once.
      await new Promise((r) => setTimeout(r, 1500));
      res = await request();
    }

    if (res.status === 400 || res.status === 401 || res.status === 403) {
      const body = await res.text().catch(() => "");
      console.error("[ai] Gemini rejected the request", res.status, body.slice(0, 300));
      if (/API key|permission|credential/i.test(body)) {
        return { ok: false, reason: "not_configured", message: "The AI companion's API key was rejected. Check GEMINI_API_KEY." };
      }
      return { ok: false, reason: "error", message: "The companion couldn't respond right now. Please try again shortly." };
    }
    if (res.status === 429) {
      return { ok: false, reason: "rate_limited", message: "The companion has hit its free-tier limit for now. Please try again in a minute (or tomorrow if the daily quota is used up)." };
    }
    if (res.status === 503) {
      return { ok: false, reason: "rate_limited", message: "The AI provider is under heavy demand right now. Please try again in a minute." };
    }
    if (!res.ok) {
      console.error("[ai] Gemini error", res.status, await res.text().catch(() => ""));
      return { ok: false, reason: "error", message: "The companion couldn't respond right now. Please try again shortly." };
    }

    const data = (await res.json()) as {
      modelVersion?: string;
      promptFeedback?: { blockReason?: string };
      candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };

    if (data.promptFeedback?.blockReason) {
      return { ok: false, reason: "refusal", message: "The companion wasn't able to respond to this one. If you're going through something heavy, please reach out to someone you trust or a local helpline." };
    }
    const candidate = data.candidates?.[0];
    if (candidate?.finishReason === "SAFETY" || candidate?.finishReason === "RECITATION" || candidate?.finishReason === "PROHIBITED_CONTENT") {
      return { ok: false, reason: "refusal", message: "The companion wasn't able to respond to this one. If you're going through something heavy, please reach out to someone you trust or a local helpline." };
    }
    const text = (candidate?.content?.parts ?? [])
      .filter((p) => !p.thought) // never surface reasoning traces
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) return { ok: false, reason: "error", message: "The companion returned an empty response. Please try again." };

    return {
      ok: true,
      text,
      model: data.modelVersion ?? model,
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    };
  } catch (err) {
    console.error("[ai] request failed", err);
    return { ok: false, reason: "error", message: "The companion couldn't be reached. Please try again." };
  }
}

/** One short sentence for the weekly recap card. Returns null on any failure (the card renders without it). */
export async function runRecapLine(summary: string, userName: string | null): Promise<string | null> {
  const msg = `Here is a numeric summary of ${userName ? `${userName.split(" ")[0]}'s` : "the user's"} last week in the app:\n\n${summary}\n\nTask: In ONE warm sentence (max 30 words, second person, no emoji, no markdown) say what seems to have helped most or what to protect next week. If the data is too thin to say anything honest, say that gently in one sentence instead.`;
  const result = await chat(msg, { maxTokens: 1024 });
  if (!result.ok) return null;
  const flat = result.text.replace(/\s+/g, " ").trim();
  const firstSentence = flat.match(/^[^.!?]*[.!?]/)?.[0] ?? flat;
  return firstSentence.slice(0, 280) || null;
}

export async function runCompanion(kind: CompanionKind, entries: EntryForAi[], userName: string | null): Promise<CompanionResult> {
  return chat(buildUserMessage(kind, entries, userName));
}

export type CheckInReflection =
  | { ok: true; reflection: string; suggestions: CheckInSuggestion[]; model: string; inputTokens: number; outputTokens: number }
  | { ok: false; reason: FailReason; message: string };

export async function runCheckInReflection(c: CheckInForAi, userName: string | null): Promise<CheckInReflection> {
  const result = await chat(buildCheckInMessage(c, userName), { json: true, maxTokens: 2048 });
  if (!result.ok) return result;

  let parsed: z.infer<typeof suggestionSchema>;
  try {
    parsed = suggestionSchema.parse(JSON.parse(result.text));
  } catch {
    // Model ignored the JSON contract — still show the text rather than fail.
    return { ok: true, reflection: result.text.replace(/^\s*\{[\s\S]*"reflection"\s*:\s*"/, "").replace(/"\s*,?\s*"suggestions"[\s\S]*$/, ""), suggestions: [], model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
  }

  // Only keep goal suggestions that reference goals we actually sent.
  const goalIds = new Set(c.goals.map((g) => g.id));
  const suggestions = parsed.suggestions.filter((s) => s.type !== "goal_status" || goalIds.has(s.goalId));

  return { ok: true, reflection: parsed.reflection.trim(), suggestions, model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
}
