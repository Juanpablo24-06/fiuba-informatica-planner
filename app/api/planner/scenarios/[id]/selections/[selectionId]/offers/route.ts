import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { getPlannerScenario, getPlannerSelectionOffers, plannerOfferLinkSchema, setPlannerSelectionOffers } from "@/lib/planner/scenarios";

const profileFrom = (request: NextRequest) => request.nextUrl.searchParams.get("profileKey") ?? "default";

export async function GET(request: NextRequest, props: { params: Promise<{ id: string; selectionId: string }> }) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ offerIds: [] }, { status: 401 });
  const { id, selectionId } = await props.params;
  try {
    const scenario = await getPlannerScenario(id, profileFrom(request));
    if (!scenario) return NextResponse.json({ error: "Escenario no encontrado" }, { status: 404 });
    return NextResponse.json({ offerIds: await getPlannerSelectionOffers(selectionId, id) });
  } catch {
    return NextResponse.json({ error: "No se pudieron cargar las comisiones" }, { status: 503 });
  }
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string; selectionId: string }> }) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, selectionId } = await props.params;
  const parsed = plannerOfferLinkSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  try {
    const offerIds = await setPlannerSelectionOffers(selectionId, parsed.data.offerIds, profileFrom(request), id);
    return offerIds ? NextResponse.json({ offerIds }) : NextResponse.json({ error: "Selección no encontrada" }, { status: 404 });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : 503;
    return NextResponse.json({ error: error?.message ?? "No se pudieron guardar las comisiones" }, { status });
  }
}
