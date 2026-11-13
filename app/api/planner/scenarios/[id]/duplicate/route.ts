import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { duplicatePlannerScenario } from "@/lib/planner/scenarios";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await props.params;
  const body = await request.json().catch(() => null) as { name?: string; profileKey?: string } | null;
  try {
    const scenario = await duplicatePlannerScenario(id, body?.profileKey ?? "default", body?.name);
    return scenario ? NextResponse.json({ scenario }, { status: 201 }) : NextResponse.json({ error: "Escenario no encontrado" }, { status: 404 });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : error?.code === "23505" ? 409 : 503;
    return NextResponse.json({ error: error?.message ?? "No se pudo duplicar el escenario" }, { status });
  }
}
