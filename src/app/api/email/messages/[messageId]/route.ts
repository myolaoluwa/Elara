import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { enforceRateLimit, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";
import { dispatchOutboundEmail } from "@/lib/email/outbound";

export async function PATCH(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`email:send-draft:${context.user.id}`, 30, 5 * 60_000);
  if (limited) return limited;
  const { messageId } = await params;
  const [message, mailbox] = await Promise.all([
    prisma.outboundEmail.findFirst({ where: { id: messageId, organizationId: context.organization.id, createdById: context.user.id, status: { in: ["DRAFT", "FAILED"] } } }),
    prisma.mailboxConnection.findFirst({ where: { organizationId: context.organization.id, userId: context.user.id, provider: "GMAIL", status: "ACTIVE" }, select: { id: true } }),
  ]);
  if (!message) return NextResponse.json({ error: "Draft was not found or has already been sent" }, { status: 409 });
  if (!mailbox) return NextResponse.json({ error: "Connect Gmail before sending this draft" }, { status: 400 });
  try {
    const prepared = await prisma.outboundEmail.updateMany({
      where: { id: message.id, organizationId: context.organization.id, createdById: context.user.id, status: { in: ["DRAFT", "FAILED"] } },
      data: { mailboxConnectionId: mailbox.id, status: "DRAFT", lastError: null },
    });
    if (prepared.count !== 1) return NextResponse.json({ error: "Draft is already being sent" }, { status: 409 });
    const sent = await dispatchOutboundEmail(message.id, context.organization.id);
    return NextResponse.json({ message: sent });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to send this draft" }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`email:cancel:${context.user.id}`, 30, 5 * 60_000);
  if (limited) return limited;
  const { messageId } = await params;
  const cancelled = await prisma.outboundEmail.updateMany({ where: { id: messageId, organizationId: context.organization.id, createdById: context.user.id, status: { in: ["DRAFT", "SCHEDULED"] } }, data: { status: "CANCELLED" } });
  if (!cancelled.count) return NextResponse.json({ error: "Message was not found or can no longer be cancelled" }, { status: 409 });
  await prisma.activityLog.create({ data: { organizationId: context.organization.id, actorUserId: context.user.id, actorType: "user", action: "email.cancelled", entityType: "outbound-email", entityId: messageId, source: "inbox" } });
  return NextResponse.json({ cancelled: true });
}
