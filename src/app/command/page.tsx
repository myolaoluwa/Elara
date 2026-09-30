import { AppShell } from "@/components/app-shell";
import { CommandCenter } from "@/components/command-center";
import { requireWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Command center" };
export default async function CommandPage({ searchParams }: { searchParams: Promise<{ conversation?: string }> }) {
  const context = await requireWorkspaceContext();
  const { conversation: requestedId } = await searchParams;
  const history = await prisma.aIConversation.findMany({ where: { organizationId: context.organization.id }, orderBy: { updatedAt: "desc" }, take: 20 });
  const selected = requestedId ? await prisma.aIConversation.findFirst({ where: { id: requestedId, organizationId: context.organization.id }, include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } } }) : null;
  return <AppShell workspaceName={context.organization.name} userName={context.user.name}><CommandCenter initialConversationId={selected?.id} initialMessages={selected?.messages.map((message) => ({ role: message.role as "user" | "assistant", content: message.content }))} history={history.map((item) => ({ id: item.id, title: item.title, updatedAt: item.updatedAt.toISOString() }))} /></AppShell>;
}
