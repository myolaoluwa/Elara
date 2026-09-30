import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";
import { updateTaskSchema } from "@/lib/tasks/schemas";
import { updateTask } from "@/lib/tasks/service";
import { RequestBodyError, enforceRateLimit, readJsonBody, rejectCrossOrigin, rejectReadOnlyRole } from "@/lib/http/security";

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const crossOrigin = rejectCrossOrigin(request);
  if (crossOrigin) return crossOrigin;
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const readOnly = rejectReadOnlyRole(context.role);
  if (readOnly) return readOnly;
  const limited = enforceRateLimit(`tasks:update:${context.user.id}`, 120, 5 * 60_000);
  if (limited) return limited;

  try {
    const input = updateTaskSchema.parse(await readJsonBody(request, 10_000));
    const { taskId } = await params;
    const task = await updateTask(context.organization.id, context.user.id, taskId, input);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid task update", issues: error.issues }, { status: 400 });
    }
    if (error instanceof RequestBodyError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to update task" }, { status: 500 });
  }
}
