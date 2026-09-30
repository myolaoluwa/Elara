import { describe, expect, it } from "vitest";
import { personalizeEmail, stripEmDashes } from "./personalization";

describe("email personalization", () => {
  it("addresses and signs each recipient", () => {
    const result = personalizeEmail({ toEmail: "ADA@EXAMPLE.COM", toName: "Ada Lovelace", subject: "Update for {{firstName}}", bodyText: "Here is your update.", fromName: "Racheal Okon" });
    expect(result.toEmail).toBe("ada@example.com");
    expect(result.subject).toBe("Update for Ada");
    expect(result.bodyText).toContain("Hi Ada,");
    expect(result.bodyText).toContain("Best,\nRacheal Okon");
  });

  it("removes em dashes before delivery", () => {
    expect(stripEmDashes("Clear — professional — concise")).not.toContain("—");
  });
});
