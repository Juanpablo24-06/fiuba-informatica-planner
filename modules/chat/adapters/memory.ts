import { toCategory, cleanMemoryContent, rankLocalMemories, parseMemoryWiki, type SynapseMemory, type MemoryCandidate, type MemoryCategory } from "../domain/memory";
export * from "../domain/memory";
import { normalizeText } from "@/modules/chat/domain/normalization";
import { supabaseAdmin } from "@/lib/supabase-admin";

type MemoryRow = {
  id: string;
  content: string;
  category: string;
  confidence: number | null;
  source_thread_id: string | null;
  source_excerpt: string | null;
  mem0_id: string | null;
  created_at: string;
  updated_at: string;
};

type Mem0Memory = {
  id?: string;
  memory?: string;
  text?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  categories?: string[];
  created_at?: string;
  updated_at?: string;
};

const MEM0_DEFAULT_URL = "https://api.mem0.ai";
const MAX_RELEVANT_MEMORIES = 8;



export const isMem0Configured = () => Boolean(process.env.MEM0_API_KEY);

const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, "\\$&");

const mapRow = (row: MemoryRow): SynapseMemory => ({
  id: row.id,
  content: row.content,
  category: toCategory(row.category),
  confidence: row.confidence,
  sourceThreadId: row.source_thread_id,
  sourceExcerpt: row.source_excerpt,
  mem0Id: row.mem0_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const fetchMem0 = async (path: string, init: RequestInit) => {
  const apiKey = process.env.MEM0_API_KEY;
  if (!apiKey) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(`${process.env.MEM0_API_URL ?? MEM0_DEFAULT_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      },
      signal: controller.signal
    });
    if (!response.ok) return null;
    if (response.status === 204) return {};
    return await response.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const syncMem0Rows = async (ownerKey: string, memories: Mem0Memory[]) => {
  const usable = memories
    .map((memory) => ({
      mem0_id: memory.id ?? null,
      owner_key: ownerKey,
      content: cleanMemoryContent(memory.memory ?? memory.text),
      category: toCategory(memory.categories?.[0] ?? memory.metadata?.category),
      confidence: typeof memory.score === "number" ? memory.score : null,
      metadata: { source: "mem0", ...(memory.metadata ?? {}) },
      status: "active",
      updated_at: memory.updated_at ?? new Date().toISOString()
    }))
    .filter((memory) => memory.mem0_id && memory.content);

  for (const memory of usable) {
    const { data: existing } = await supabaseAdmin
      .from("ai_memories")
      .select("id")
      .eq("mem0_id", memory.mem0_id)
      .maybeSingle();
    if (existing?.id) {
      await supabaseAdmin.from("ai_memories").update(memory).eq("id", existing.id);
    } else {
      const { data: sameContent } = await supabaseAdmin
        .from("ai_memories")
        .select("id")
        .eq("owner_key", ownerKey)
        .eq("status", "active")
        .ilike("content", escapeLikePattern(memory.content))
        .maybeSingle();
      if (sameContent?.id) {
        await supabaseAdmin.from("ai_memories").update(memory).eq("id", sameContent.id);
      } else {
        await supabaseAdmin.from("ai_memories").insert(memory);
      }
    }
  }
};

export const listMemories = async (ownerKey: string, syncMem0 = true) => {
  if (syncMem0 && isMem0Configured()) {
    const remote = await fetchMem0("/v3/memories/?page=1&page_size=200", {
      method: "POST",
      body: JSON.stringify({ filters: { user_id: ownerKey } })
    });
    if (Array.isArray(remote?.results)) {
      await syncMem0Rows(ownerKey, remote.results);
    }
  }

  const { data, error } = await supabaseAdmin
    .from("ai_memories")
    .select(
      "id,content,category,confidence,source_thread_id,source_excerpt,mem0_id,created_at,updated_at"
    )
    .eq("owner_key", ownerKey)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(250);

  if (error) return [];
  return ((data ?? []) as MemoryRow[]).map(mapRow);
};

export const searchRelevantMemories = async (ownerKey: string, query: string) => {
  let remoteResults: Mem0Memory[] = [];
  if (isMem0Configured()) {
    const remote = await fetchMem0("/v3/memories/search/", {
      method: "POST",
      body: JSON.stringify({
        query,
        filters: { user_id: ownerKey },
        top_k: MAX_RELEVANT_MEMORIES,
        threshold: 0.18,
        rerank: false
      })
    });
    if (Array.isArray(remote?.results)) {
      remoteResults = remote.results;
      await syncMem0Rows(ownerKey, remoteResults);
    }
  }

  const local = await listMemories(ownerKey, false);
  const remoteIds = new Set(remoteResults.map((memory) => memory.id).filter(Boolean));
  const ranked = rankLocalMemories(local, query)
    .sort((a, b) => {
      const aRemote = a.memory.mem0Id && remoteIds.has(a.memory.mem0Id) ? 1 : 0;
      const bRemote = b.memory.mem0Id && remoteIds.has(b.memory.mem0Id) ? 1 : 0;
      return bRemote - aRemote || b.score - a.score;
    })
    .slice(0, MAX_RELEVANT_MEMORIES)
    .map(({ memory }) => memory);

  if (ranked.length > 0) {
    await supabaseAdmin
      .from("ai_memories")
      .update({ last_used_at: new Date().toISOString() })
      .in("id", ranked.map((memory) => memory.id));
  }

  return ranked;
};

const rememberWithMem0 = async (
  ownerKey: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  metadata?: Record<string, unknown>,
  infer = true
) =>
  fetchMem0("/v3/memories/add/", {
    method: "POST",
    body: JSON.stringify({
      user_id: ownerKey,
      messages,
      metadata: { app: "synapse", ...(metadata ?? {}) },
      custom_instructions:
        "Guarda solo preferencias duraderas, objetivos, decisiones y contexto personal útil. No guardes datos académicos que ya pertenezcan a la base de datos, secretos, credenciales ni hechos inciertos.",
      infer
    })
  });

export const addConversationToMem0 = async ({
  ownerKey,
  userMessage,
  assistantMessage,
  threadId
}: {
  ownerKey: string;
  userMessage: string;
  assistantMessage: string;
  threadId?: string | null;
}) => {
  if (!isMem0Configured()) return false;
  const result = await rememberWithMem0(
    ownerKey,
    [
      { role: "user", content: userMessage.slice(0, 4000) },
      { role: "assistant", content: assistantMessage.slice(0, 4000) }
    ],
    { source: "chat", thread_id: threadId ?? null },
    true
  );
  return Boolean(result);
};

export const createMemory = async ({
  ownerKey,
  content,
  category = "general",
  confidence = null,
  sourceThreadId = null,
  sourceExcerpt = null,
  syncMem0 = true
}: {
  ownerKey: string;
  content: string;
  category?: MemoryCategory;
  confidence?: number | null;
  sourceThreadId?: string | null;
  sourceExcerpt?: string | null;
  syncMem0?: boolean;
}) => {
  const clean = cleanMemoryContent(content);
  if (clean.length < 4) return null;

  const { data: existing } = await supabaseAdmin
    .from("ai_memories")
    .select(
      "id,content,category,confidence,source_thread_id,source_excerpt,mem0_id,created_at,updated_at"
    )
    .eq("owner_key", ownerKey)
    .eq("status", "active")
    .ilike("content", escapeLikePattern(clean))
    .maybeSingle();
  if (existing) return mapRow(existing as MemoryRow);

  const { data, error } = await supabaseAdmin
    .from("ai_memories")
    .insert({
      owner_key: ownerKey,
      content: clean,
      category: toCategory(category),
      confidence,
      source_thread_id: sourceThreadId,
      source_excerpt: sourceExcerpt?.slice(0, 600) ?? null,
      metadata: { source: sourceThreadId ? "chat" : "manual" }
    })
    .select(
      "id,content,category,confidence,source_thread_id,source_excerpt,mem0_id,created_at,updated_at"
    )
    .single();

  if (error || !data) return null;
  if (syncMem0 && isMem0Configured()) {
    void rememberWithMem0(
      ownerKey,
      [{ role: "user", content: clean }],
      { source: "synapse_memory_panel", category },
      false
    );
  }
  return mapRow(data as MemoryRow);
};

export const updateMemory = async ({
  ownerKey,
  id,
  content,
  category
}: {
  ownerKey: string;
  id: string;
  content: string;
  category?: MemoryCategory;
}) => {
  const clean = cleanMemoryContent(content);
  if (clean.length < 4) return null;
  const current = (await listMemories(ownerKey, false)).find((memory) => memory.id === id);
  if (!current) return null;

  const { data, error } = await supabaseAdmin
    .from("ai_memories")
    .update({
      content: clean,
      category: toCategory(category ?? current.category),
      updated_at: new Date().toISOString()
    })
    .eq("id", id)
    .eq("owner_key", ownerKey)
    .eq("status", "active")
    .select(
      "id,content,category,confidence,source_thread_id,source_excerpt,mem0_id,created_at,updated_at"
    )
    .single();
  if (error || !data) return null;

  if (current.mem0Id && isMem0Configured()) {
    void fetchMem0(`/v1/memories/${current.mem0Id}/`, {
      method: "PUT",
      body: JSON.stringify({ text: clean, metadata: { category: category ?? current.category } })
    });
  }
  return mapRow(data as MemoryRow);
};

export const deleteMemory = async (ownerKey: string, id: string) => {
  const current = (await listMemories(ownerKey, false)).find((memory) => memory.id === id);
  if (!current) return false;
  const { error } = await supabaseAdmin
    .from("ai_memories")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_key", ownerKey);
  if (!error && current.mem0Id && isMem0Configured()) {
    void fetchMem0(`/v1/memories/${current.mem0Id}/`, { method: "DELETE" });
  }
  return !error;
};

export const snapshotMemories = async (ownerKey: string, reason: string) => {
  const current = await listMemories(ownerKey, false);
  await supabaseAdmin.from("ai_memory_revisions").insert({
    owner_key: ownerKey,
    snapshot: current,
    reason
  });
};

export const replaceMemoryWiki = async (ownerKey: string, wikiText: string) => {
  const desired = parseMemoryWiki(wikiText);
  await snapshotMemories(ownerKey, "wiki_replace");
  const current = await listMemories(ownerKey, false);
  const desiredKeys = new Set(
    desired.map((memory) => `${memory.category}:${normalizeText(memory.content)}`)
  );

  for (const memory of current) {
    const key = `${memory.category}:${normalizeText(memory.content)}`;
    if (!desiredKeys.has(key)) await deleteMemory(ownerKey, memory.id);
  }
  for (const memory of desired) {
    const exists = current.some(
      (candidate) =>
        candidate.category === memory.category &&
        normalizeText(candidate.content) === normalizeText(memory.content)
    );
    if (!exists) await createMemory({ ownerKey, ...memory });
  }
  return listMemories(ownerKey, false);
};

export const deleteAllMemories = async (ownerKey: string) => {
  await snapshotMemories(ownerKey, "delete_all");
  const current = await listMemories(ownerKey, false);
  const { error } = await supabaseAdmin
    .from("ai_memories")
    .update({ status: "deleted", updated_at: new Date().toISOString() })
    .eq("owner_key", ownerKey)
    .eq("status", "active");
  if (!error && isMem0Configured()) {
    void fetchMem0(`/v1/memories/?user_id=${encodeURIComponent(ownerKey)}`, {
      method: "DELETE"
    });
  }
  return { ok: !error, deleted: current.length };
};

export const restoreLastMemoryRevision = async (ownerKey: string) => {
  const { data: revision, error } = await supabaseAdmin
    .from("ai_memory_revisions")
    .select("id,snapshot")
    .eq("owner_key", ownerKey)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !revision || !Array.isArray(revision.snapshot)) return null;

  await supabaseAdmin
    .from("ai_memories")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("owner_key", ownerKey)
    .eq("status", "active");

  for (const raw of revision.snapshot as Array<Partial<SynapseMemory>>) {
    const content = cleanMemoryContent(raw.content);
    if (!content) continue;
    const restored = {
      owner_key: ownerKey,
      content,
      category: toCategory(raw.category),
      confidence: raw.confidence ?? null,
      source_thread_id: raw.sourceThreadId ?? null,
      source_excerpt: raw.sourceExcerpt ?? null,
      status: "active",
      updated_at: new Date().toISOString()
    };
    const { data: restoredRow } = raw.id
      ? await supabaseAdmin
          .from("ai_memories")
          .update(restored)
          .eq("id", raw.id)
          .eq("owner_key", ownerKey)
          .select("id")
          .maybeSingle()
      : { data: null };
    if (!restoredRow) {
      await supabaseAdmin.from("ai_memories").insert({
        ...restored,
        mem0_id: raw.mem0Id ?? null,
        metadata: { source: "memory_restore" }
      });
    }

    if (isMem0Configured()) {
      const remoteRestored = raw.mem0Id
        ? await fetchMem0(`/v1/memories/${raw.mem0Id}/`, {
            method: "PUT",
            body: JSON.stringify({ text: content, metadata: { category: toCategory(raw.category) } })
          })
        : null;
      if (!remoteRestored) {
        void rememberWithMem0(
          ownerKey,
          [{ role: "user", content }],
          { source: "memory_restore", category: toCategory(raw.category) },
          false
        );
      }
    }
  }
  await supabaseAdmin.from("ai_memory_revisions").delete().eq("id", revision.id);
  return listMemories(ownerKey, false);
};

export const applyMemoryCandidates = async ({
  ownerKey,
  candidates,
  explicitRequest,
  sourceThreadId,
  sourceExcerpt
}: {
  ownerKey: string;
  candidates: MemoryCandidate[];
  explicitRequest: boolean;
  sourceThreadId?: string | null;
  sourceExcerpt?: string | null;
}) => {
  const accepted = candidates
    .filter((candidate) => explicitRequest || (candidate.confidence ?? 0) >= 0.86)
    .slice(0, 3);
  const created: SynapseMemory[] = [];
  for (const candidate of accepted) {
    const memory = await createMemory({
      ownerKey,
      content: candidate.content,
      category: toCategory(candidate.category),
      confidence: candidate.confidence ?? null,
      sourceThreadId,
      sourceExcerpt
    });
    if (memory) created.push(memory);
  }
  return created;
};
