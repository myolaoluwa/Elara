import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncRecentGmail } from "@/lib/email/google";
import { getWorkspaceContext } from "@/lib/workspace";
import { enforceRateLimit, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`mailbox:sync:${context.user.id}`, 10, 10 * 60_000);
  if (limited) return limited;
  const connection = await prisma.mailboxConnection.findFirst({ where: { organizationId: context.organization.id, userId: context.user.id, provider: "GMAIL", status: "ACTIVE" } });
  if (!connection) return NextResponse.json({ error: "Connect Gmail first" }, { status: 409 });
  try {
    return NextResponse.json(await syncRecentGmail(connection.id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to sync Gmail" }, { status: 502 });
  }
}
