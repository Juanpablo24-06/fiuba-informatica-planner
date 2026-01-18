import { z } from "zod";

const getCerebrasConfig = () => {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) return null;
  const model = process.env.CEREBRAS_MODEL ?? "llama3.1-70b";
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

export type CerebrasResult<T> =
  | { ok: true; data: T; raw: string; model: string }
  | { ok: false; error: string; raw?: string; issues?: unknown };

export const callCerebrasJSON = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>
): Promise<CerebrasResult<T>> => {
  const config = getCerebrasConfig();
  if (!config) {
    return { ok: false, error: "not_configured" };
  }

  const response = await fetch(`${config.apiUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    return { ok: false, error: `cerebras_error_${response.status}` };
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
  } catch (error) {
    return { ok: false, error: "invalid_json", raw: rawText };
  }

  const result = schema.safeParse(parsed);
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

