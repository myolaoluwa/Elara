import { prisma } from "@/lib/prisma";
import { sendWebPush } from "@/lib/web-push";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 50;
const CLAIM_TIMEOUT_MS = 2 * 60_000;

function statusCodeFromError(error: unknown) {
  if (typeof error !== "object" || error === null || !("statusCode" in error)) return null;
  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return typeof statusCode === "number" ? statusCode : null;
}

export async function dispatchDueReminders(now = new Date()) {
  if (!process.env.VAPID_PUBLIC_KEY?.trim() || !process.env.VAPID_PRIVATE_KEY?.trim()) {
    throw new Error("VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are required to dispatch reminders.");
  }

  await prisma.reminder.updateMany({
    where: { status: "SENDING", claimedAt: { lt: new Date(now.getTime() - CLAIM_TIMEOUT_MS) } },
    data: { status: "PENDING", claimedAt: null },
  });

  const due = await prisma.reminder.findMany({
    where: { status: "PENDING", triggerAt: { lte: now } },
    orderBy: { triggerAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true, organizationId: true, userId: true, title: true, body: true, triggerAt: true, attempts: true },
  });

  const outcomes = await Promise.all(due.map(async (reminder) => {
    const claimed = await prisma.reminder.updateMany({
      where: { id: reminder.id, status: "PENDING" },
      data: { status: "SENDING", claimedAt: now, attempts: { increment: 1 } },
    });
    if (!claimed.count) return "skipped" as const;

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { organizationId: reminder.organizationId, userId: reminder.userId },
      select: { id: true, endpoint: true, p256dh: true, auth: true },
    });

    if (!subscriptions.length) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "FAILED", claimedAt: null, lastError: "No active push subscription was registered at delivery time." },
      });
      return "failed" as const;
    }

    const outcomes = await Promise.allSettled(subscriptions.map(async (subscription) => {
      try {
        await sendWebPush(subscription, {
          title: reminder.title,
          body: reminder.body || "Your Elara alarm is due.",
          reminderId: reminder.id,
          url: "/alarms",
        });
      } catch (error) {
        if ([404, 410].includes(statusCodeFromError(error) || 0)) {
          await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
        }
        throw error;
      }
    }));

    const delivered = outcomes.some((outcome) => outcome.status === "fulfilled");
    if (delivered) {
      await prisma.reminder.update({
        where: { id: reminder.id },
        data: { status: "SENT", claimedAt: null, sentAt: now, lastError: null },
      });
      return "sent" as const;
    }

    const lastError = outcomes
      .filter((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected")
      .map((outcome) => outcome.reason instanceof Error ? outcome.reason.message : "Push delivery failed")
      .join("; ")
      .slice(0, 1000);
    const exhausted = reminder.attempts + 1 >= MAX_ATTEMPTS;

    await prisma.reminder.update({
      where: { id: reminder.id },
      data: { status: exhausted ? "FAILED" : "PENDING", claimedAt: null, lastError },
    });
    return exhausted ? "failed" as const : "retried" as const;
  }));

  const sent = outcomes.filter((outcome) => outcome === "sent").length;
  const failed = outcomes.filter((outcome) => outcome === "failed").length;
  const retried = outcomes.filter((outcome) => outcome === "retried").length;
  return { processed: sent + failed + retried, sent, failed, retried };
}
