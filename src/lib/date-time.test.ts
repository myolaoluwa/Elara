import { describe, expect, it } from "vitest";
import { dateKeyInZone, formatTimeInZone, toDateTimeLocalInZone } from "./date-time";

describe("workspace date and time formatting", () => {
  const instant = new Date("2026-10-01T20:00:00.000Z");

  it("shows a stored instant in the event timezone", () => {
    expect(formatTimeInZone(instant, "America/Los_Angeles")).toBe("1:00 PM");
    expect(toDateTimeLocalInZone(instant, "America/Los_Angeles")).toBe("2026-10-01T13:00");
  });

  it("uses the workspace timezone when deciding which day an event belongs to", () => {
    const lateEvening = new Date("2026-10-02T02:00:00.000Z");
    expect(dateKeyInZone(lateEvening, "America/Los_Angeles")).toBe("2026-10-01");
    expect(dateKeyInZone(lateEvening, "UTC")).toBe("2026-10-02");
  });
});
