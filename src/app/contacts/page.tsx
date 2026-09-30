import { AppShell } from "@/components/app-shell";
import { CollectionPage } from "@/components/collection-page";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Contacts" };
export default async function ContactsPage() {
  const context = await requireWorkspaceContext();
  const contacts = await prisma.contact.findMany({ where: { organizationId: context.organization.id }, include: { company: true }, orderBy: { name: "asc" } });
  return <AppShell workspaceName={context.organization.name} userName={context.user.name}><CollectionPage eyebrow="Relationships" title="Contacts" subtitle="Remember who people are, how they relate, and what remains open." action="Add contact" resource="contacts" emptyTitle="Add the people who matter" emptyBody="Each contact becomes a durable link across meetings, email, tasks, and commitments." fields={[
    { name: "name", label: "Name", type: "text", required: true, placeholder: "John Adeyemi" }, { name: "email", label: "Email", type: "email", placeholder: "john@company.com" }, { name: "role", label: "Role", type: "text", placeholder: "Managing Director" }, { name: "companyName", label: "Company", type: "text", placeholder: "ABC Ltd" }, { name: "relationship", label: "Relationship", type: "text", placeholder: "Partner" }, { name: "notes", label: "Relationship notes", type: "textarea", placeholder: "Preferences, context, and useful history" },
  ]} initialRecords={contacts.map((contact) => ({ id: contact.id, title: contact.name, subtitle: [contact.role, contact.company?.name].filter(Boolean).join(" · "), meta: [contact.email || "", contact.relationship || ""], badge: contact.relationship || undefined }))} /></AppShell>;
}
