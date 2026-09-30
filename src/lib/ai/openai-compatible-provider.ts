import OpenAI from "openai";
import type { AIMessage, AIRequest, AIResponse, StreamingAIProvider } from "./types";

interface OpenAICompatibleProviderOptions {
  name: string;
  apiKey: string;
  baseURL: string;
  model: string;
  defaultHeaders?: Record<string, string>;
}

/** Chat Completions adapter for providers that implement the OpenAI-compatible API. */
export class OpenAICompatibleProvider implements StreamingAIProvider {
  readonly name: string;
  readonly model: string;
  private readonly client: OpenAI;

  constructor(options: OpenAICompatibleProviderOptions) {
    this.name = options.name;
    this.model = options.model;
    this.client = new OpenAI({
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      defaultHeaders: options.defaultHeaders,
    });
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: compatibleMessages(request.messages),
    });

    return {
      text: response.choices[0]?.message.content ?? "",
      provider: this.name,
      model: this.model,
      toolCalls: [],
      usage: response.usage
        ? { inputTokens: response.usage.prompt_tokens, outputTokens: response.usage.completion_tokens }
        : undefined,
    };
  }

  async *stream(messages: AIMessage[], instructions: string) {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: compatibleMessages([{ role: "system", content: instructions }, ...messages]),
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta.content;
      if (delta) yield delta;
    }
  }
}

function compatibleMessages(messages: AIMessage[]): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
  return messages.map((message) => {
    if (message.role === "assistant") return { role: "assistant", content: message.content };
    if (message.role === "system") return { role: "system", content: message.content };
    return { role: "user", content: message.content };
  });
}
