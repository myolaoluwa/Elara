import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { enforceRateLimit, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";
import { disconnectGoogleMailbox } from "@/lib/email/google";

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const connections = await prisma.mailboxConnection.findMany({ where: { organizationId: context.organization.id, userId: context.user.id }, select: { id: true, provider: true, emailAddress: true, status: true, lastSyncedAt: true } });
  return NextResponse.json({ connections });
}

export async function DELETE(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`mailbox:disconnect:${context.user.id}`, 5, 10 * 60_000);
  if (limited) return limited;
  const connection = await prisma.mailboxConnection.findFirst({ where: { organizationId: context.organization.id, userId: context.user.id, provider: "GMAIL" }, select: { id: true } });
  const disconnected = connection ? await disconnectGoogleMailbox(connection.id, context.organization.id, context.user.id) : false;
  return NextResponse.json({ disconnected: disconnected ? 1 : 0 });
}
