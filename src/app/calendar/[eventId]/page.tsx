import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CalendarEventForm } from "@/components/calendar-event-form";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";
export default async function EventPage({ params }: { params: Promise<{ eventId: string }> }) { const context = await requireWorkspaceContext(); const { eventId } = await params; const event = await prisma.calendarEvent.findFirst({ where: { id: eventId, organizationId: context.organization.id } }); if (!event) notFound(); const local = (value: Date) => { const offset = value.getTimezoneOffset() * 60000; return new Date(value.getTime() - offset).toISOString().slice(0, 16); }; return <AppShell workspaceName={context.organization.name} userName={context.user.name}><CalendarEventForm event={{ id: event.id, title: event.title, startsAt: local(event.startsAt), endsAt: local(event.endsAt), timezone: event.timezone, location: event.location || "" }} /></AppShell>; }
