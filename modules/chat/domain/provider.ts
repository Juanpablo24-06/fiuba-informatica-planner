import type { z } from "zod";
import type { ReasoningLevel, AIProvider } from "./types";
import type { ControlledReasoningMode } from "./models";
export type ProviderResult<T> =
  | { ok: true; data: T; provider: "openrouter" | "nvidia"; model: string; raw: string; reasoning: string | null; reasoningMode: ControlledReasoningMode }
  | { ok: false; error: string; provider?: "openrouter" | "nvidia"; model?: string; raw?: string; issues?: unknown };
export type AIRequestOptions = { provider?: AIProvider; model?: string; reasoningLevel?: ReasoningLevel };
export type ProviderStreamCallbacks = { onContentDelta?: (delta: string) => void | Promise<void>; onReasoningDelta?: (delta: string) => void | Promise<void> };
export type AIStreamRequestOptions = AIRequestOptions & {
  images?: { name: string; dataUrl: string }[];
  signal?: AbortSignal;
  callbacks?: ProviderStreamCallbacks;
};
export interface AIProviderGateway {
  isAIProviderConfigured(provider?: AIProvider): boolean;
  callAIJSON<T>(prompt: string, schema: z.ZodSchema<T>, options?: AIRequestOptions): Promise<ProviderResult<T>>;
  callAIJSONStream<T>(prompt: string, schema: z.ZodSchema<T>, options?: AIStreamRequestOptions): Promise<ProviderResult<T>>;
}
