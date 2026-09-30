import { describe, expect, it } from "vitest";
import { createTaskSchema, dueDateFromInput, updateTaskSchema } from "./schemas";
import { scopedTaskWhere } from "./service";

describe("task input", () => {
  it("trims a valid manual task", () => {
    const result = createTaskSchema.parse({ title: "  Send the briefing  ", priority: "HIGH", dueAt: "2026-10-02" });
    expect(result.title).toBe("Send the briefing");
  });

  it("rejects empty tasks and unknown statuses", () => {
    expect(createTaskSchema.safeParse({ title: " " }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ status: "WAITING" }).success).toBe(false);
  });

  it("always adds organization scope to task lookups", () => {
    expect(scopedTaskWhere("org-1", "task-1")).toEqual({ organizationId: "org-1", id: "task-1" });
  });

  it("uses a stable UTC time for date-only deadlines", () => {
    expect(dueDateFromInput("2026-10-02")?.toISOString()).toBe("2026-10-02T12:00:00.000Z");
  });
});
