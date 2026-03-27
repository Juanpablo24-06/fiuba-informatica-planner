export type ReasoningLevel = "bajo" | "medio" | "alto";
export type AIProvider = "auto" | "cerebras" | "nvidia" | "gemini";

export type AssistantActionResult = {
  type: string;
  ok: boolean;
  summary: string;
};

export type ChatRequestHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  displayed: string;
  reasoning?: string | null;
  displayedReasoning?: string;
  streamStage?: "reasoning" | "answer" | "done";
  reasoningOpen?: boolean;
  actionResults?: AssistantActionResult[];
  isStreaming?: boolean;
};

export type ChatSession = {
  id: string;
  title: string;
  threadId: string | null;
  messages: ChatMessage[];
  updatedAt: number;
};

export type StreamProfile = {
  intervalMs: number;
  reasoningStep: number;
  answerStep: number;
};
