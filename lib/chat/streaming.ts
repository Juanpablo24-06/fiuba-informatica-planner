import type {
  ChatMessage,
  ReasoningLevel,
  StreamProfile
} from "@/lib/chat/types";

export type {
  ChatMessage,
  ReasoningLevel,
  StreamProfile
} from "@/lib/chat/types";

export const getStreamProfile = (
  level: ReasoningLevel
): StreamProfile => {
  if (level === "bajo") {
    return { intervalMs: 10, reasoningStep: 8, answerStep: 7 };
  }
  if (level === "alto") {
    return { intervalMs: 42, reasoningStep: 1, answerStep: 1 };
  }
  return { intervalMs: 22, reasoningStep: 4, answerStep: 3 };
};

export const getPreflightDelayMs = (level: ReasoningLevel) => {
  if (level === "alto") return 1400;
  if (level === "medio") return 350;
  return 0;
};

export const advanceStreamingMessage = (
  message: ChatMessage,
  profile: StreamProfile
): {
  completed: boolean;
  message: ChatMessage;
} => {
  if (message.role !== "assistant") {
    return {
      completed: true,
      message
    };
  }

  if (message.streamStage === "reasoning" && message.reasoning) {
    const currentLength = message.displayedReasoning?.length ?? 0;
    const nextLength = Math.min(
      currentLength + profile.reasoningStep,
      message.reasoning.length
    );
    const reasoningDone = nextLength >= message.reasoning.length;

    const nextMessage: ChatMessage = {
      ...message,
      displayedReasoning: message.reasoning.slice(0, nextLength),
      streamStage: reasoningDone ? "answer" : "reasoning",
      reasoningOpen: !reasoningDone,
      isStreaming: true
    };

    return {
      completed: false,
      message: nextMessage
    };
  }

  const currentLength = message.displayed.length;
  const nextLength = Math.min(
    currentLength + profile.answerStep,
    message.content.length
  );
  const answerDone = nextLength >= message.content.length;

  const nextMessage: ChatMessage = {
    ...message,
    displayed: message.content.slice(0, nextLength),
    streamStage: answerDone ? "done" : "answer",
    isStreaming: !answerDone
  };

  return {
    completed: answerDone,
    message: nextMessage
  };
};
