import { describe, expect, it } from "vitest";
import { enforceRateLimit, readJsonBody, rejectCrossOrigin, rejectOversizedBody, rejectReadOnlyRole } from "./security";

describe("HTTP security helpers", () => {
  it("rejects a cross-origin mutation", () => {
    const request = new Request("https://elara.example/api/tasks", { headers: { origin: "https://attacker.example" } });
    expect(rejectCrossOrigin(request)?.status).toBe(403);
  });

  it("accepts the matching forwarded origin", () => {
    const request = new Request("http://internal/api/tasks", {
      headers: { origin: "https://elara.example", "x-forwarded-host": "elara.example", "x-forwarded-proto": "https" },
    });
    expect(rejectCrossOrigin(request)).toBeNull();
  });

  it("rejects a declared oversized body", () => {
    const request = new Request("https://elara.example/api/documents", { headers: { "content-length": "500" } });
    expect(rejectOversizedBody(request, 100)?.status).toBe(413);
  });

  it("keeps viewer memberships read-only", () => {
    expect(rejectReadOnlyRole("VIEWER")?.status).toBe(403);
    expect(rejectReadOnlyRole("MEMBER")).toBeNull();
  });

  it("returns a controlled error for malformed JSON", async () => {
    const request = new Request("https://elara.example/api/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{broken",
    });
    await expect(readJsonBody(request)).rejects.toMatchObject({ status: 400, message: "Malformed JSON" });
  });

  it("limits repeated expensive requests", () => {
    const key = `test-${crypto.randomUUID()}`;
    expect(enforceRateLimit(key, 1, 60_000)).toBeNull();
    expect(enforceRateLimit(key, 1, 60_000)?.status).toBe(429);
  });
});
