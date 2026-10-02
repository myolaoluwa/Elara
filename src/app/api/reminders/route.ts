import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { getWebPushPublicKey } from "@/lib/web-push";

const reminderSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().max(500).default(""),
  triggerAt: z.iso.datetime(),
});

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [items, subscriptions] = await Promise.all([
    prisma.reminder.findMany({
      where: { organizationId: context.organization.id, userId: context.user.id, status: { in: ["PENDING", "SENDING", "SENT", "FAILED"] } },
      select: { id: true, title: true, body: true, triggerAt: true, status: true, sentAt: true, lastError: true, createdAt: true },
      orderBy: [{ triggerAt: "asc" }, { createdAt: "desc" }],
      take: 100,
    }),
    prisma.pushSubscription.count({ where: { organizationId: context.organization.id, userId: context.user.id } }),
  ]);

  return NextResponse.json({ reminders: items, pushConfigured: Boolean(getWebPushPublicKey()), subscribed: subscriptions > 0 });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = reminderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a title and a valid alarm time." }, { status: 400 });

  const triggerAt = new Date(parsed.data.triggerAt);
  if (triggerAt.getTime() < Date.now() + 5_000) {
    return NextResponse.json({ error: "Choose a time at least five seconds in the future." }, { status: 400 });
  }
  if (triggerAt.getTime() > Date.now() + 366 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ error: "Alarms can be scheduled up to one year ahead." }, { status: 400 });
  }

  if (!getWebPushPublicKey()) {
    return NextResponse.json({ error: "Push notifications are not configured on the server yet." }, { status: 503 });
  }

  const subscriptions = await prisma.pushSubscription.count({ where: { organizationId: context.organization.id, userId: context.user.id } });
  if (!subscriptions) return NextResponse.json({ error: "Enable notifications on this device before setting an alarm." }, { status: 409 });

  const reminder = await prisma.reminder.create({
    data: {
      organizationId: context.organization.id,
      userId: context.user.id,
      title: parsed.data.title,
      body: parsed.data.body,
      triggerAt,
    },
    select: { id: true, title: true, body: true, triggerAt: true, status: true, createdAt: true },
  });

  return NextResponse.json({ reminder }, { status: 201 });
}
