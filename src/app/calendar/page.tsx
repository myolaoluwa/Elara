import { AppShell } from "@/components/app-shell";
import { CollectionPage } from "@/components/collection-page";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";

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
  ]} initialRecords={events.map((event) => ({ id: event.id, title: event.title, subtitle: event.location, href: `/calendar/${event.id}`, badge: event.provider === "manual" ? "Manual" : event.provider || undefined, meta: [formatDateTime(event.startsAt), `${formatTime(event.startsAt)}–${formatTime(event.endsAt)}`, event.timezone] }))} /></AppShell>;
}
function formatDateTime(value: Date) { return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(value); }
function formatTime(value: Date) { return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(value); }
