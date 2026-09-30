import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { dueDateFromInput, type CreateTaskInput, type UpdateTaskInput } from "./schemas";

const taskSelect = {
  id: true,
  title: true,
  notes: true,
  status: true,
  priority: true,
  dueAt: true,
  createdAt: true,
  updatedAt: true,
  owner: { select: { id: true, name: true } },
} satisfies Prisma.TaskSelect;

export type TaskListItem = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

export function scopedTaskWhere(organizationId: string, taskId?: string) {
  return { organizationId, ...(taskId ? { id: taskId } : {}) };
}

export async function listTasks(organizationId: string) {
  return prisma.task.findMany({
    where: scopedTaskWhere(organizationId),
    select: taskSelect,
    orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
  });
}

export async function createTask(organizationId: string, actorUserId: string, input: CreateTaskInput) {
  return prisma.$transaction(async (transaction) => {
    const task = await transaction.task.create({
      data: {
        organizationId,
        ownerId: actorUserId,
        title: input.title,
        notes: input.notes || null,
        priority: input.priority,
        dueAt: dueDateFromInput(input.dueAt),
        sourceType: "manual",
      },
      select: taskSelect,
    });

    await transaction.activityLog.create({
      data: {
        organizationId,
        actorUserId,
        actorType: "user",
        action: "task.created",
        entityType: "task",
        entityId: task.id,
        source: "tasks",
        resultJson: JSON.stringify({ title: task.title, priority: task.priority }),
      },
    });

    return task;
  });
}

export async function updateTask(
  organizationId: string,
  actorUserId: string,
  taskId: string,
  input: UpdateTaskInput,
) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.task.findFirst({ where: scopedTaskWhere(organizationId, taskId) });
    if (!existing) return null;

    const task = await transaction.task.update({
      where: { id: existing.id },
      data: {
        ...input,
        notes: input.notes === "" ? null : input.notes,
        dueAt: input.dueAt === undefined ? undefined : dueDateFromInput(input.dueAt),
        completedAt: input.status === "DONE" ? new Date() : input.status ? null : undefined,
      },
      select: taskSelect,
    });

    await transaction.activityLog.create({
      data: {
        organizationId,
        actorUserId,
        actorType: "user",
        action: "task.updated",
        entityType: "task",
        entityId: task.id,
        source: "tasks",
        resultJson: JSON.stringify(input),
      },
    });

    return task;
  });
}
