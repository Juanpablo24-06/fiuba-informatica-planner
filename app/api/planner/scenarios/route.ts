import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import {
  createPlannerScenario,
  getPlannerScenarioBundle,
  plannerScenarioCreateSchema,
  plannerTermIdSchema,
  PlannerSchemaUnavailableError
} from "@/lib/planner/scenarios";

const profileFrom = (request: NextRequest) => request.nextUrl.searchParams.get("profileKey") ?? "default";

export async function GET(request: NextRequest) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ scenarios: [] }, { status: 401 });
  const termId = plannerTermIdSchema.safeParse(request.nextUrl.searchParams.get("termId"));
  if (!termId.success) return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  try {
    return NextResponse.json(await getPlannerScenarioBundle(termId.data, profileFrom(request)));
  } catch (error) {
    if (error instanceof PlannerSchemaUnavailableError) return NextResponse.json({ scenarios: [], unavailable: true }, { status: 503 });
    return NextResponse.json({ error: "No se pudieron cargar los escenarios" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = plannerScenarioCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  try {
    const scenario = await createPlannerScenario(parsed.data);
    return NextResponse.json({ scenario }, { status: 201 });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : error?.code === "23505" ? 409 : 503;
    return NextResponse.json({ error: error?.message ?? "No se pudo crear el escenario" }, { status });
  }
}
