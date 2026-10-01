import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { EmailWorkspace } from "@/components/email-workspace";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";
export default async function EmailPage({ params }: { params: Promise<{ emailId: string }> }) { const context = await requireWorkspaceContext(); const { emailId } = await params; const [email, mailbox] = await Promise.all([prisma.email.findFirst({ where: { id: emailId, organizationId: context.organization.id } }), prisma.mailboxConnection.findFirst({ where: { organizationId: context.organization.id, userId: context.user.id, provider: "GMAIL", status: "ACTIVE" }, select: { id: true } })]); if (!email) notFound(); return <AppShell workspaceName={context.organization.name} userName={context.user.name}><EmailWorkspace mailboxConnected={Boolean(mailbox)} email={{ id: email.id, subject: email.subject, sender: email.sender, receivedAt: new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(email.receivedAt), bodyText: email.bodyText || "" }} /></AppShell>; }
