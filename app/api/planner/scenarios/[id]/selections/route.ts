import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import {
  createPlannerSelection,
  getPlannerScenario,
  listPlannerSelections,
  plannerSelectionCreateSchema
} from "@/lib/planner/scenarios";

const profileFrom = (request: NextRequest) => request.nextUrl.searchParams.get("profileKey") ?? "default";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ selections: [] }, { status: 401 });
  const { id } = await props.params;
  try {
    const scenario = await getPlannerScenario(id, profileFrom(request));
    if (!scenario) return NextResponse.json({ error: "Escenario no encontrado" }, { status: 404 });
    const selections = await listPlannerSelections(id);
    return NextResponse.json({ selections });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las selecciones" }, { status: 503 });
  }
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await props.params;
  const parsed = plannerSelectionCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  try {
    const selection = await createPlannerSelection(id, parsed.data, profileFrom(request));
    return selection ? NextResponse.json({ selection }, { status: 201 }) : NextResponse.json({ error: "Escenario no encontrado" }, { status: 404 });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 503;
    return NextResponse.json({ error: error?.message ?? "No se pudo crear la selección" }, { status });
  }
}
