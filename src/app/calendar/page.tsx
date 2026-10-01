import { AppShell } from "@/components/app-shell";
import { CollectionPage } from "@/components/collection-page";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";
import { formatDateInZone, formatTimeInZone } from "@/lib/date-time";

export const metadata = { title: "Calendar" };
export default async function CalendarPage() {
  const context = await requireWorkspaceContext();
  const events = await prisma.calendarEvent.findMany({ where: { organizationId: context.organization.id }, orderBy: { startsAt: "asc" } });
  return <AppShell workspaceName={context.organization.name} userName={context.user.name}><CollectionPage eyebrow="Time" title="Calendar" subtitle="Coordinate time and expose conflicts before they become problems." action="Create event" resource="calendar" emptyTitle="Your calendar is clear" emptyBody="Create an event or connect a provider later. Elara checks manual events for overlaps." fields={[
    { name: "title", label: "Event title", type: "text", required: true, placeholder: "Leadership review" },
    { name: "startsAt", label: "Starts", type: "datetime-local", required: true },
    { name: "endsAt", label: "Ends", type: "datetime-local", required: true },
    { name: "timezone", label: "Time zone", type: "text", required: true, defaultValue: context.user.email ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC" },
    { name: "location", label: "Location or meeting link", type: "text", placeholder: "Boardroom or URL" },
  ]} initialRecords={events.map((event) => ({ id: event.id, title: event.title, subtitle: event.location, href: `/calendar/${event.id}`, badge: event.provider === "manual" ? "Manual" : event.provider || undefined, meta: [formatDateInZone(event.startsAt, event.timezone), `${formatTimeInZone(event.startsAt, event.timezone)}–${formatTimeInZone(event.endsAt, event.timezone)}`, event.timezone] }))} /></AppShell>;
}
