import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, hashOAuthState } from "./crypto";

const environment = { EMAIL_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64") };

describe("mail credential encryption", () => {
  it("round trips without storing plaintext", () => {
    const encrypted = encryptSecret("refresh-token", environment);
    expect(encrypted).not.toContain("refresh-token");
    expect(decryptSecret(encrypted, environment)).toBe("refresh-token");
  });

  it("hashes OAuth state deterministically", () => {
    expect(hashOAuthState("state")).toBe(hashOAuthState("state"));
    expect(hashOAuthState("state")).not.toBe(hashOAuthState("other"));
  });
});
