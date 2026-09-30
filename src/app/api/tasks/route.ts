import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getWorkspaceContext } from "@/lib/workspace";
import { createTaskSchema } from "@/lib/tasks/schemas";
import { createTask, listTasks } from "@/lib/tasks/service";

export async function GET() {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ tasks: await listTasks(context.organization.id) });
}

export async function POST(request: Request) {
  const context = await getWorkspaceContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const input = createTaskSchema.parse(await request.json());
    const task = await createTask(context.organization.id, context.user.id, input);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid task", issues: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to create task" }, { status: 500 });
  }
}
