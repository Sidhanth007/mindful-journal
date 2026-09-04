"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { addDays, dayToDate, todayInTimezone } from "@/lib/dates";
import { runCompanion, screenForRisk } from "@/lib/ai";
import { DAILY_LIMIT, type CompanionKind } from "@/lib/companion";

export type CompanionState =
  | {
      status: "ok";
      kind: CompanionKind;
      text: string;
      entryCount: number;
      risk: boolean;
      interactionId: string;
    }
  | { status: "error"; message: string; risk?: boolean }
  | undefined;

const KINDS: CompanionKind[] = ["REFLECTION", "PATTERNS", "SELF_CARE", "PROMPT"];

export async function askCompanion(_prev: CompanionState, formData: FormData): Promise<CompanionState> {
  const user = await requireUser();

  const kind = String(formData.get("kind") ?? "") as CompanionKind;
  if (!KINDS.includes(kind)) return { status: "error", message: "Pick what you'd like the companion to do." };

  const scope = String(formData.get("scope") ?? "7");
  const entryId = String(formData.get("entryId") ?? "");

  // Per-minute burst limit + per-day quota.
  const burst = rateLimit(`ai:${user.id}`, 5, 60 * 1000);
  if (!burst.ok) return { status: "error", message: `Give it a moment — try again in ${burst.retryAfterSeconds}s.` };

  const dayStart = dayToDate(todayInTimezone(user.timezone));
  const usedToday = await prisma.aiInteraction.count({ where: { userId: user.id, createdAt: { gte: dayStart } } });
  if (usedToday >= DAILY_LIMIT) return { status: "error", message: `You've reached today's limit of ${DAILY_LIMIT} companion responses. It resets tomorrow.` };

  // Resolve exactly which entries the user chose to share.
  const select = { id: true, entryDate: true, title: true, content: true, moodScore: true, emotions: true, gratitude: true } as const;
  let entries;
  if (scope === "entry" && entryId) {
    const one = await prisma.journalEntry.findFirst({ where: { id: entryId, userId: user.id }, select });
    entries = one ? [one] : [];
  } else {
    const days = scope === "30" ? 30 : 7;
    const from = addDays(todayInTimezone(user.timezone), -(days - 1));
    entries = await prisma.journalEntry.findMany({
      where: { userId: user.id, entryDate: { gte: dayToDate(from) } },
      orderBy: { entryDate: "asc" },
      take: 30,
      select,
    });
  }

  if (entries.length === 0) {
    return { status: "error", message: "There are no entries in that range yet. Write a reflection first, then come back." };
  }

  const risk = entries.some((e) => screenForRisk(`${e.title ?? ""}\n${e.content}\n${e.gratitude ?? ""}`));

  const result = await runCompanion(kind, entries, user.name);
  if (!result.ok) {
    await logAudit("ai.failed", { userId: user.id, metadata: { kind, reason: result.reason } });
    return { status: "error", message: result.message, risk };
  }

  const saved = await prisma.aiInteraction.create({
    data: {
      userId: user.id,
      kind,
      entryIds: entries.map((e) => e.id),
      response: result.text,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    },
    select: { id: true },
  });

  await logAudit("ai.respond", { userId: user.id, metadata: { kind, entries: entries.length, model: result.model, risk } });
  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
  revalidatePath("/app/companion");

  return { status: "ok", kind, text: result.text, entryCount: entries.length, risk, interactionId: saved.id };
}

export async function deleteInteraction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.aiInteraction.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/app/companion");
}
