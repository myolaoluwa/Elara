import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";

export async function DELETE(_request: Request, { params }: { params: Promise<{ reminderId: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reminderId } = await params;
  const result = await prisma.reminder.updateMany({
    where: { id: reminderId, organizationId: context.organization.id, userId: context.user.id, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  if (!result.count) return NextResponse.json({ error: "Alarm not found or already dispatched." }, { status: 404 });
  return NextResponse.json({ cancelled: true });
}
