import { AppShell } from "@/components/app-shell";
import { MemoryCenter } from "@/components/memory-center";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Executive memory" };
export default async function MemoryPage() {
  const context = await requireWorkspaceContext(); const organizationId = context.organization.id;
  const [projects, decisions, commitments] = await Promise.all([
    prisma.project.findMany({ where: { organizationId }, orderBy: { updatedAt: "desc" } }),
    prisma.decision.findMany({ where: { organizationId }, orderBy: { decidedAt: "desc" } }),
    prisma.commitment.findMany({ where: { organizationId }, include: { contact: true }, orderBy: { dueAt: "asc" } }),
  ]);
  return <AppShell workspaceName={context.organization.name} userName={context.user.name}><MemoryCenter records={{ projects: projects.map((item) => ({ id: item.id, title: item.name, subtitle: item.description, badge: item.status.replaceAll("_", " "), meta: [`Updated ${item.updatedAt.toLocaleDateString()}`] })), decisions: decisions.map((item) => ({ id: item.id, title: item.title, subtitle: item.rationale, badge: item.confirmed ? "Confirmed" : "Unconfirmed", meta: [item.decidedAt.toLocaleDateString()] })), commitments: commitments.map((item) => ({ id: item.id, title: item.description, badge: item.confirmed ? item.status : "Unconfirmed", meta: [item.contact?.name || "", item.dueAt ? `Due ${item.dueAt.toLocaleDateString()}` : "No deadline"] })) }} /></AppShell>;
}
