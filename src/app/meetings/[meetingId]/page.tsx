import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MeetingWorkspace } from "@/components/meeting-workspace";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";

export default async function MeetingDetailPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const context = await requireWorkspaceContext(); const { meetingId } = await params;
  const meeting = await prisma.meeting.findFirst({ where: { id: meetingId, organizationId: context.organization.id }, include: { attendees: true, transcriptions: { orderBy: { createdAt: "desc" } }, notes: true } });
  if (!meeting) notFound();
  const notes = new Map(meeting.notes.map((note) => [note.kind, note.content]));
  const analysis = notes.has("ai_summary") ? { summary: notes.get("ai_summary")!, decisions: parseList(notes.get("decisions")), actionItems: parseActions(notes.get("action_items")), questions: parseList(notes.get("questions")), nextSteps: parseList(notes.get("next_steps")) } : null;
  return <AppShell workspaceName={context.organization.name} userName={context.user.name}><MeetingWorkspace meetingId={meeting.id} title={meeting.title} date={new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(meeting.startsAt)} agenda={meeting.agenda} attendees={meeting.attendees.map((item) => item.name)} initialTranscript={meeting.transcriptions[0]?.text || ""} initialAnalysis={analysis} /></AppShell>;
}
function parseList(value?: string) { try { return value ? JSON.parse(value) as string[] : []; } catch { return []; } }
function parseActions(value?: string) { try { return value ? JSON.parse(value) as { task: string; owner: string | null; deadline: string | null }[] : []; } catch { return []; } }
