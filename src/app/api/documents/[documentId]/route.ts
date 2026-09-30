import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { readDocument } from "@/lib/documents/storage";

export async function GET(_: Request, { params }: { params: Promise<{ documentId: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { documentId } = await params;
  const document = await prisma.document.findFirst({ where: { id: documentId, organizationId: context.organization.id } });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const bytes = await readDocument(document.storageKey);
  return new Response(new Uint8Array(bytes), { headers: {
    "content-type": document.mimeType,
    "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.name)}`,
    "x-content-type-options": "nosniff",
    "cache-control": "private, no-store",
    "content-security-policy": "sandbox; default-src 'none'",
  } });
}
