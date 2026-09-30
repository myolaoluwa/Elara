import { describe, expect, it } from "vitest";
import { automationSchema, eventSchema, expenseSchema, researchSchema, travelSchema } from "./schemas";

describe("V1 operation validation", () => {
  it("accepts a source-backed research request", () => {
    expect(researchSchema.parse({ topic: "Acme", subjectType: "company", question: "What changed?" })).toMatchObject({ topic: "Acme" });
  });

  it("rejects inverted trip and event dates", () => {
    const dates = { startsAt: "2026-10-02T10:00", endsAt: "2026-10-01T10:00", timezone: "UTC" };
    expect(travelSchema.safeParse({ ...dates, title: "Trip", destination: "Paris" }).success).toBe(false);
    expect(eventSchema.safeParse({ ...dates, title: "Summit", currency: "USD" }).success).toBe(false);
  });

  it("normalizes currencies and validates expense amounts", () => {
    const result = expenseSchema.parse({ description: "Taxi", category: "Transport", amount: "42.50", currency: "usd", incurredAt: "2026-09-30", reimbursable: true });
    expect(result).toMatchObject({ amount: 42.5, currency: "USD" });
    expect(expenseSchema.safeParse({ ...result, amount: -1 }).success).toBe(false);
  });

  it("defaults automations to approval required", () => {
    const result = automationSchema.parse({ name: "Meeting follow-up", trigger: "meeting.completed", action: "create_follow_up", actionTitle: "Review meeting follow-up" });
    expect(result.requiresApproval).toBe(true);
  });
});
