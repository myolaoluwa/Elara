import { prisma } from "@/lib/prisma";

export async function buildWorkspaceContext(organizationId: string) {
  const now = new Date();
  const [tasks, events, meetings, followUps, contacts, emails, documents, projects, decisions, commitments] = await Promise.all([
    prisma.task.findMany({ where: { organizationId }, select: { title: true, status: true, priority: true, dueAt: true, owner: { select: { name: true } } }, orderBy: { dueAt: "asc" }, take: 100 }),
    prisma.calendarEvent.findMany({ where: { organizationId, endsAt: { gte: now } }, select: { title: true, startsAt: true, endsAt: true, location: true, timezone: true }, orderBy: { startsAt: "asc" }, take: 50 }),
    prisma.meeting.findMany({ where: { organizationId }, select: { title: true, startsAt: true, status: true, agenda: true, notes: { select: { kind: true, content: true, confirmed: true } } }, orderBy: { startsAt: "desc" }, take: 30 }),
    prisma.followUp.findMany({ where: { organizationId, status: { in: ["OPEN", "SNOOZED"] } }, select: { title: true, dueAt: true, notes: true, contact: { select: { name: true } } }, orderBy: { dueAt: "asc" }, take: 50 }),
    prisma.contact.findMany({ where: { organizationId }, select: { name: true, role: true, relationship: true, notes: true, company: { select: { name: true } } }, take: 100 }),
    prisma.email.findMany({ where: { organizationId }, select: { subject: true, sender: true, bodyText: true, receivedAt: true, isImportant: true }, orderBy: { receivedAt: "desc" }, take: 30 }),
    prisma.document.findMany({ where: { organizationId, status: "READY" }, select: { name: true, extractedText: true, tagsJson: true }, orderBy: { updatedAt: "desc" }, take: 20 }),
    prisma.project.findMany({ where: { organizationId }, select: { name: true, status: true, description: true }, take: 50 }),
    prisma.decision.findMany({ where: { organizationId }, select: { title: true, rationale: true, decidedAt: true, confirmed: true }, orderBy: { decidedAt: "desc" }, take: 50 }),
    prisma.commitment.findMany({ where: { organizationId }, select: { description: true, dueAt: true, status: true, confirmed: true, contact: { select: { name: true } } }, take: 50 }),
  ]);

  return { generatedAt: now.toISOString(), tasks, events, meetings, followUps, contacts, emails, documents, projects, decisions, commitments };
}

export type WorkspaceContextSnapshot = Awaited<ReturnType<typeof buildWorkspaceContext>>;

export function groundedFallback(question: string, context: WorkspaceContextSnapshot) {
  const query = question.toLowerCase();
  if (query.includes("overdue")) {
    const overdue = context.tasks.filter((task) => task.dueAt && task.dueAt < new Date() && task.status !== "DONE");
    return overdue.length ? `You have ${overdue.length} overdue task${overdue.length === 1 ? "" : "s"}:\n${overdue.map((task) => `• ${task.title} — due ${task.dueAt?.toLocaleDateString()}`).join("\n")}` : "There are no overdue tasks in this workspace.";
  }
  if (query.includes("waiting") || query.includes("follow")) {
    return context.followUps.length ? `You are waiting on ${context.followUps.length} item${context.followUps.length === 1 ? "" : "s"}:\n${context.followUps.map((item) => `• ${item.title}${item.contact ? ` — ${item.contact.name}` : ""}`).join("\n")}` : "There are no open follow-ups in this workspace.";
  }
  if (query.includes("today") || query.includes("happening")) {
    const today = new Date().toDateString();
    const events = context.events.filter((event) => event.startsAt.toDateString() === today);
    const tasks = context.tasks.filter((task) => task.dueAt?.toDateString() === today && task.status !== "DONE");
    return `Today: ${events.length} meeting or calendar event${events.length === 1 ? "" : "s"}, ${tasks.length} task${tasks.length === 1 ? "" : "s"} due, and ${context.followUps.length} open follow-up${context.followUps.length === 1 ? "" : "s"}.`;
  }
  if (query.includes("decision")) {
    return context.decisions.length ? `Confirmed workspace decisions:\n${context.decisions.filter((item) => item.confirmed).map((item) => `• ${item.title}`).join("\n") || "No confirmed decisions."}` : "There are no recorded decisions in this workspace.";
  }
  return "I can answer questions about tasks, today’s schedule, follow-ups, decisions, contacts, meetings, imported email, and documents. No AI provider is configured, so I’m limiting this response to deterministic workspace facts.";
}
