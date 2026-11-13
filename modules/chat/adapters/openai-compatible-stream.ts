import type { ProviderStreamCallbacks } from "../domain/provider";
export type { ProviderStreamCallbacks } from "../domain/provider";
const toText = (value: unknown) => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) {
          return String((item as { text?: unknown }).text ?? "");
        }
        return "";
      })
      .join("");
  }
  return "";
};

export const readOpenAICompatibleStream = async (
  response: Response,
  callbacks: ProviderStreamCallbacks = {}
) => {
  if (!response.body) throw new Error("empty_stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let raw = "";
  let reasoning = "";

  const consumeLine = async (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const serialized = trimmed.slice(5).trim();
    if (!serialized || serialized === "[DONE]") return;
    const payload = JSON.parse(serialized);
    const delta = payload?.choices?.[0]?.delta ?? {};
    const reasoningDelta = toText(
      delta.reasoning_content ?? delta.reasoning ?? delta.thinking
    );
    const contentDelta = toText(delta.content);
    if (reasoningDelta) {
      reasoning += reasoningDelta;
      await callbacks.onReasoningDelta?.(reasoningDelta);
    }
    if (contentDelta) {
      raw += contentDelta;
      await callbacks.onContentDelta?.(contentDelta);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    for (const line of lines) await consumeLine(line);
  }
  buffer += decoder.decode();
  if (buffer.trim()) await consumeLine(buffer);
  return { raw, reasoning: reasoning.trim() || null };
};

export const createTimedSignal = (parent: AbortSignal | undefined, timeoutMs: number) => {
  const controller = new AbortController();
  const abort = () => controller.abort(parent?.reason);
  if (parent?.aborted) abort();
  else parent?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => controller.abort(new Error("provider_timeout")), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => {
      clearTimeout(timeout);
      parent?.removeEventListener("abort", abort);
    }
  };
};
