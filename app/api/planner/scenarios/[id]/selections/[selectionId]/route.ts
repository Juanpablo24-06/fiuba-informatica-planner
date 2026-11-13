import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import {
  deletePlannerSelection,
  plannerSelectionUpdateSchema,
  updatePlannerSelection
} from "@/lib/planner/scenarios";

const profileFrom = (request: NextRequest) => request.nextUrl.searchParams.get("profileKey") ?? "default";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string; selectionId: string }> }) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, selectionId } = await props.params;
  const parsed = plannerSelectionUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  try {
    const selection = await updatePlannerSelection(id, selectionId, parsed.data, profileFrom(request));
    return selection ? NextResponse.json({ selection }) : NextResponse.json({ error: "Selección no encontrada" }, { status: 404 });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 503;
    return NextResponse.json({ error: error?.message ?? "No se pudo actualizar la selección" }, { status });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string; selectionId: string }> }) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, selectionId } = await props.params;
  try {
    const deleted = await deletePlannerSelection(id, selectionId, profileFrom(request));
    return deleted ? NextResponse.json({ ok: true, ...deleted }) : NextResponse.json({ error: "Selección no encontrada" }, { status: 404 });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 503;
    return NextResponse.json({ error: error?.message ?? "No se pudo eliminar la selección" }, { status });
  }
}
