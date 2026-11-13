export type ReasoningLevel = "bajo" | "medio" | "alto";
export type AIProvider = "auto" | "openrouter" | "nvidia";

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
  actionResults?: AssistantActionResult[];
  provider?: string | null;
  model?: string | null;
  reasoning?: string | null;
  reasoningMode?: string | null;
  attachments?: Array<{ name: string; type: string; size: number }>;
};

export type ChatSession = {
  id: string;
  title: string;
  threadId: string | null;
  messages: ChatMessage[];
  updatedAt: number;
};
