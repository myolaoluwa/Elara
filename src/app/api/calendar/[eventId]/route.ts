import { NextResponse } from "next/server";
import { calendarEventSchema } from "@/lib/operations/schemas";
import { prisma } from "@/lib/prisma";
import { getWorkspaceContext } from "@/lib/workspace";
import { RequestBodyError, enforceRateLimit, readJsonBody, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`calendar:update:${context.user.id}`, 60, 5 * 60_000);
  if (limited) return limited;

  const { eventId } = await params;
  const existing = await prisma.calendarEvent.findFirst({ where: { id: eventId, organizationId: context.organization.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let raw: unknown;
  try {
    raw = await readJsonBody(request, 20_000);
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const parsed = calendarEventSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid event" }, { status: 400 });
  const value = parsed.data;

  const event = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.calendarEvent.update({
      where: { id: eventId },
      data: { title: value.title, startsAt: new Date(value.startsAt), endsAt: new Date(value.endsAt), timezone: value.timezone, location: value.location || null },
    });
    await transaction.activityLog.create({
      data: { organizationId: context.organization.id, actorUserId: context.user.id, actorType: "user", action: "calendar.updated", entityType: "calendar-event", entityId: eventId, source: "calendar" },
    });
    return updated;
  });
  return NextResponse.json({ event });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`calendar:delete:${context.user.id}`, 30, 5 * 60_000);
  if (limited) return limited;

  const { eventId } = await params;
  const existing = await prisma.calendarEvent.findFirst({ where: { id: eventId, organizationId: context.organization.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.$transaction([
    prisma.calendarEvent.delete({ where: { id: eventId } }),
    prisma.activityLog.create({
      data: { organizationId: context.organization.id, actorUserId: context.user.id, actorType: "user", action: "calendar.deleted", entityType: "calendar-event", entityId: eventId, source: "calendar", approvalStatus: "APPROVED" },
    }),
  ]);
  return new Response(null, { status: 204 });
}
