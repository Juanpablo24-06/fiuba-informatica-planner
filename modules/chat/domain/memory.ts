import { normalizeText } from "./normalization";
export const MEMORY_CATEGORIES = [
  "identidad",
  "preferencias",
  "objetivos",
  "proyectos",
  "decisiones",
  "estudio",
  "general"
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

export type SynapseMemory = {
  id: string;
  content: string;
  category: MemoryCategory;
  confidence: number | null;
  sourceThreadId: string | null;
  sourceExcerpt: string | null;
  mem0Id: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemoryCandidate = {
  content: string;
  category?: MemoryCategory;
  confidence?: number | null;
};

const MAX_MEMORY_LENGTH = 800;
export const getMemoryOwnerKey = (role: "admin" | "viewer") => `role:${role}`;
export const toCategory = (value: unknown): MemoryCategory => {
  const normalized = normalizeText(String(value ?? ""));
  return MEMORY_CATEGORIES.find((category) => category === normalized) ?? "general";
};

export const cleanMemoryContent = (value: unknown) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_MEMORY_LENGTH);

const tokenize = (value: string) =>
  new Set(
    normalizeText(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3)
  );

export const rankLocalMemories = (memories: SynapseMemory[], query: string) => {
  const queryTokens = tokenize(query);
  return memories
    .map((memory) => {
      const memoryTokens = tokenize(memory.content);
      let overlap = 0;
      queryTokens.forEach((token) => {
        if (memoryTokens.has(token)) overlap += 1;
      });
      const coreBonus = ["identidad", "preferencias", "objetivos"].includes(memory.category)
        ? 0.45
        : 0;
      const confidenceBonus = (memory.confidence ?? 0.7) * 0.2;
      return { memory, score: overlap + coreBonus + confidenceBonus };
    })
    .sort((a, b) => b.score - a.score);
};

export const renderMemoryWiki = (memories: SynapseMemory[]) => {
  const grouped = new Map<MemoryCategory, SynapseMemory[]>();
  memories.forEach((memory) => {
    grouped.set(memory.category, [...(grouped.get(memory.category) ?? []), memory]);
  });
  return MEMORY_CATEGORIES.flatMap((category) => {
    const rows = grouped.get(category) ?? [];
    if (rows.length === 0) return [];
    const title = category.charAt(0).toUpperCase() + category.slice(1);
    return [`## ${title}`, ...rows.map((memory) => `- ${memory.content}`), ""];
  })
    .join("\n")
    .trim();
};

export const parseMemoryWiki = (wikiText: string) => {
  let category: MemoryCategory = "general";
  const memories: Array<{ content: string; category: MemoryCategory }> = [];
  for (const rawLine of wikiText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("##")) {
      category = toCategory(line.replace(/^#+/, "").trim());
      continue;
    }
    const content = cleanMemoryContent(line.replace(/^[-*]\s*/, ""));
    if (content.length >= 4) memories.push({ content, category });
  }
  return memories.slice(0, 250);
};

export const isExplicitMemoryRequest = (message: string) =>
  /\b(recorda|recordá|recuerda|acordate|guarda(?:lo)? en (?:tu )?memoria|memoriza|no olvides)\b/i.test(
    message
  );

export const isExplicitMemoryManagementRequest = (message: string) =>
  /\b(olvida|olvidá|borra|borrá|elimina|eliminá|corrige|corregí|actualiza|actualizá|cambia|cambiá)\b.*\b(memoria|recuerdo)|\b(memoria|recuerdo)\b.*\b(olvida|olvidá|borra|borrá|elimina|eliminá|corrige|corregí|actualiza|actualizá|cambia|cambiá)\b/i.test(
    message
  );
