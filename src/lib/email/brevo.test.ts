import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sendTransactionalEmail } from "./brevo";

const message = {
  to: { email: "person@example.com" },
  subject: "Verification code",
  textContent: "Your code is 123456.",
  htmlContent: "<p>Your code is 123456.</p>",
  tag: "authentication",
};

describe("Brevo transactional email", () => {
  beforeEach(() => {
    vi.stubEnv("BREVO_API_KEY", "test-api-key");
    vi.stubEnv("BREVO_SENDER_EMAIL", "sender@example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("includes Brevo's rejection reason without exposing email addresses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "sender_not_validated",
      message: "Sender sender@example.com is not validated",
    }), { status: 400, headers: { "content-type": "application/json" } })));

    await expect(sendTransactionalEmail(message)).rejects.toThrow(
      "Brevo rejected the email request with status 400 (sender_not_validated: Sender [email] is not validated)",
    );
  });

  it("accepts successful provider responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ messageId: "<test-message-id>" }), {
      status: 201,
      headers: { "content-type": "application/json" },
    })));

    await expect(sendTransactionalEmail(message)).resolves.toBe("<test-message-id>");
  });
});