import { AppShell } from "@/components/app-shell";
import { TaskBoard } from "@/components/task-board";
import { listTasks } from "@/lib/tasks/service";
import { requireWorkspaceContext } from "@/lib/workspace";

export const metadata = { title: "Tasks" };

export default async function TasksPage() {
  const context = await requireWorkspaceContext();
  const tasks = await listTasks(context.organization.id);
  const serialized = tasks.map((task) => ({
    ...task,
    dueAt: task.dueAt?.toISOString() ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }));

  return (
    <AppShell workspaceName={context.organization.name} userName={context.user.name}>
      <TaskBoard initialTasks={serialized} />
    </AppShell>
  );
}
