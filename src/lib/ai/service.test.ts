import { describe, expect, it, vi } from "vitest";
import { AIService, UnconfiguredAIProvider } from "./service";
import type { AIProvider, AIRequest } from "./types";

const request: AIRequest = {
  intent: "chat",
  workspaceId: "workspace-1",
  messages: [{ role: "user", content: "What needs attention?" }],
};

describe("AIService", () => {
  it("delegates all AI work through the configured provider", async () => {
    const complete = vi.fn().mockResolvedValue({ text: "Nothing yet.", provider: "test", model: "test", toolCalls: [] });
    const provider: AIProvider = { name: "test", model: "test-model", complete };
    await new AIService(provider).run(request);
    expect(complete).toHaveBeenCalledWith(request);
  });

  it("rejects requests without workspace isolation", async () => {
    await expect(new AIService(new UnconfiguredAIProvider()).run({ ...request, workspaceId: "" })).rejects.toThrow("workspaceId is required");
  });

  it("fails clearly when no provider is configured", async () => {
    await expect(new AIService(new UnconfiguredAIProvider()).run(request)).rejects.toThrow("No AI provider is configured");
  });
});
