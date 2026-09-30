import { NextResponse } from "next/server";
import { getWorkspaceContext } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { removeDocument, storeDocument } from "@/lib/documents/storage";
import { extractDocumentText } from "@/lib/documents/extract";
import { safeDocumentName, validateDocumentBytes } from "@/lib/documents/validation";
import { enforceRateLimit, rejectCrossOrigin, rejectOversizedBody, rejectReadOnlyRole } from "@/lib/http/security";

const maxFileBytes = 25 * 1024 * 1024;
const maxRequestBytes = maxFileBytes + 1024 * 1024;

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const oversized = rejectOversizedBody(request, maxRequestBytes);
  if (oversized) return oversized;

  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`documents:upload:${context.user.id}`, 10, 10 * 60_000);
  if (limited) return limited;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart upload" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "The selected file is empty" }, { status: 400 });
  if (file.size > maxFileBytes) return NextResponse.json({ error: "Files must be 25 MB or smaller" }, { status: 413 });

  const name = safeDocumentName(file.name);
  const bytes = Buffer.from(await file.arrayBuffer());
  const validated = validateDocumentBytes(name, bytes);
  if (!validated) return NextResponse.json({ error: "The file contents do not match a supported file type" }, { status: 400 });

  const storageKey = await storeDocument(context.organization.id, name, bytes);
  let document;
  try {
    document = await prisma.document.create({
      data: {
        organizationId: context.organization.id,
        name,
        mimeType: validated.mimeType,
        storageKey,
        sizeBytes: file.size,
        status: "PROCESSING",
      },
    });
  } catch (error) {
    await removeDocument(storageKey);
    throw error;
  }

  let extractedText: string | null = null;
  let finalStatus: "READY" | "FAILED" = "FAILED";
  try {
    extractedText = await extractDocumentText(name, bytes);
    await prisma.document.update({ where: { id: document.id }, data: { status: "READY", extractedText } });
    finalStatus = "READY";
  } catch {
    await prisma.document.update({ where: { id: document.id }, data: { status: "FAILED" } });
  }
  await prisma.activityLog.create({
    data: { organizationId: context.organization.id, actorUserId: context.user.id, actorType: "user", action: "document.uploaded", entityType: "document", entityId: document.id, source: "documents" },
  });

  return NextResponse.json({
    document: {
      id: document.id,
      name: document.name,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      status: finalStatus,
      extractedText: extractedText?.slice(0, 220) || null,
      createdAt: document.createdAt,
    },
  }, { status: 201 });
}
