import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";
import { createV1Record, approveAutomationRun, runAutomation } from "@/lib/v1/service";
import { v1Schemas, type V1Resource } from "@/lib/v1/schemas";
import { RequestBodyError, enforceRateLimit, readJsonBody, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";

function isResource(value: string): value is V1Resource {
  return value in v1Schemas;
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`v1:create:${context.user.id}`, 60, 5 * 60_000);
  if (limited) return limited;
  const { resource } = await params;
  if (!isResource(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  try {
    const record = await createV1Record(resource, context.organization.id, context.user.id, await readJsonBody(request, 100_000));
    return NextResponse.json({ record }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Invalid input", issues: error.issues }, { status: 400 });
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Error && error.message.includes("Unique constraint")) return NextResponse.json({ error: "A record with that name already exists" }, { status: 409 });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save this record" }, { status: 500 });
  }
}

const actionSchema = z.object({ action: z.enum(["run", "approve"]), id: z.string().cuid() });

export async function PATCH(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const { resource } = await params;
  if (resource !== "automations") return NextResponse.json({ error: "Unsupported operation" }, { status: 405 });
  try {
    const input = actionSchema.parse(await readJsonBody(request, 10_000));
    const record = input.action === "run"
      ? await runAutomation(context.organization.id, context.user.id, input.id)
      : await approveAutomationRun(context.organization.id, context.user.id, input.id);
    return record ? NextResponse.json({ record }) : NextResponse.json({ error: "Not found or unavailable" }, { status: 404 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid automation action" }, { status: 400 });
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to run automation" }, { status: 500 });
  }
}
