import { z } from "zod";
import type { ReasoningLevel } from "@/modules/chat/domain/schemas";
import type { ControlledReasoningMode } from "@/modules/chat/domain/models";
import {
  createTimedSignal,
  readOpenAICompatibleStream,
  type ProviderStreamCallbacks
} from "@/modules/chat/adapters/openai-compatible-stream";

const DEFAULT_OPENROUTER_MODEL = "openai/gpt-oss-120b:free";
const DEFAULT_OPENROUTER_TIMEOUT_MS = 30000;
const DEFAULT_OPENROUTER_MAX_TOKENS = 1800;
const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const reasoningEffortByLevel: Record<ReasoningLevel, "low" | "medium" | "high"> = {
  bajo: "low",
  medio: "medium",
  alto: "high"
};

const getOpenRouterConfig = (modelOverride?: string) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  const apiUrl = process.env.OPENROUTER_API_URL ?? OPENROUTER_CHAT_COMPLETIONS_URL;
  const model =
    modelOverride?.trim() ||
    process.env.OPENROUTER_MODEL ||
    DEFAULT_OPENROUTER_MODEL;
  return { apiKey, model, apiUrl };
};

const getPositiveEnvNumber = (name: string, fallback: number) => {
  const configured = Number(process.env[name] ?? "");
  return Number.isFinite(configured) && configured > 0 ? configured : fallback;
};

const fetchWithTimeout = async (
  input: string,
  init: RequestInit,
  timeoutMs: number
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const extractJson = (raw: string) => {
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1];
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw;
};

const supportsReasoning = (model: string) => /(^|\/)gpt-oss/i.test(model);

export type OpenRouterResult<T> =
  | {
      ok: true;
      data: T;
      raw: string;
      model: string;
      reasoning: string | null;
      reasoningMode: ControlledReasoningMode;
    }
  | { ok: false; error: string; raw?: string; issues?: unknown };

const cleanReasoning = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const callOpenRouterJSON = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: { model?: string; reasoningLevel?: ReasoningLevel }
): Promise<OpenRouterResult<T>> => {
  const config = getOpenRouterConfig(options?.model);
  if (!config) {
    return { ok: false, error: "not_configured" };
  }

  const requestTimeoutMs = getPositiveEnvNumber(
    "OPENROUTER_REQUEST_TIMEOUT_MS",
    DEFAULT_OPENROUTER_TIMEOUT_MS
  );
  const maxTokens = getPositiveEnvNumber(
    "OPENROUTER_MAX_TOKENS",
    DEFAULT_OPENROUTER_MAX_TOKENS
  );
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: maxTokens,
    response_format: { type: "json_object" }
  };

  if (options?.reasoningLevel && supportsReasoning(config.model)) {
    body.reasoning = { effort: reasoningEffortByLevel[options.reasoningLevel] };
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(
      config.apiUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(body)
      },
      requestTimeoutMs
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: `openrouter_timeout_${requestTimeoutMs}ms` };
    }
    return { ok: false, error: "openrouter_network_error" };
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    const detail =
      errorPayload?.error?.message ??
      errorPayload?.message ??
      errorPayload?.detail ??
      null;
    const error = detail
      ? `openrouter_error_${response.status}:${String(detail).slice(0, 180)}`
      : `openrouter_error_${response.status}`;
    return { ok: false, error };
  }

  const payload = await response.json().catch(() => ({}));
  const providerMessage = payload?.choices?.[0]?.message ?? {};
  const rawText = providerMessage?.content ?? "";
  if (!rawText || typeof rawText !== "string") {
    return { ok: false, error: "empty_response" };
  }

  const jsonText = extractJson(rawText);
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return { ok: false, error: "invalid_json", raw: rawText };
  }

  const candidate =
    parsed && typeof parsed === "object"
      ? ((parsed as Record<string, unknown>).response ??
        (parsed as Record<string, unknown>).data ??
        parsed)
      : parsed;

  const result = schema.safeParse(candidate);
  if (!result.success) {
    return {
      ok: false,
      error: "invalid_schema",
      raw: rawText,
      issues: result.error.flatten()
    };
  }

  return {
    ok: true,
    data: result.data,
    raw: rawText,
    model: config.model,
    reasoning: cleanReasoning(
      providerMessage?.reasoning_content ?? providerMessage?.reasoning
    ),
    reasoningMode: supportsReasoning(config.model) ? "effort" : "native"
  };
};

export const callOpenRouterJSONStream = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: {
    model?: string;
    reasoningLevel?: ReasoningLevel;
    signal?: AbortSignal;
    callbacks?: ProviderStreamCallbacks;
  }
): Promise<OpenRouterResult<T>> => {
  const config = getOpenRouterConfig(options?.model);
  if (!config) return { ok: false, error: "not_configured" };
  const requestTimeoutMs = getPositiveEnvNumber(
    "OPENROUTER_REQUEST_TIMEOUT_MS",
    DEFAULT_OPENROUTER_TIMEOUT_MS
  );
  const baseMaxTokens = getPositiveEnvNumber(
    "OPENROUTER_MAX_TOKENS",
    DEFAULT_OPENROUTER_MAX_TOKENS
  );
  const body: Record<string, unknown> = {
    model: config.model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: options?.reasoningLevel === "alto" ? Math.max(baseMaxTokens, 5000) : baseMaxTokens,
    response_format: { type: "json_object" },
    stream: true
  };
  if (options?.reasoningLevel && supportsReasoning(config.model)) {
    body.reasoning = { effort: reasoningEffortByLevel[options.reasoningLevel] };
  }
  const timed = createTimedSignal(options?.signal, requestTimeoutMs);
  try {
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify(body),
      signal: timed.signal
    });
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      const detail = errorPayload?.error?.message ?? errorPayload?.message ?? errorPayload?.detail;
      return {
        ok: false,
        error: detail
          ? `openrouter_error_${response.status}:${String(detail).slice(0, 180)}`
          : `openrouter_error_${response.status}`
      };
    }
    const streamed = await readOpenAICompatibleStream(response, options?.callbacks);
    if (!streamed.raw) return { ok: false, error: "empty_response" };
    const parsedJson = JSON.parse(extractJson(streamed.raw));
    const candidate = parsedJson && typeof parsedJson === "object"
      ? ((parsedJson as Record<string, unknown>).response ??
        (parsedJson as Record<string, unknown>).data ??
        parsedJson)
      : parsedJson;
    const parsed = schema.safeParse(candidate);
    if (!parsed.success) {
      return { ok: false, error: "invalid_schema", raw: streamed.raw, issues: parsed.error.flatten() };
    }
    return {
      ok: true,
      data: parsed.data,
      raw: streamed.raw,
      model: config.model,
      reasoning: streamed.reasoning,
      reasoningMode: supportsReasoning(config.model) ? "effort" : "native"
    };
  } catch (error) {
    if (options?.signal?.aborted) return { ok: false, error: "request_aborted" };
    if (error instanceof SyntaxError) return { ok: false, error: "invalid_json" };
    return {
      ok: false,
      error: timed.signal.aborted
        ? `openrouter_timeout_${requestTimeoutMs}ms`
        : "openrouter_network_error"
    };
  } finally {
    timed.clear();
  }
};
