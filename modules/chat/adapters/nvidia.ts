import { z } from "zod";
import type { ReasoningLevel } from "@/modules/chat/domain/schemas";
import type { ControlledReasoningMode } from "@/modules/chat/domain/models";
import {
  createTimedSignal,
  readOpenAICompatibleStream,
  type ProviderStreamCallbacks
} from "@/modules/chat/adapters/openai-compatible-stream";

const DEFAULT_NVIDIA_MODEL = "z-ai/glm-5.2";
const DEFAULT_NVIDIA_TIMEOUT_MS = 60000;
const DEFAULT_NVIDIA_MAX_TOKENS = 4096;
const NEGATIVE_MODEL_CACHE_TTL_MS = 10 * 60 * 1000;

const workingModelCache = new Map<string, string>();
const rejectedModelCache = new Map<string, number>();

const MODEL_GROUPS: Array<{ aliases: string[]; candidates: string[] }> = [
  {
    aliases: [
      "z-ai/glm-5.2",
      "glm-5.2",
      "glm5.2",
      "zai-org/glm-5.2"
    ],
    candidates: [
      "z-ai/glm-5.2",
      "zai-org/GLM-5.2",
      "zai-org/glm-5.2"
    ]
  },
  {
    aliases: [
      "z-ai/glm5.1",
      "z-ai/glm-5.1",
      "glm5.1",
      "glm-5.1",
      "zai-org/glm-5.1"
    ],
    candidates: [
      "z-ai/glm5.1",
      "z-ai/glm-5.1",
      "zai-org/GLM-5.1",
      "zai-org/glm-5.1"
    ]
  },
  {
    aliases: [
      "minimaxai/minimax-m3",
      "minimax-m3",
      "m3"
    ],
    candidates: [
      "minimaxai/minimax-m3",
      "minimaxai/MiniMax-M3"
    ]
  },
  {
    aliases: [
      "minimaxai/minimax-m2.7",
      "minimax-m2.7",
      "m2.7"
    ],
    candidates: [
      "minimaxai/minimax-m2.7",
      "minimaxai/MiniMax-M2.7"
    ]
  }
];

const normalizeModelName = (value: string) => value.trim().toLowerCase();

const getCachedWorkingModel = (rawModel: string) =>
  workingModelCache.get(normalizeModelName(rawModel));

const cacheWorkingModel = (requestedModel: string, resolvedModel: string) => {
  const normalizedRequested = normalizeModelName(requestedModel);
  const normalizedResolved = normalizeModelName(resolvedModel);
  workingModelCache.set(normalizedRequested, resolvedModel);
  workingModelCache.set(normalizedResolved, resolvedModel);
  rejectedModelCache.delete(normalizedResolved);
};

const cacheRejectedModel = (model: string) => {
  rejectedModelCache.set(
    normalizeModelName(model),
    Date.now() + NEGATIVE_MODEL_CACHE_TTL_MS
  );
};

const isModelRejected = (model: string) => {
  const key = normalizeModelName(model);
  const expiresAt = rejectedModelCache.get(key);
  if (!expiresAt) return false;
  if (expiresAt < Date.now()) {
    rejectedModelCache.delete(key);
    return false;
  }
  return true;
};

const buildModelCandidates = (rawModel: string) => {
  const typed = rawModel.trim();
  const normalized = normalizeModelName(typed);
  const matchedGroup = MODEL_GROUPS.find((group) =>
    group.aliases.some((alias) => normalizeModelName(alias) === normalized)
  );

  const candidates = [typed, ...(matchedGroup?.candidates ?? [])];
  const deduped: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;
    const key = normalizeModelName(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(trimmed);
  }

  return deduped;
};

