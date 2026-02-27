import { z } from "zod";

const DEFAULT_NVIDIA_MODEL = "z-ai/glm4.7";

const modelAliasMap: Record<string, string[]> = {
  "z-ai/glm4.7": ["z-ai/glm-4.7", "z-ai/glm47"],
  "z-ai/glm5": ["z-ai/glm-5"],
  "minimaxai/minimax-m2": ["minimaxai/minimax-m2.5", "MiniMaxAI/MiniMax-M2.5"]
};

const normalizeModelName = (value: string) => value.trim().toLowerCase();

const buildModelCandidates = (rawModel: string) => {
  const normalized = normalizeModelName(rawModel);
  const directAliases = modelAliasMap[normalized] ?? [];

  const canonical = Object.entries(modelAliasMap).find(([, aliases]) =>
    aliases.some((alias) => normalizeModelName(alias) === normalized)
  )?.[0];

  const candidates = [
    canonical ?? normalized,
    ...directAliases.map((alias) => normalizeModelName(alias))
  ];

  return Array.from(new Set(candidates));
};

const getNvidiaConfig = (modelOverride?: string) => {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;
  const model = modelOverride?.trim() || process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_MODEL;
  const apiUrl = process.env.NVIDIA_API_URL ?? "https://integrate.api.nvidia.com/v1";
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

export type NvidiaResult<T> =
  | { ok: true; data: T; raw: string; model: string }
  | { ok: false; error: string; raw?: string; issues?: unknown };

export const callNvidiaJSON = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: { model?: string }
): Promise<NvidiaResult<T>> => {
  const config = getNvidiaConfig(options?.model);
  if (!config) {
    return { ok: false, error: "not_configured" };
  }

  const modelCandidates = buildModelCandidates(config.model);
  let lastError = "provider_error";

  for (const model of modelCandidates) {
    const response = await fetch(`${config.apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: "json_object" }
      })
    });

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
        continue;
      }
      return { ok: false, error: lastError };
    }

    const payload = await response.json().catch(() => ({}));
    const rawText = payload?.choices?.[0]?.message?.content ?? "";
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

    return { ok: true, data: result.data, raw: rawText, model };
  }

  return { ok: false, error: lastError };
};
