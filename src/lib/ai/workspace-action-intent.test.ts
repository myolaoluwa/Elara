import { describe, expect, it } from "vitest";
import { isWorkspaceActionRequest } from "./workspace-action-intent";

describe("workspace action detection", () => {
  it("detects reminders and record mutations", () => {
    expect(isWorkspaceActionRequest("Remind me about the meeting at 1 PM and the birthday at 4 PM")).toBe(true);
    expect(isWorkspaceActionRequest("Create a critical task due Friday")).toBe(true);
    expect(isWorkspaceActionRequest("Mark the board task complete")).toBe(true);
  });

  it("supports a direct confirmation reply", () => {
    expect(isWorkspaceActionRequest("Go ahead")).toBe(true);
  });

  it("leaves read-only questions to grounded chat", () => {
    expect(isWorkspaceActionRequest("What is on my calendar today?")).toBe(false);
    expect(isWorkspaceActionRequest("Summarize the latest meeting")).toBe(false);
  });
});
