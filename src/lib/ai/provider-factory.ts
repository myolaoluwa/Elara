import { OpenAICompatibleProvider } from "./openai-compatible-provider";
import { OpenAIProvider } from "./openai-provider";
import type { StreamingAIProvider } from "./types";

export const textProviderNames = ["offline", "openai", "openrouter", "gemini", "cerebras", "xai", "deepseek"] as const;
export type TextProviderName = (typeof textProviderNames)[number];

export interface TextProviderSelection {
  name: TextProviderName;
  configured: boolean;
  model: string | null;
  provider: StreamingAIProvider | null;
  reason?: string;
}

type Environment = Record<string, string | undefined>;

const compatibleProviders = {
  openrouter: {
    key: "OPENROUTER_API_KEY",
    model: "OPENROUTER_MODEL",
    defaultModel: "openai/gpt-4o-mini",
    baseURL: "https://openrouter.ai/api/v1",
  },
  gemini: {
    key: "GEMINI_API_KEY",
    model: "GEMINI_MODEL",
    defaultModel: "gemini-3.8-flash",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
  },
  cerebras: {
    key: "CEREBRAS_API_KEY",
    model: "CEREBRAS_MODEL",
    defaultModel: "gpt-oss-120b",
    baseURL: "https://api.cerebras.ai/v1",
  },
  xai: {
    key: "XAI_API_KEY",
    model: "XAI_MODEL",
    defaultModel: "grok-4",
    baseURL: "https://api.x.ai/v1",
  },
  deepseek: {
    key: "DEEPSEEK_API_KEY",
    model: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-chat",
    baseURL: "https://api.deepseek.com",
  },
} as const;

/** Selects one server-side text provider without ever exposing its credential to the browser. */
export function getTextAIProvider(environment: Environment = process.env): TextProviderSelection {
  const requested = environment.AI_PROVIDER?.trim().toLowerCase() || "offline";
  const normalized = requested === "grok" ? "xai" : requested;

  if (normalized === "offline") {
    return { name: "offline", configured: false, model: null, provider: null, reason: "AI_PROVIDER is set to offline" };
  }

  if (normalized === "openai") {
    const model = environment.OPENAI_MODEL?.trim() || "gpt-5-mini";
    const apiKey = environment.OPENAI_API_KEY?.trim();
    return apiKey
      ? { name: "openai", configured: true, model, provider: new OpenAIProvider(apiKey, model) }
      : missingKey("openai", model, "OPENAI_API_KEY");
  }

  if (!(normalized in compatibleProviders)) {
    return {
      name: "offline",
      configured: false,
      model: null,
      provider: null,
      reason: `Unsupported AI_PROVIDER: ${requested}`,
    };
  }

  const name = normalized as keyof typeof compatibleProviders;
  const config = compatibleProviders[name];
  const apiKey = environment[config.key]?.trim();
  const model = environment[config.model]?.trim() || config.defaultModel;
  if (!apiKey) return missingKey(name, model, config.key);

  const defaultHeaders = name === "openrouter"
    ? {
        "HTTP-Referer": environment.BETTER_AUTH_URL || "http://localhost:3000",
        "X-OpenRouter-Title": "Elara",
      }
    : undefined;

  return {
    name,
    configured: true,
    model,
    provider: new OpenAICompatibleProvider({ name, apiKey, model, baseURL: config.baseURL, defaultHeaders }),
  };
}

function missingKey(name: Exclude<TextProviderName, "offline">, model: string, key: string): TextProviderSelection {
  return { name, configured: false, model, provider: null, reason: `${key} is not configured` };
}
