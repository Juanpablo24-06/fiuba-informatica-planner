import { z } from "zod";
import { callGeminiJSON } from "@/lib/ai/gemini";
import { callCerebrasJSON } from "@/lib/ai/cerebras";
import { callNvidiaJSON } from "@/lib/ai/nvidia";

type ResolvedProvider = "cerebras" | "nvidia" | "gemini";
export type AIProvider = "auto" | ResolvedProvider;

type ProviderResult<T> =
  | { ok: true; data: T; provider: ResolvedProvider; model: string; raw: string }
  | {
      ok: false;
      error: string;
      provider?: ResolvedProvider;
      model?: string;
      raw?: string;
      issues?: unknown;
    };

type AIRequestOptions = {
  provider?: AIProvider;
  model?: string;
};

const getProviderOrder = (): ResolvedProvider[] => {
  const order: ResolvedProvider[] = [];
  if (process.env.CEREBRAS_API_KEY) order.push("cerebras");
  if (process.env.NVIDIA_API_KEY) order.push("nvidia");
  if (process.env.GEMINI_API_KEY) order.push("gemini");
  return order;
};

const getFallbackModel = (provider: ResolvedProvider, modelOverride?: string) => {
  if (modelOverride?.trim()) return modelOverride.trim();
  if (provider === "cerebras") return process.env.CEREBRAS_MODEL ?? "llama3.1-70b";
  if (provider === "nvidia") return process.env.NVIDIA_MODEL ?? "z-ai/glm-4.5";
  return process.env.GEMINI_MODEL ?? "gemini-1.5-pro";
};

const callProvider = async <T>({
  provider,
  prompt,
  schema,
  model
}: {
  provider: ResolvedProvider;
  prompt: string;
  schema: z.ZodSchema<T>;
  model?: string;
}): Promise<ProviderResult<T>> => {
  if (provider === "cerebras") {
    const result = await callCerebrasJSON(prompt, schema, { model });
    if (result.ok) {
      return {
        ok: true,
        data: result.data,
        provider,
        model: result.model,
        raw: result.raw
      };
    }
    return {
      ok: false,
      error: result.error,
      provider,
      model: getFallbackModel(provider, model),
      raw: result.raw,
      issues: result.issues
    };
  }

  if (provider === "nvidia") {
    const result = await callNvidiaJSON(prompt, schema, { model });
    if (result.ok) {
      return {
        ok: true,
        data: result.data,
        provider,
        model: result.model,
        raw: result.raw
      };
    }
    return {
      ok: false,
      error: result.error,
      provider,
      model: getFallbackModel(provider, model),
      raw: result.raw,
      issues: result.issues
    };
  }

  const result = await callGeminiJSON(prompt, schema, { model });
  if (result.ok) {
    return {
      ok: true,
      data: result.data,
      provider,
      model: result.model,
      raw: result.raw
    };
  }
  return {
    ok: false,
    error: result.error,
    provider,
    model: getFallbackModel(provider, model),
    raw: result.raw,
    issues: result.issues
  };
};

export const hasAnyAIProviderConfigured = () => getProviderOrder().length > 0;

export const isAIProviderConfigured = (provider: AIProvider = "auto") => {
  if (provider === "auto") return hasAnyAIProviderConfigured();
  if (provider === "cerebras") return Boolean(process.env.CEREBRAS_API_KEY);
  if (provider === "nvidia") return Boolean(process.env.NVIDIA_API_KEY);
  return Boolean(process.env.GEMINI_API_KEY);
};

export const callAIJSON = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: AIRequestOptions
): Promise<ProviderResult<T>> => {
  const selectedProvider = options?.provider ?? "auto";
  if (selectedProvider !== "auto") {
    return callProvider({
      provider: selectedProvider,
      prompt,
      schema,
      model: options?.model
    });
  }

  const configuredProviders = getProviderOrder();
  if (configuredProviders.length === 0) {
    return { ok: false, error: "not_configured" };
  }

  let lastError: ProviderResult<T> | null = null;
  for (const provider of configuredProviders) {
    const result = await callProvider({
      provider,
      prompt,
      schema,
      model: options?.model
    });
    if (result.ok) return result;
    lastError = result;
  }

  return lastError ?? { ok: false, error: "provider_error" };
};
