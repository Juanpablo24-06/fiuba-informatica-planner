import { describe, expect, it } from "vitest";
import {
  advanceStreamingMessage,
  getPreflightDelayMs,
  getStreamProfile,
  type ChatMessage
} from "@/lib/chat/streaming";

const assistantMessage = (overrides: Partial<ChatMessage> = {}): ChatMessage => ({
  id: overrides.id ?? "assistant",
  role: "assistant",
  content: overrides.content ?? "Respuesta final",
  displayed: overrides.displayed ?? "",
  reasoning: overrides.reasoning ?? "Cadena de razonamiento",
  displayedReasoning: overrides.displayedReasoning ?? "",
  streamStage: overrides.streamStage ?? "reasoning",
  reasoningOpen: overrides.reasoningOpen ?? true,
  isStreaming: overrides.isStreaming ?? true,
  actionResults: overrides.actionResults
});

describe("chat streaming helpers", () => {
  it("returns the existing speed profiles and preflight delays", () => {
    expect(getStreamProfile("bajo")).toEqual({
      intervalMs: 10,
      reasoningStep: 8,
      answerStep: 7
    });
    expect(getStreamProfile("alto")).toEqual({
      intervalMs: 42,
      reasoningStep: 1,
      answerStep: 1
    });
    expect(getPreflightDelayMs("alto")).toBe(1400);
    expect(getPreflightDelayMs("bajo")).toBe(0);
  });

  it("advances the reasoning phase before the answer phase", () => {
    const profile = getStreamProfile("medio");
    const current = assistantMessage({
      reasoning: "123456789",
      displayedReasoning: "1234",
      streamStage: "reasoning"
    });

    const next = advanceStreamingMessage(current, profile);

    expect(next.completed).toBe(false);
    expect(next.message.displayedReasoning).toBe("12345678");
    expect(next.message.streamStage).toBe("reasoning");
    expect(next.message.reasoningOpen).toBe(true);
  });

  it("marks the answer as done when the content is fully streamed", () => {
    const profile = getStreamProfile("alto");
    const current = assistantMessage({
      content: "ok",
      displayed: "o",
      reasoning: null,
      streamStage: "answer"
    });

    const next = advanceStreamingMessage(current, profile);

    expect(next.completed).toBe(true);
    expect(next.message.displayed).toBe("ok");
    expect(next.message.streamStage).toBe("done");
    expect(next.message.isStreaming).toBe(false);
  });
});
