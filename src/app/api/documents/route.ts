import path from "node:path";
import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { storeDocument } from "@/lib/documents/storage";
import { extractDocumentText } from "@/lib/documents/extract";

const allowedExtensions = new Set([".pdf", ".docx", ".xlsx", ".pptx", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".md", ".csv", ".rtf"]);
const maxBytes = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
  if (!allowedExtensions.has(path.extname(file.name).toLowerCase())) return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
  if (file.size > maxBytes) return NextResponse.json({ error: "Files must be 25 MB or smaller" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const storageKey = await storeDocument(context.organization.id, file.name, bytes);
  const document = await prisma.document.create({ data: { organizationId: context.organization.id, name: file.name, mimeType: file.type || "application/octet-stream", storageKey, sizeBytes: file.size, status: "PROCESSING" } });
  try {
    const extractedText = await extractDocumentText(file.name, bytes);
    await prisma.document.update({ where: { id: document.id }, data: { status: "READY", extractedText } });
  } catch {
    await prisma.document.update({ where: { id: document.id }, data: { status: "FAILED" } });
  }
  await prisma.activityLog.create({ data: { organizationId: context.organization.id, actorUserId: context.user.id, actorType: "user", action: "document.uploaded", entityType: "document", entityId: document.id, source: "documents" } });
  return NextResponse.json({ document: await prisma.document.findUnique({ where: { id: document.id } }) }, { status: 201 });
}
