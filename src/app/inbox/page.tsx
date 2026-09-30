import { AppShell } from "@/components/app-shell";
import { CollectionPage } from "@/components/collection-page";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Inbox" };
export default async function InboxPage() {
  const context = await requireWorkspaceContext();
  const emails = await prisma.email.findMany({ where: { organizationId: context.organization.id }, orderBy: { receivedAt: "desc" }, take: 100 });
  return <AppShell workspaceName={context.organization.name} userName={context.user.name}><CollectionPage eyebrow="Communication" title="Inbox" subtitle="Bring important communication into the workspace without implying an account is connected." action="Import email" resource="inbox" emptyTitle="No email imported" emptyBody="Paste an important message to make it searchable and available to the Command Center. Provider sync can be connected later." fields={[
    { name: "subject", label: "Subject", type: "text", required: true }, { name: "sender", label: "Sender", type: "text", required: true, placeholder: "name@company.com" }, { name: "receivedAt", label: "Received", type: "datetime-local", required: true }, { name: "bodyText", label: "Message", type: "textarea", required: true }, { name: "isImportant", label: "Mark as important", type: "checkbox" },
  ]} initialRecords={emails.map((email) => ({ id: email.id, title: email.subject, subtitle: email.bodyText?.slice(0, 180), href: `/inbox/${email.id}`, badge: email.isImportant ? "Important" : "Email", meta: [email.sender, new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(email.receivedAt)] }))} /></AppShell>;
}