const getNvidiaConfig = (modelOverride?: string) => {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;
  const model = modelOverride?.trim() || process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL;
  const apiUrl = process.env.NVIDIA_API_URL ?? "https://integrate.api.nvidia.com/v1";
  return { apiKey, model, apiUrl };
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

export type NvidiaResult<T> =
  | {
      ok: true;
      data: T;
      raw: string;
      model: string;
      reasoning: string | null;
      reasoningMode: ControlledReasoningMode;
    }
  | { ok: false; error: string; raw?: string; issues?: unknown };

export type NvidiaImageInput = { name: string; dataUrl: string };

const isMiniMaxM3 = (model: string) =>
  normalizeModelName(model) === "minimaxai/minimax-m3";

const isGlm52 = (model: string) => normalizeModelName(model) === "z-ai/glm-5.2";

const getReasoningMode = (model: string): ControlledReasoningMode =>
  isMiniMaxM3(model) ? "thinking_mode" : isGlm52(model) ? "effort" : "native";

const thinkingModeByLevel: Record<ReasoningLevel, "disabled" | "adaptive" | "enabled"> = {
  bajo: "disabled",
  medio: "adaptive",
  alto: "enabled"
};

const applyNvidiaReasoningControl = (
  body: Record<string, unknown>,
  model: string,
  reasoningLevel?: ReasoningLevel
) => {
  if (!reasoningLevel) return;
  if (isMiniMaxM3(model)) {
    body.chat_template_kwargs = { thinking_mode: thinkingModeByLevel[reasoningLevel] };
    return;
  }
  if (isGlm52(model)) {
    const thinking = reasoningLevel !== "bajo";
    body.chat_template_kwargs = { enable_thinking: thinking, clear_thinking: false };
    if (thinking) body.reasoning_effort = reasoningLevel === "alto" ? "max" : "high";
  }
};

const cleanReasoning = (value: unknown) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const callNvidiaJSON = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: { model?: string; reasoningLevel?: ReasoningLevel }
): Promise<NvidiaResult<T>> => {
  const config = getNvidiaConfig(options?.model);
  if (!config) {
    return { ok: false, error: "not_configured" };
  }

  const configuredTimeoutMs = Number(process.env.NVIDIA_REQUEST_TIMEOUT_MS ?? "");
  const requestTimeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : DEFAULT_NVIDIA_TIMEOUT_MS;
  const configuredMaxTokens = Number(process.env.NVIDIA_MAX_TOKENS ?? "");
  const maxTokens = Number.isFinite(configuredMaxTokens) && configuredMaxTokens > 0
    ? configuredMaxTokens
    : DEFAULT_NVIDIA_MAX_TOKENS;

  const rawCandidates = buildModelCandidates(config.model);
  const preferredCandidate = getCachedWorkingModel(config.model);
  const modelCandidates = [preferredCandidate, ...rawCandidates]
    .filter((candidate): candidate is string => Boolean(candidate))
    .filter((candidate, index, array) => {
      const key = normalizeModelName(candidate);
      return array.findIndex((item) => normalizeModelName(item) === key) === index;
    })
    .filter((candidate) => !isModelRejected(candidate));
  let lastError = "provider_error";

  for (const model of modelCandidates) {
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: model.toLowerCase().includes("minimax") || isGlm52(model) ? 1 : 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" }
    };

    applyNvidiaReasoningControl(body, model, options?.reasoningLevel);

    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${config.apiUrl}/chat/completions`,
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
        return { ok: false, error: `nvidia_timeout_${requestTimeoutMs}ms` };
      }
      return { ok: false, error: "nvidia_network_error" };
    }

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      const detail =
        errorPayload?.error?.message ??
        errorPayload?.message ??
        errorPayload?.detail ??
        null;
      lastError = detail
        ? `nvidia_error_${response.status}:${String(detail).slice(0, 180)}`
        : `nvidia_error_${response.status}`;

      // Si el modelo no existe o no está habilitado, intenta alias siguiente.
      if (response.status === 404 || response.status === 400) {
        if (response.status === 404) {
          cacheRejectedModel(model);
        }
        continue;
      }
      return { ok: false, error: lastError };
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

    cacheWorkingModel(config.model, model);
    return {
      ok: true,
      data: result.data,
      raw: rawText,
      model,
      reasoning: cleanReasoning(
        providerMessage?.reasoning_content ?? providerMessage?.reasoning
      ),
      reasoningMode: getReasoningMode(model)
    };
  }

  return { ok: false, error: lastError };
};

export const callNvidiaJSONStream = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: {
    model?: string;
    reasoningLevel?: ReasoningLevel;
    images?: NvidiaImageInput[];
    signal?: AbortSignal;
    callbacks?: ProviderStreamCallbacks;
  }
): Promise<NvidiaResult<T>> => {
  const config = getNvidiaConfig(options?.model);
  if (!config) return { ok: false, error: "not_configured" };
  const requestTimeoutMs = Number(process.env.NVIDIA_REQUEST_TIMEOUT_MS) || DEFAULT_NVIDIA_TIMEOUT_MS;
  const configuredMaxTokens = Number(process.env.NVIDIA_MAX_TOKENS ?? "");
  const baseMaxTokens = Number.isFinite(configuredMaxTokens) && configuredMaxTokens > 0
    ? configuredMaxTokens
    : DEFAULT_NVIDIA_MAX_TOKENS;
  const maxTokens = options?.reasoningLevel === "alto"
    ? Math.max(baseMaxTokens, isGlm52(config.model) ? 16384 : 8192)
    : options?.reasoningLevel === "medio" && isGlm52(config.model)
      ? Math.max(baseMaxTokens, 8192)
      : baseMaxTokens;
  const candidates = buildModelCandidates(config.model).filter((candidate) => !isModelRejected(candidate));
  let lastError = "provider_error";

  for (const model of candidates) {
    if ((options?.images?.length ?? 0) > 0 && !isMiniMaxM3(model)) {
      lastError = "nvidia_model_does_not_support_images";
      continue;
    }
    const content = options?.images?.length
      ? [
          { type: "text", text: prompt },
          ...options.images.map((image) => ({
            type: "image_url",
            image_url: { url: image.dataUrl }
          }))
        ]
      : prompt;
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content }],
      temperature: model.toLowerCase().includes("minimax") || isGlm52(model) ? 1 : 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
      stream: true
    };
    applyNvidiaReasoningControl(body, model, options?.reasoningLevel);

    const timed = createTimedSignal(options?.signal, requestTimeoutMs);
    try {
      const response = await fetch(`${config.apiUrl}/chat/completions`, {
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
        lastError = detail
          ? `nvidia_error_${response.status}:${String(detail).slice(0, 180)}`
          : `nvidia_error_${response.status}`;
        if (response.status === 404) cacheRejectedModel(model);
        if (response.status === 400 || response.status === 404) continue;
        return { ok: false, error: lastError };
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
      cacheWorkingModel(config.model, model);
      return {
        ok: true,
        data: parsed.data,
        raw: streamed.raw,
        model,
        reasoning: streamed.reasoning,
        reasoningMode: getReasoningMode(model)
      };
    } catch (error) {
      if (options?.signal?.aborted) return { ok: false, error: "request_aborted" };
      if (error instanceof SyntaxError) return { ok: false, error: "invalid_json" };
      lastError = timed.signal.aborted
        ? `nvidia_timeout_${requestTimeoutMs}ms`
        : "nvidia_network_error";
    } finally {
      timed.clear();
    }
  }
  return { ok: false, error: lastError };
};
