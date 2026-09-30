import { AppShell } from "@/components/app-shell";
import { DocumentLibrary } from "@/components/document-library";
import { prisma } from "@/lib/prisma";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Documents" };
export default async function DocumentsPage() { const context = await requireWorkspaceContext(); const documents = await prisma.document.findMany({ where: { organizationId: context.organization.id }, orderBy: { createdAt: "desc" } }); return <AppShell workspaceName={context.organization.name} userName={context.user.name}><DocumentLibrary initialDocuments={documents.map((document) => ({ id: document.id, name: document.name, mimeType: document.mimeType, sizeBytes: document.sizeBytes, status: document.status, excerpt: document.extractedText?.slice(0, 220) || null, createdAt: document.createdAt.toISOString() }))} /></AppShell>; }
