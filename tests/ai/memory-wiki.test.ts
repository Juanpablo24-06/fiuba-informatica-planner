import { describe, expect, it } from "vitest";
import { parseMemoryWiki, renderMemoryWiki, type SynapseMemory } from "@/lib/ai/memory";

const memory = (content: string, category: SynapseMemory["category"]): SynapseMemory => ({
  id: `${category}-${content}`,
  content,
  category,
  confidence: 0.9,
  sourceThreadId: null,
  sourceExcerpt: null,
  mem0Id: null,
  createdAt: "2026-08-08T00:00:00.000Z",
  updatedAt: "2026-08-08T00:00:00.000Z"
});

describe("editable memory wiki", () => {
  it("round-trips categorized memories", () => {
    const source = [
      memory("Prefiere respuestas breves", "preferencias"),
      memory("Está preparando Algoritmos II", "estudio")
    ];
    expect(parseMemoryWiki(renderMemoryWiki(source))).toEqual([
      { content: "Prefiere respuestas breves", category: "preferencias" },
      { content: "Está preparando Algoritmos II", category: "estudio" }
    ]);
  });
});
