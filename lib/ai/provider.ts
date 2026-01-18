import { z } from "zod";
import { callGeminiJSON } from "@/lib/ai/gemini";
import { callCerebrasJSON } from "@/lib/ai/cerebras";

type ProviderResult<T> =
  | { ok: true; data: T; provider: "cerebras" | "gemini"; model: string; raw: string }
  | {
      ok: false;
      error: string;
      provider?: "cerebras" | "gemini";
      model?: string;
      raw?: string;
      issues?: unknown;
    };

export const callAIJSON = async <T>(
  prompt: string,
  schema: z.ZodSchema<T>
): Promise<ProviderResult<T>> => {
  if (process.env.CEREBRAS_API_KEY) {
    const result = await callCerebrasJSON(prompt, schema);
    if (result.ok) {
      return {
        ok: true,
        data: result.data,
        provider: "cerebras",
        model: result.model,
        raw: result.raw
      };
    }
    return {
      ok: false,
      error: result.error,
      provider: "cerebras",
      model: process.env.CEREBRAS_MODEL ?? "llama3.1-70b",
      raw: result.raw,
      issues: result.issues
    };
  }

  const result = await callGeminiJSON(prompt, schema);
  if (result.ok) {
    return { ok: true, data: result.data, provider: "gemini", model: result.model, raw: result.raw };
  }
  return {
    ok: false,
    error: result.error,
    provider: "gemini",
    model: process.env.GEMINI_MODEL ?? "gemini-1.5-pro",
    raw: result.raw,
    issues: result.issues
  };
};
