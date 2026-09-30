import { AppShell } from "@/components/app-shell";
import { CollectionPage } from "@/components/collection-page";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Follow-ups" };
export default async function FollowUpsPage() {
  const context = await requireWorkspaceContext();
  const records = await prisma.followUp.findMany({ where: { organizationId: context.organization.id }, include: { contact: true }, orderBy: [{ status: "asc" }, { dueAt: "asc" }] });
  return <AppShell workspaceName={context.organization.name} userName={context.user.name}><CollectionPage eyebrow="External memory" title="Follow-ups" subtitle="Track every reply, approval, promise, and outstanding request." action="Create follow-up" resource="follow-ups" allowResolve emptyTitle="Nothing is waiting" emptyBody="Add an outstanding request and Elara will keep its context visible until it is resolved." fields={[
    { name: "title", label: "What are you waiting for?", type: "text", required: true, placeholder: "John to send the proposal" }, { name: "contactName", label: "Person", type: "text", placeholder: "Existing contact name" }, { name: "dueAt", label: "Follow up on", type: "date" }, { name: "notes", label: "Context", type: "textarea", placeholder: "Original request and useful context" },
  ]} initialRecords={records.map((record) => ({ id: record.id, title: record.title, subtitle: record.notes, badge: record.status === "RESOLVED" ? "Resolved" : isOverdue(record.dueAt) ? "Overdue" : "Open", resolved: record.status === "RESOLVED", meta: [record.contact?.name || "", record.dueAt ? `Due ${formatDate(record.dueAt)}` : "No deadline"] }))} /></AppShell>;
}
function isOverdue(value: Date | null) { return Boolean(value && value < new Date()); }
function formatDate(value: Date) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(value); }
