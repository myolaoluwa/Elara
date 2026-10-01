import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CalendarEventForm } from "@/components/calendar-event-form";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";
import { toDateTimeLocalInZone } from "@/lib/date-time";
export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) { const context = await requireWorkspaceContext(); const { eventId } = await params; const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, organizationId: context.organization.id } }); if (!event) notFound(); return <AppShell workspaceName={context.organization.name} userName={context.user.name}><CalendarEventForm event={{ id: event.id, title: event.title, startsAt: toDateTimeLocalInZone(event.startsAt, event.timezone), endsAt: toDateTimeLocalInZone(event.endsAt, event.timezone), timezone: event.timezone, location: event.location || "" }} /></AppShell>; }
