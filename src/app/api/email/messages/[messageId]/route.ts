import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { enforceRateLimit, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";

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
