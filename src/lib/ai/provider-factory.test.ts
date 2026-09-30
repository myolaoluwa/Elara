import { describe, expect, it } from "vitest";
import { getTextAIProvider } from "./provider-factory";

describe("getTextAIProvider", () => {
  it.each([
    ["openai", "OPENAI_API_KEY", "gpt-5-mini"],
    ["openrouter", "OPENROUTER_API_KEY", "openai/gpt-4o-mini"],
    ["gemini", "GEMINI_API_KEY", "gemini-2.5-flash"],
    ["cerebras", "CEREBRAS_API_KEY", "gpt-oss-120b"],
    ["xai", "XAI_API_KEY", "grok-4"],
    ["deepseek", "DEEPSEEK_API_KEY", "deepseek-chat"],
  ])("configures %s when its key is available", (name, key, model) => {
    const selection = getTextAIProvider({ AI_PROVIDER: name, [key]: "test-key" });

    expect(selection).toMatchObject({ name, configured: true, model });
    expect(selection.provider).not.toBeNull();
    expect(selection.provider?.name).toBe(name);
  });

  it("accepts grok as an alias for xai", () => {
    expect(getTextAIProvider({ AI_PROVIDER: "grok", XAI_API_KEY: "test-key" })).toMatchObject({
      name: "xai",
      configured: true,
    });
  });

  it("keeps deterministic mode when no hosted provider is selected", () => {
    expect(getTextAIProvider({ AI_PROVIDER: "offline" })).toMatchObject({
      name: "offline",
      configured: false,
      provider: null,
    });
  });

  it("does not construct a client when the selected key is missing", () => {
    expect(getTextAIProvider({ AI_PROVIDER: "gemini" })).toMatchObject({
      name: "gemini",
      configured: false,
      provider: null,
      reason: "GEMINI_API_KEY is not configured",
    });
  });

  it("rejects unknown provider names without leaking configuration", () => {
    expect(getTextAIProvider({ AI_PROVIDER: "unknown", OPENAI_API_KEY: "unused" })).toMatchObject({
      name: "offline",
      configured: false,
      provider: null,
      reason: "Unsupported AI_PROVIDER: unknown",
    });
  });
});
