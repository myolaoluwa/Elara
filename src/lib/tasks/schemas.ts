import { z } from "zod";

export const taskStatuses = ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as const;
export const taskPriorities = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(180),
  notes: z.string().trim().max(5000).nullable().optional(),
  priority: z.enum(taskPriorities).default("NORMAL"),
  dueAt: z.iso.date().nullable().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(180).optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
  priority: z.enum(taskPriorities).optional(),
  status: z.enum(taskStatuses).optional(),
  dueAt: z.iso.date().nullable().optional(),
}).refine((value) => Object.keys(value).length > 0, "At least one field is required");

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export function dueDateFromInput(value: string | null | undefined) {
  return value ? new Date(`${value}T12:00:00.000Z`) : null;
}
