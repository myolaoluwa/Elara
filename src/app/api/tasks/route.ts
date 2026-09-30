import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";
import { createTaskSchema } from "@/lib/tasks/schemas";
import { createTask, listTasks } from "@/lib/tasks/service";
import { RequestBodyError, enforceRateLimit, readJsonBody, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  return NextResponse.json({ tasks: await listTasks(context.organization.id) });
}

export async function POST(request: Request) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = enforceRateLimit(`tasks:create:${context.user.id}`, 60, 5 * 60_000);
  if (limited) return limited;

  try {
    const input = createTaskSchema.parse(await readJsonBody(request, 10_000));
    const task = await createTask(context.organization.id, context.user.id, input);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid task", issues: error.issues }, { status: 400 });
    }
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to create task" }, { status: 500 });
  }
}
