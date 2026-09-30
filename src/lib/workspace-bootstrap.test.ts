import { describe, expect, it } from "vitest";
import { personalWorkspaceSlug } from "./workspace-identity";

describe("personal workspace identity", () => {
  it("is stable for one user and distinct across users", () => {
    expect(personalWorkspaceSlug("user-a")).toBe("workspace-user-a");
    expect(personalWorkspaceSlug("user-a")).not.toBe(personalWorkspaceSlug("user-b"));
  });
});
