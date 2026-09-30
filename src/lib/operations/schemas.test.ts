import { describe, expect, it } from "vitest";
import { calendarEventSchema, contactSchema, emailSchema } from "./schemas";

describe("operation input schemas", () => {
  it("rejects calendar events that end before they start", () => {
    const result = calendarEventSchema.safeParse({ title: "Conflict", startsAt: "2026-10-02T15:00", endsAt: "2026-10-02T14:00", timezone: "UTC" });
    expect(result.success).toBe(false);
  });

  it("accepts a minimally useful contact", () => {
    expect(contactSchema.parse({ name: "  John Adeyemi  ", email: "john@example.com" }).name).toBe("John Adeyemi");
  });

  it("requires source content for imported email", () => {
    expect(emailSchema.safeParse({ subject: "Update", sender: "john@example.com", receivedAt: "2026-10-02T10:00", bodyText: "" }).success).toBe(false);
  });
});
