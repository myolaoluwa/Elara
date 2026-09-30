import OpenAI from "openai";
import type { AIMessage, AIRequest, AIResponse, StreamingAIProvider } from "./types";

export class OpenAIProvider implements StreamingAIProvider {
  readonly name = "openai";
  readonly model: string;
  private readonly client: OpenAI;

  constructor(apiKey: string, model = process.env.OPENAI_MODEL || "gpt-5-mini") {
    this.client = new OpenAI({ apiKey, timeout: 45_000, maxRetries: 1 });
    this.model = model;
  }

  async complete(request: AIRequest): Promise<AIResponse> {
    const response = await this.client.responses.create({ model: this.model, input: transcript(request.messages), max_output_tokens: 2_000 });
    return { text: response.output_text, provider: this.name, model: this.model, toolCalls: [] };
  }

  async *stream(messages: AIMessage[], instructions: string) {
    const stream = await this.client.responses.create({ model: this.model, instructions, input: transcript(messages), max_output_tokens: 2_000, stream: true });
    for await (const event of stream) if (event.type === "response.output_text.delta") yield event.delta;
  }

  async transcribe(file: File) {
    const result = await this.client.audio.transcriptions.create({ file, model: "gpt-transcribe" });
    return result.text;
  }
}

function transcript(messages: AIMessage[]) {
  return messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`).join("\n\n");
}
