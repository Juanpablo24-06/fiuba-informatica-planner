import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { callAIJSON, hasAnyAIProviderConfigured } from "@/lib/ai/provider";
import {
  MEMORY_CATEGORIES,
  createMemory,
  deleteAllMemories,
  deleteMemory,
  getMemoryOwnerKey,
  isMem0Configured,
  listMemories,
  renderMemoryWiki,
  replaceMemoryWiki,
  restoreLastMemoryRevision,
  snapshotMemories,
  updateMemory
} from "@/lib/ai/memory";

const categorySchema = z.enum(MEMORY_CATEGORIES);

const requestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"),
    content: z.string().trim().min(4).max(800),
    category: categorySchema.optional()
  }),
  z.object({
    action: z.literal("replace_wiki"),
    wikiText: z.string().max(80_000)
  }),
  z.object({
    action: z.literal("command"),
    command: z.string().trim().min(3).max(1200)
  }),
  z.object({ action: z.literal("undo") })
]);

const commandResultSchema = z.object({
  summary: z.string().trim().min(1).max(300),
  operations: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("add"),
          content: z.string().trim().min(4).max(800),
          category: categorySchema.default("general")
        }),
        z.object({
          type: z.literal("update"),
          id: z.string().uuid(),
          content: z.string().trim().min(4).max(800),
          category: categorySchema.optional()
        }),
        z.object({ type: z.literal("delete"), id: z.string().uuid() })
      ])
    )
    .max(12)
    .default([])
});

const responseFor = async (ownerKey: string, syncMem0 = false) => {
  const memories = await listMemories(ownerKey, syncMem0);
  return {
    memories,
    wikiText: renderMemoryWiki(memories),
    provider: isMem0Configured() ? "mem0+supabase" : "supabase",
    mem0Configured: isMem0Configured()
  };
};

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  return NextResponse.json(await responseFor(getMemoryOwnerKey(session.role), true));
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud de memoria inválida." }, { status: 400 });
  }

  const ownerKey = getMemoryOwnerKey(session.role);
  if (parsed.data.action === "create") {
    await createMemory({
      ownerKey,
      content: parsed.data.content,
      category: parsed.data.category ?? "general"
    });
    return NextResponse.json(await responseFor(ownerKey));
  }
  if (parsed.data.action === "replace_wiki") {
    await replaceMemoryWiki(ownerKey, parsed.data.wikiText);
    return NextResponse.json(await responseFor(ownerKey));
  }
  if (parsed.data.action === "undo") {
    const restored = await restoreLastMemoryRevision(ownerKey);
    if (!restored) {
      return NextResponse.json({ error: "No hay cambios de memoria para deshacer." }, { status: 404 });
    }
    return NextResponse.json(await responseFor(ownerKey));
  }

  if (!hasAnyAIProviderConfigured()) {
    return NextResponse.json(
      { error: "Se necesita un proveedor AI configurado para interpretar esta instrucción." },
      { status: 501 }
    );
  }
  const memories = await listMemories(ownerKey, false);
  const prompt = [
    "Sos el editor controlado de la memoria de Synapse.",
    "Interpreta la solicitud del usuario y devuelve solo operaciones concretas sobre la lista disponible.",
    "No inventes IDs. No cambies datos académicos, secretos ni credenciales.",
    "Si la solicitud es ambigua, no hagas operaciones y explicalo brevemente en summary.",
    "Responde SOLO JSON con {summary, operations}.",
    `Categorías válidas: ${MEMORY_CATEGORIES.join(", ")}.`,
    "Memorias actuales:",
    JSON.stringify(memories.map(({ id, content, category }) => ({ id, content, category }))),
    "Solicitud:",
    parsed.data.command
  ].join("\n");
  const result = await callAIJSON(prompt, commandResultSchema, { provider: "auto" });
  if (!result.ok) {
    return NextResponse.json(
      { error: "No pude interpretar el cambio de memoria.", details: result.error },
      { status: 502 }
    );
  }

  if ((result.data.operations ?? []).length > 0) {
    await snapshotMemories(ownerKey, "memory_command");
  }
  for (const operation of result.data.operations ?? []) {
    if (operation.type === "add") {
      await createMemory({
        ownerKey,
        content: operation.content,
        category: operation.category
      });
    } else if (operation.type === "update") {
      await updateMemory({ ownerKey, ...operation });
    } else {
      await deleteMemory(ownerKey, operation.id);
    }
  }
  return NextResponse.json({ ...(await responseFor(ownerKey)), summary: result.data.summary });
}

export async function DELETE(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (body?.confirm !== "BORRAR MEMORIA") {
    return NextResponse.json({ error: "Confirmación inválida." }, { status: 400 });
  }
  const ownerKey = getMemoryOwnerKey(session.role);
  const result = await deleteAllMemories(ownerKey);
  return NextResponse.json({ ...result, ...(await responseFor(ownerKey)) });
}
