import { z } from "zod";

const getGeminiConfig = (modelOverride?: string) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = modelOverride?.trim() || process.env.GEMINI_MODEL || "gemini-1.5-pro";
  const apiUrl =
    process.env.GEMINI_API_URL ??
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
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

export type GeminiResult<T> =
  | { ok: true; data: T; raw: string; model: string }
  | { ok: false; error: string; raw?: string; issues?: unknown };

export const callGeminiJSON = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: { model?: string }
): Promise<GeminiResult<T>> => {
  const config = getGeminiConfig(options?.model);
  if (!config) {
    return { ok: false, error: "not_configured" };
  }

  const response = await fetch(`${config.apiUrl}?key=${config.apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024
      }
    })
  });

  if (!response.ok) {
    return { ok: false, error: `gemini_error_${response.status}` };
  }

  const payload = await response.json().catch(() => ({}));
  const rawText =
    payload?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text ?? "").join("") ??
    "";
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
