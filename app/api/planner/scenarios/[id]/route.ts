import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import {
  deletePlannerScenario,
  getPlannerScenario,
  plannerScenarioUpdateSchema,
  updatePlannerScenario
} from "@/lib/planner/scenarios";

const profileFrom = (request: NextRequest) => request.nextUrl.searchParams.get("profileKey") ?? "default";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await props.params;
  try {
    const scenario = await getPlannerScenario(id, profileFrom(request));
    return scenario ? NextResponse.json({ scenario }) : NextResponse.json({ error: "Escenario no encontrado" }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "No se pudo cargar el escenario" }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await props.params;
  const parsed = plannerScenarioUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  try {
    const scenario = await updatePlannerScenario(id, parsed.data, profileFrom(request));
    return scenario ? NextResponse.json({ scenario }) : NextResponse.json({ error: "Escenario no encontrado" }, { status: 404 });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : error?.code === "23505" ? 409 : 503;
    return NextResponse.json({ error: error?.message ?? "No se pudo actualizar el escenario" }, { status });
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await props.params;
  try {
    const deleted = await deletePlannerScenario(id, profileFrom(request));
    return deleted ? NextResponse.json({ ok: true, ...deleted }) : NextResponse.json({ error: "Escenario no encontrado" }, { status: 404 });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 503;
    return NextResponse.json({ error: error?.message ?? "No se pudo eliminar el escenario" }, { status });
  }
}
