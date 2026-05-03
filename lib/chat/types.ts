export type ReasoningLevel = "bajo" | "medio" | "alto";
export type AIProvider = "auto" | "openrouter" | "nvidia" | "gemini";

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
};

export type ChatSession = {
  id: string;
  title: string;
  threadId: string | null;
  messages: ChatMessage[];
  updatedAt: number;
};
