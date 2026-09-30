export type AIIntent = "chat" | "summarize" | "extract" | "classify";

export interface AIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
}

export interface AIRequest {
  intent: AIIntent;
  messages: AIMessage[];
  workspaceId: string;
  tools?: AIToolDefinition[];
  metadata?: Record<string, string>;
}

export interface AIToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  permission: "read" | "suggest" | "execute";
}

export interface AIResponse {
  text: string;
  provider: string;
  model: string;
  toolCalls: AIToolCall[];
  usage?: { inputTokens: number; outputTokens: number };
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  complete(request: AIRequest): Promise<AIResponse>;
}

export interface StreamingAIProvider extends AIProvider {
  stream(messages: AIMessage[], instructions: string): AsyncIterable<string>;
}
