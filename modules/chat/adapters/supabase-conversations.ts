import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ConversationRepository } from "../application/ports";
export const conversationRepository: ConversationRepository = {
  async findHistory(threadId) {
    if (!threadId) return [];
    const { data, error } = await supabaseAdmin.from("chat_messages").select("role,content").eq("thread_id", threadId).order("created_at", { ascending: true }).limit(12);
    if (error) return [];
    return (data ?? []).filter((row) => row?.role === "user" || row?.role === "assistant").map((row) => ({ role: row.role as "user" | "assistant", content: String(row.content ?? "").slice(0, 1200) }));
  },
  async createThread(role) {
    const { data } = await supabaseAdmin.from("chat_threads").insert({ owner_role: role }).select("id").single();
    return data?.id ?? null;
  },
  async insertMessages(messages) {
    const { error } = await supabaseAdmin.from("chat_messages").insert(messages);
    return !error;
  }
};
