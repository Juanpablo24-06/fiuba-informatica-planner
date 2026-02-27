import { z } from "zod";

const DEFAULT_NVIDIA_MODEL = "z-ai/glm4.7";

const MODEL_GROUPS: Array<{ aliases: string[]; candidates: string[] }> = [
  {
    aliases: [
      "z-ai/glm4.7",
      "z-ai/glm4_7",
      "z-ai/glm-4.7",
      "glm4.7",
      "glm-4.7",
      "zai-org/glm-4.7",
      "zai-org/glm4.7"
    ],
    candidates: [
      "z-ai/glm4.7",
      "z-ai/glm4_7",
      "zai-org/GLM-4.7",
      "zai-org/glm-4.7"
    ]
  },
  {
    aliases: [
      "z-ai/glm5",
      "z-ai/glm-5",
      "glm5",
      "glm-5",
      "zai-org/glm-5",
      "zai-org/glm5"
    ],
    candidates: [
      "z-ai/glm5",
      "zai-org/GLM-5",
      "zai-org/glm-5"
    ]
  },
  {
    aliases: [
      "minimaxai/minimax-m2.5",
      "minimax-m2.5",
      "m2.5",
      "minimaxai/minimax-m2.1",
      "minimax-m2.1",
      "m2.1",
      "minimaxai/minimax-m2",
      "minimax-m2",
      "m2"
    ],
    candidates: [
      "minimaxai/minimax-m2.5",
      "minimaxai/minimax-m2.1",
      "minimaxai/minimax-m2"
    ]
  }
];

const normalizeModelName = (value: string) => value.trim().toLowerCase();

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
