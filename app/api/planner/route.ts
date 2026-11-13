import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { plannerEntryService } from "@/modules/planning/server";
import { plannerProfileKeySchema, plannerTermIdSchema, getPlannerScenarioBundle, PlannerSchemaUnavailableError } from "@/lib/planner/scenarios";
import type { PlannerEntry } from "@/lib/planner/types";

const profileKey = (request: NextRequest) => plannerProfileKeySchema.parse(request.nextUrl.searchParams.get("profileKey") ?? "default");

const legacyEntries = plannerEntryService.listEntries;

export async function GET(request: NextRequest) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ scenarios: [], entries: [] }, { status: 401 });
  const termId = request.nextUrl.searchParams.get("termId");
  if (!termId) return NextResponse.json({ scenarios: [], entries: [], activeScenarioId: null });
  const parsedTerm = plannerTermIdSchema.safeParse(termId);
  if (!parsedTerm.success) return NextResponse.json({ error: "Período inválido" }, { status: 400 });
  try {
    const selectedProfile = profileKey(request);
    const [bundle, entries] = await Promise.all([
      getPlannerScenarioBundle(parsedTerm.data, selectedProfile),
      legacyEntries(parsedTerm.data, selectedProfile)
    ]);
    return NextResponse.json({ ...bundle, entries });
  } catch (error) {
    if (error instanceof PlannerSchemaUnavailableError) {
      try {
        return NextResponse.json({ scenarios: [], activeScenarioId: null, entries: await legacyEntries(parsedTerm.data, profileKey(request)), unavailable: true });
      } catch {
        return NextResponse.json({ scenarios: [], activeScenarioId: null, entries: [], unavailable: true });
      }
    }
    return NextResponse.json({ scenarios: [], entries: [], unavailable: true }, { status: 503 });
  }
}

/**
 * Legacy bulk entry endpoint. New clients should mutate a scenario or one
 * selection at a time through the nested routes; keeping this endpoint avoids
 * breaking older Planner clients while 009 rolls out.
 */
export async function POST(request: NextRequest) {
  if (!getSessionFromRequest(request)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await request.json().catch(() => null) as { termId?: string; entries?: PlannerEntry[] } | null;
  const parsedTerm = plannerTermIdSchema.safeParse(body?.termId);
  if (!parsedTerm.success || !Array.isArray(body?.entries)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  try {
    const entries = await plannerEntryService.replaceEntries(parsedTerm.data, body.entries);
    return NextResponse.json({ entries });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el plan" }, { status: 503 });
  }
}
