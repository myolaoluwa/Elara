import { describe, expect, it } from "vitest";
import { addReminder, getDueReminders, loadReminders, removeReminder } from "./reminder-engine";

if (!("localStorage" in globalThis)) {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
    configurable: true,
  });
}

describe("browser reminder engine", () => {
  it("stores reminders and exposes only due items", () => {
    const now = new Date("2026-10-01T10:00:00.000Z");
    const future = new Date(now.getTime() + 60_000).toISOString();
    const past = new Date(now.getTime() - 60_000).toISOString();

    const items = [
      { id: "custom-1", title: "Wake up", triggerAt: future, kind: "custom" as const, createdAt: now.toISOString() },
      { id: "task-1", title: "Send summary", triggerAt: past, kind: "task" as const, createdAt: now.toISOString() },
    ];

    localStorage.clear();
    items.forEach((item) => addReminder(item));

    expect(loadReminders()).toHaveLength(2);
    expect(getDueReminders(now)).toEqual([
      expect.objectContaining({ id: "task-1", title: "Send summary" }),
    ]);

    removeReminder("task-1");
    expect(loadReminders()).toHaveLength(1);
  });
});
