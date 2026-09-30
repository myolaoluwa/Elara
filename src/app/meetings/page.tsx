import { AppShell } from "@/components/app-shell";
import { CollectionPage } from "@/components/collection-page";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Meetings" };
export default async function MeetingsPage() {
  const context = await requireWorkspaceContext();
  const meetings = await prisma.meeting.findMany({ where: { organizationId: context.organization.id }, include: { attendees: true, transcriptions: { select: { id: true } } }, orderBy: { startsAt: "desc" } });
  return <AppShell workspaceName={context.organization.name} userName={context.user.name}><CollectionPage eyebrow="Meeting lifecycle" title="Meetings" subtitle="Prepare, capture the record, and turn discussion into accountable next steps." action="Add meeting" resource="meetings" emptyTitle="No meetings captured" emptyBody="Add a meeting to prepare its agenda, capture a transcript, and generate reviewable minutes." fields={[
    { name: "title", label: "Meeting title", type: "text", required: true, placeholder: "ABC Ltd review" }, { name: "startsAt", label: "Starts", type: "datetime-local", required: true }, { name: "endsAt", label: "Ends", type: "datetime-local", required: true }, { name: "location", label: "Location or link", type: "text" }, { name: "attendees", label: "Attendees", type: "text", placeholder: "John Adeyemi, Ada Cole" }, { name: "agenda", label: "Agenda", type: "textarea", placeholder: "What needs to be decided?" },
  ]} initialRecords={meetings.map((meeting) => ({ id: meeting.id, title: meeting.title, subtitle: meeting.agenda, href: `/meetings/${meeting.id}`, badge: meeting.transcriptions.length ? "Captured" : meeting.status.replaceAll("_", " "), meta: [new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(meeting.startsAt), meeting.attendees.map((item) => item.name).join(", ")] }))} /></AppShell>;
}
