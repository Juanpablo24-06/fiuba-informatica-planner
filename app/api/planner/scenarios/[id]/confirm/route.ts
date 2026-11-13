import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { confirmPlannerScenario, plannerConfirmSchema } from "@/lib/planner/scenarios";

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await props.params;
  const parsed = plannerConfirmSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos", issues: parsed.error.issues }, { status: 400 });
  try {
    const result = await confirmPlannerScenario(id, parsed.data, request.nextUrl.searchParams.get("profileKey") ?? "default");
    if (result === null) return NextResponse.json({ error: "Escenario no encontrado" }, { status: 404 });
    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    const status = typeof error?.status === "number" ? error.status : error?.code === "23505" ? 409 : 422;
    return NextResponse.json({ error: error?.message ?? "No se pudo confirmar el escenario" }, { status });
  }
}
