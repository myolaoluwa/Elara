import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";

const subscriptionSchema = z.object({
  endpoint: z.url().max(4096),
  keys: z.object({ p256dh: z.string().min(16).max(256), auth: z.string().min(8).max(256) }),
});

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || new URL(parsed.data.endpoint).protocol !== "https:") {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: parsed.data.endpoint },
    select: { id: true, userId: true, organizationId: true },
  });
  if (existing && (existing.userId !== context.user.id || existing.organizationId !== context.organization.id)) {
    return NextResponse.json({ error: "This device subscription belongs to another account." }, { status: 409 });
  }

  const subscription = existing
    ? await prisma.pushSubscription.update({
      where: { id: existing.id },
      data: { p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth },
      select: { id: true },
    })
    : await prisma.pushSubscription.create({
      data: {
      organizationId: context.organization.id,
      userId: context.user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
      },
      select: { id: true },
    });

  return NextResponse.json({ subscribed: true, id: subscription.id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = z.object({ endpoint: z.url().max(4096) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid subscription endpoint." }, { status: 400 });

  await prisma.pushSubscription.deleteMany({
    where: { organizationId: context.organization.id, userId: context.user.id, endpoint: parsed.data.endpoint },
  });
  return NextResponse.json({ subscribed: false });
}
