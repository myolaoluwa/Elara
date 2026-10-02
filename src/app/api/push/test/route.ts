import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { sendWebPush } from "@/lib/web-push";

export async function POST() {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { organizationId: context.organization.id, userId: context.user.id },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (!subscriptions.length) return NextResponse.json({ error: "Enable notifications on this device first." }, { status: 409 });

  const outcomes = await Promise.allSettled(subscriptions.map(async (subscription) => {
    try {
      await sendWebPush(subscription, {
        title: "Elara test notification",
        body: "Browser push is connected on this device.",
        reminderId: `test-${Date.now()}`,
        url: "/alarms",
      });
    } catch (error) {
      const statusCode = typeof error === "object" && error !== null && "statusCode" in error
        ? (error as { statusCode?: number }).statusCode
        : undefined;
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.deleteMany({ where: { id: subscription.id } });
      }
      throw error;
    }
  }));

  const delivered = outcomes.filter((outcome) => outcome.status === "fulfilled").length;
  if (!delivered) return NextResponse.json({ error: "Push service rejected delivery. Enable notifications again on this device." }, { status: 502 });

  return NextResponse.json({ delivered, total: subscriptions.length });
}
