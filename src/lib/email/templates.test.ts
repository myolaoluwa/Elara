import { describe, expect, it } from "vitest";
import { authOTPEmail, passwordResetEmail, workspaceInvitationEmail } from "./templates";

describe("transactional email templates", () => {
  it.each([
    ["email-verification", "Verify your email address"],
    ["sign-in", "Confirm this new device"],
    ["forget-password", "Reset your password"],
    ["change-email", "Confirm your email change"],
  ] as const)("renders a branded %s OTP email", (purpose, heading) => {
    const message = authOTPEmail("123456", purpose);
    expect(message.htmlContent).toContain("ELARA");
    expect(message.htmlContent).toContain(heading);
    expect(message.textContent).toContain("123456");
  });

  it("escapes user-controlled names and URLs", () => {
    const reset = passwordResetEmail("<Admin>", "https://example.com/reset?a=1&b=2");
    const invite = workspaceInvitationEmail("<Owner>", "Ops & Co", "https://example.com/invite?a=1&b=2");
    expect(reset.htmlContent).toContain("&lt;Admin&gt;");
    expect(reset.htmlContent).toContain("a=1&amp;b=2");
    expect(invite.htmlContent).toContain("Ops &amp; Co");
    expect(invite.htmlContent).not.toContain("<Owner>");
  });
});
