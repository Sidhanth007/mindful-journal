"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { countWords, dayToDate, dateToDay, todayInTimezone, addDays } from "@/lib/dates";
import { journalEntrySchema, toFormErrors, type FormState } from "@/lib/validation";
import { templateByKey } from "@/lib/journal";

function parseEmotions(formData: FormData): string[] {
  const picked = formData.getAll("emotions").map(String);
  const custom = String(formData.get("customEmotions") ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...picked, ...custom]));
}

export async function saveEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const parsed = journalEntrySchema.safeParse({
    id: formData.get("id") || undefined,
    entryDate: formData.get("entryDate"),
    title: formData.get("title") ?? "",
    moodScore: formData.get("moodScore"),
    emotions: parseEmotions(formData),
    content: formData.get("content"),
    gratitude: formData.get("gratitude") ?? "",
    template: formData.get("template") ?? "",
  });
  if (!parsed.success) return toFormErrors(parsed.error);

  const { id, entryDate, title, moodScore, emotions, content, gratitude } = parsed.data;
  const template = templateByKey(parsed.data.template)?.key ?? null;

  // Don't allow entries more than a day in the future (timezone slack).
  const maxDay = addDays(todayInTimezone(user.timezone), 1);
  if (entryDate > maxDay) return { errors: { entryDate: ["You can't journal for a future date."] } };

  const data = {
    entryDate: dayToDate(entryDate),
    title: title || null,
    moodScore,
    emotions,
    content,
    gratitude: gratitude || null,
    template,
    wordCount: countWords(content),
  };

  // One entry per calendar day per user.
  const clash = await prisma.journalEntry.findUnique({
    where: { userId_entryDate: { userId: user.id, entryDate: data.entryDate } },
    select: { id: true },
  });

  let entryId: string;

  if (id) {
    const existing = await prisma.journalEntry.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!existing) return { message: "That entry no longer exists." };
    if (clash && clash.id !== id) {
      return { errors: { entryDate: ["You already have an entry for that day. Edit that one instead."] } };
    }
    await prisma.journalEntry.update({ where: { id }, data });
    entryId = id;
    await logAudit("journal.update", { userId: user.id });
  } else {
    if (clash) {
      return { errors: { entryDate: ["You already have an entry for that day — open it from your history to edit."] } };
    }
    const created = await prisma.journalEntry.create({ data: { ...data, userId: user.id }, select: { id: true } });
    entryId = created.id;
    await logAudit("journal.create", { userId: user.id });
  }

  // Keep the day's check-in mood in step with the journal (one mood per day).
  await prisma.checkIn.updateMany({
    where: { userId: user.id, checkDate: data.entryDate, NOT: { moodScore } },
    data: { moodScore },
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

  revalidatePath("/app");
  revalidatePath("/app/journal");
  revalidatePath("/app/checkin");
  redirect(`/app/journal/${entryId}?saved=1`);
}

export async function deleteEntry(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/app/journal");

  const { count } = await prisma.journalEntry.deleteMany({ where: { id, userId: user.id } });
  if (count) await logAudit("journal.delete", { userId: user.id });

  revalidatePath("/app");
  revalidatePath("/app/journal");
  redirect("/app/journal?deleted=1");
}

/** Used by the "Write today's entry" shortcut: opens today's entry if it exists, else the new-entry form. */
export async function openToday(): Promise<void> {
  const user = await requireUser();
  const today = todayInTimezone(user.timezone);
  const existing = await prisma.journalEntry.findUnique({
    where: { userId_entryDate: { userId: user.id, entryDate: dayToDate(today) } },
    select: { id: true },
  });
  redirect(existing ? `/app/journal/${existing.id}` : `/app/journal/new?date=${dateToDay(dayToDate(today))}`);
}
