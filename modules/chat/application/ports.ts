import type { Subject } from "@/modules/academic/domain/types";
import type { ChatPayload } from "../domain/request";
import type { SynapseMemory, MemoryCandidate, MemoryCategory } from "../domain/memory";

export interface ChatContextReader {
  load(payload: ChatPayload): Promise<{
    subjects: Subject[];
    recentMessages: { role: "user" | "assistant"; content: string }[];
    context: Record<string, unknown>;
  }>;
}
export interface ConversationRepository {
  findHistory(threadId: string | undefined): Promise<{ role: "user" | "assistant"; content: string }[]>;
  createThread(role: "admin" | "viewer"): Promise<string | null>;
  insertMessages(messages: { thread_id: string; role: "user" | "assistant"; content: string; metadata: Record<string, unknown> }[]): Promise<boolean>;
}
export interface MemoryGateway {
  searchRelevantMemories(ownerKey: string, query: string): Promise<SynapseMemory[]>;
  snapshotMemories(ownerKey: string, reason: string): Promise<void>;
  updateMemory(input: { ownerKey: string; id: string; content: string; category?: MemoryCategory }): Promise<SynapseMemory | null>;
  deleteMemory(ownerKey: string, id: string): Promise<boolean>;
  applyMemoryCandidates(input: { ownerKey: string; candidates: MemoryCandidate[]; explicitRequest: boolean; sourceThreadId?: string | null; sourceExcerpt?: string | null }): Promise<SynapseMemory[]>;
  addConversationToMem0(input: { ownerKey: string; userMessage: string; assistantMessage: string; threadId?: string | null }): Promise<boolean>;
  isMem0Configured(): boolean;
}
