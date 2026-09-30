import type { AIProvider, AIRequest, AIResponse } from "./types";

/** Central entry point for AI operations. Providers remain server-side and swappable. */
export class AIService {
  constructor(private readonly provider: AIProvider) {}

  async run(request: AIRequest): Promise<AIResponse> {
    if (!request.workspaceId.trim()) throw new Error("workspaceId is required");
    if (request.messages.length === 0) throw new Error("At least one message is required");
    return this.provider.complete(request);
  }
}

export class UnconfiguredAIProvider implements AIProvider {
  readonly name = "unconfigured";
  readonly model = "none";

  async complete(): Promise<never> {
    throw new Error("No AI provider is configured. Set one up on the server before using AI features.");
  }
}
