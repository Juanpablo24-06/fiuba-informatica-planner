import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { plannerEntryService } from "@/modules/planning/server";
import type { ParsedCommission } from "@/lib/planner/offer-parser";

export async function GET(request: NextRequest) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ offers: [] }, { status: 401 });
  const termId = request.nextUrl.searchParams.get("termId");
  if (!termId) return NextResponse.json({ offers: [] });
  try {
    return NextResponse.json({ offers: await plannerEntryService.listOffers(termId) });
  } catch {
    return NextResponse.json({ offers: [], unavailable: true });
  }
}

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null) as { termId?: string; offers?: ParsedCommission[] } | null;
  if (!body?.termId || !Array.isArray(body.offers)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    return NextResponse.json({ offers: await plannerEntryService.replaceOffers(body.termId, body.offers) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo importar la oferta" }, { status: 503 });
  }
}
