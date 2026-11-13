import { z } from "zod";
import {
  callNvidiaJSON,
  callNvidiaJSONStream
} from "@/modules/chat/adapters/nvidia";
import { callOpenRouterJSON, callOpenRouterJSONStream } from "@/modules/chat/adapters/openrouter";

type ResolvedProvider = "openrouter" | "nvidia";
export type { AIProvider } from "../domain/types";
import type { AIProvider, ReasoningLevel } from "../domain/types";
import type { ProviderResult, AIRequestOptions, AIStreamRequestOptions, ProviderStreamCallbacks } from "../domain/provider";

const getProviderOrder = (): ResolvedProvider[] => {
  const order: ResolvedProvider[] = [];
  if (process.env.OPENROUTER_API_KEY) order.push("openrouter");
  if (process.env.NVIDIA_API_KEY) order.push("nvidia");
  return order;
};

const getFallbackModel = (provider: ResolvedProvider, modelOverride?: string) => {
  if (modelOverride?.trim()) return modelOverride.trim();
  if (provider === "openrouter") {
    return process.env.OPENROUTER_MODEL ?? "openai/gpt-oss-120b:free";
  }
  return process.env.NVIDIA_MODEL ?? "z-ai/glm-5.2";
};

const shouldRetryWithDefaultModel = (error: string) => {
  const normalized = error.toLowerCase();
  return (
    normalized.includes("_404") ||
    normalized.includes("_400") ||
    normalized.includes("does not exist") ||
    normalized.includes("not found") ||
    normalized.includes("no access")
  );
};

const callProvider = async <T>({
  provider,
  prompt,
  schema,
  model,
  reasoningLevel
}: {
  provider: ResolvedProvider;
  prompt: string;
  schema: z.ZodSchema<T>;
  model?: string;
  reasoningLevel?: ReasoningLevel;
}): Promise<ProviderResult<T>> => {
  if (provider === "openrouter") {
    const result = await callOpenRouterJSON(prompt, schema, { model, reasoningLevel });
    if (result.ok) {
      return {
        ok: true,
        data: result.data,
        provider,
        model: result.model,
        raw: result.raw,
        reasoning: result.reasoning,
        reasoningMode: result.reasoningMode
      };
    }

    if (model?.trim() && shouldRetryWithDefaultModel(result.error)) {
      const fallbackResult = await callOpenRouterJSON(prompt, schema, { reasoningLevel });
      if (fallbackResult.ok) {
        return {
          ok: true,
          data: fallbackResult.data,
          provider,
          model: fallbackResult.model,
          raw: fallbackResult.raw,
          reasoning: fallbackResult.reasoning,
          reasoningMode: fallbackResult.reasoningMode
        };
      }
      return {
        ok: false,
        error: fallbackResult.error,
        provider,
        model: getFallbackModel(provider),
        raw: fallbackResult.raw,
        issues: fallbackResult.issues
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
    const result = await callNvidiaJSON(prompt, schema, { model, reasoningLevel });
    if (result.ok) {
      return {
        ok: true,
        data: result.data,
        provider,
        model: result.model,
        raw: result.raw,
        reasoning: result.reasoning,
        reasoningMode: result.reasoningMode
      };
    }

    if (model?.trim() && shouldRetryWithDefaultModel(result.error)) {
      const fallbackResult = await callNvidiaJSON(prompt, schema, { reasoningLevel });
      if (fallbackResult.ok) {
        return {
          ok: true,
          data: fallbackResult.data,
          provider,
          model: fallbackResult.model,
          raw: fallbackResult.raw,
          reasoning: fallbackResult.reasoning,
          reasoningMode: fallbackResult.reasoningMode
        };
      }
      return {
        ok: false,
        error: fallbackResult.error,
        provider,
        model: getFallbackModel(provider),
        raw: fallbackResult.raw,
        issues: fallbackResult.issues
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

  return { ok: false, error: "provider_error" };
};

export const hasAnyAIProviderConfigured = () => getProviderOrder().length > 0;

export const isAIProviderConfigured = (provider: AIProvider = "auto") => {
  if (provider === "auto") return hasAnyAIProviderConfigured();
  if (provider === "openrouter") return Boolean(process.env.OPENROUTER_API_KEY);
  if (provider === "nvidia") return Boolean(process.env.NVIDIA_API_KEY);
  return false;
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
      model: options?.model,
      reasoningLevel: options?.reasoningLevel
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
      model: options?.model,
      reasoningLevel: options?.reasoningLevel
    });
    if (result.ok) return result;
    lastError = result;
  }

  return lastError ?? { ok: false, error: "provider_error" };
};

const callProviderStream = async <T>({
  provider,
  prompt,
  schema,
  options
}: {
  provider: ResolvedProvider;
  prompt: string;
  schema: z.ZodSchema<T>;
  options: AIStreamRequestOptions;
}): Promise<ProviderResult<T>> => {
  if (provider === "openrouter") {
    if (options.images?.length) {
      return { ok: false, error: "openrouter_model_does_not_support_images", provider };
    }
    const result = await callOpenRouterJSONStream(prompt, schema, options);
    return result.ok
      ? { ...result, provider }
      : { ...result, provider, model: getFallbackModel(provider, options.model) };
  }
  const result = await callNvidiaJSONStream(prompt, schema, options);
  return result.ok
    ? { ...result, provider }
    : { ...result, provider, model: getFallbackModel(provider, options.model) };
};

export const callAIJSONStream = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options: AIStreamRequestOptions = {}
): Promise<ProviderResult<T>> => {
  const selectedProvider = options.provider ?? "auto";
  if (selectedProvider !== "auto") {
    return callProviderStream({ provider: selectedProvider, prompt, schema, options });
  }
  const configuredProviders = getProviderOrder();
  if (configuredProviders.length === 0) return { ok: false, error: "not_configured" };
  const order = options.images?.length
    ? configuredProviders.filter((provider) => provider === "nvidia")
    : configuredProviders;
  let lastError: ProviderResult<T> | null = null;
  let emitted = false;
  const callbacks: ProviderStreamCallbacks = {
    onContentDelta: async (delta) => {
      emitted = true;
      await options.callbacks?.onContentDelta?.(delta);
    },
    onReasoningDelta: async (delta) => {
      emitted = true;
      await options.callbacks?.onReasoningDelta?.(delta);
    }
  };
  for (const provider of order) {
    const result = await callProviderStream({
      provider,
      prompt,
      schema,
      options: { ...options, callbacks }
    });
    if (result.ok) return result;
    lastError = result;
    if (emitted || options.signal?.aborted) break;
  }
  return lastError ?? { ok: false, error: "provider_error" };
};
