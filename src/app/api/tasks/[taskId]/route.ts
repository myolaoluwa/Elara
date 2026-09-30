import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";
import { updateTaskSchema } from "@/lib/tasks/schemas";
import { updateTask } from "@/lib/tasks/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = updateTaskSchema.parse(await request.json());
    const { taskId } = await params;
    const task = await updateTask(context.organization.id, context.user.id, taskId, input);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ task });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid task update", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to update task" }, { status: 500 });
  }
}
