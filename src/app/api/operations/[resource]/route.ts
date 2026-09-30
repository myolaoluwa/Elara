import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";
import { operationSchemas, type OperationResource } from "@/lib/operations/schemas";
import { createOperationRecord, resolveFollowUp } from "@/lib/operations/service";
import { RequestBodyError, enforceRateLimit, readJsonBody, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";

function isResource(value: string): value is OperationResource {
  return value in operationSchemas;
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`operations:create:${context.user.id}`, 100, 5 * 60_000);
  if (limited) return limited;
  const { resource } = await params;
  if (!isResource(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  try {
    const record = await createOperationRecord(resource, context.organization.id, context.user.id, await readJsonBody(request, 150_000));
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Invalid input", issues: error.issues }, { status: 400 });
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to save this record" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`operations:update:${context.user.id}`, 100, 5 * 60_000);
  if (limited) return limited;
  const { resource } = await params;
  if (resource !== "follow-ups") return NextResponse.json({ error: "Unsupported operation" }, { status: 405 });
  let body: unknown;
  try {
    body = await readJsonBody(request, 10_000);
  } catch (error) {
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (!("id" in body) || typeof body.id !== "string") return NextResponse.json({ error: "Record ID required" }, { status: 400 });
  const record = await resolveFollowUp(context.organization.id, context.user.id, body.id);
  return record ? NextResponse.json({ record }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
