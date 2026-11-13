import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import {
  MEMORY_CATEGORIES,
  deleteMemory,
  getMemoryOwnerKey,
  updateMemory
} from "@/lib/ai/memory";

const patchSchema = z.object({
  content: z.string().trim().min(4).max(800),
  category: z.enum(MEMORY_CATEGORIES).optional()
});

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const parsedId = z.string().uuid().safeParse(params.id);
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsedId.success || !parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  const memory = await updateMemory({
    ownerKey: getMemoryOwnerKey(session.role),
    id: parsedId.data,
    ...parsed.data
  });
  if (!memory) return NextResponse.json({ error: "Memoria no encontrada." }, { status: 404 });
  return NextResponse.json({ memory });
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  const parsedId = z.string().uuid().safeParse(params.id);
  if (!parsedId.success) return NextResponse.json({ error: "ID inválido." }, { status: 400 });
  const deleted = await deleteMemory(getMemoryOwnerKey(session.role), parsedId.data);
  if (!deleted) return NextResponse.json({ error: "Memoria no encontrada." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
