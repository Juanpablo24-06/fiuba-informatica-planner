import { z } from "zod";

const DEFAULT_CEREBRAS_TIMEOUT_MS = 30000;
const DEFAULT_CEREBRAS_MAX_TOKENS = 1800;

const getCerebrasConfig = (modelOverride?: string) => {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) return null;
  const model = modelOverride?.trim() || process.env.CEREBRAS_MODEL || "llama3.1-70b";
  const apiUrl = process.env.CEREBRAS_API_URL ?? "https://api.cerebras.ai/v1";
  return { apiKey, model, apiUrl };
};

const extractJson = (raw: string) => {
  const fenced = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1];
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw;
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

export type CerebrasResult<T> =
  | { ok: true; data: T; raw: string; model: string }
  | { ok: false; error: string; raw?: string; issues?: unknown };

export const callCerebrasJSON = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: { model?: string }
): Promise<CerebrasResult<T>> => {
  const config = getCerebrasConfig(options?.model);
  if (!config) {
    return { ok: false, error: "not_configured" };
  }

  const configuredTimeoutMs = Number(process.env.CEREBRAS_REQUEST_TIMEOUT_MS ?? "");
  const requestTimeoutMs = Number.isFinite(configuredTimeoutMs) && configuredTimeoutMs > 0
    ? configuredTimeoutMs
    : DEFAULT_CEREBRAS_TIMEOUT_MS;
  const configuredMaxTokens = Number(process.env.CEREBRAS_MAX_TOKENS ?? "");
  const maxTokens = Number.isFinite(configuredMaxTokens) && configuredMaxTokens > 0
    ? configuredMaxTokens
    : DEFAULT_CEREBRAS_MAX_TOKENS;

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
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: maxTokens,
          response_format: { type: "json_object" }
        })
      },
      requestTimeoutMs
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: `cerebras_timeout_${requestTimeoutMs}ms` };
    }
    return { ok: false, error: "cerebras_network_error" };
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null);
    const detail =
      errorPayload?.error?.message ??
      errorPayload?.message ??
      errorPayload?.detail ??
      null;
    const error = detail
      ? `cerebras_error_${response.status}:${String(detail).slice(0, 180)}`
      : `cerebras_error_${response.status}`;
    return { ok: false, error };
  }

  const payload = await response.json().catch(() => ({}));
  const rawText = payload?.choices?.[0]?.message?.content ?? "";
  if (!rawText) {
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

  return { ok: true, data: result.data, raw: rawText, model: config.model };
};
