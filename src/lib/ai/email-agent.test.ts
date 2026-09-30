import { describe, expect, it } from "vitest";
import { isEmailActionRequest } from "./email-intent";

describe("email action detection", () => {
  it("detects explicit communication actions", () => {
    expect(isEmailActionRequest("Send the board an update tomorrow morning")).toBe(true);
    expect(isEmailActionRequest("Draft a reply to Ada")).toBe(true);
  });

  it("leaves read-only email questions to normal chat", () => {
    expect(isEmailActionRequest("What important emails arrived today?")).toBe(false);
  });
});
