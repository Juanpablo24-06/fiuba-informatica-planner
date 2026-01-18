import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { callAIJSON } from "@/lib/ai/provider";
import { calendarEnrichmentBatchSchema } from "@/lib/ai/schemas";

const payloadSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime()
});

const buildPrompt = (
  events: Array<{
    provider_event_id: string;
    source: string;
    title: string | null;
    description: string | null;
    location: string | null;
    starts_at: string;
    ends_at: string | null;
  }>,
  subjects: Array<{ id: string; name: string; code: string | null }>
) => {
  return [
    "Clasifica eventos academicos. Responde SOLO JSON valido.",
    "Debes devolver un objeto con la clave enrichments (array).",
    "Cada enrichment corresponde a un evento y debe incluir provider_event_id.",
    "Si faltan datos, usa needs_review=true y explica brevemente.",
    "Schema esperado:",
    JSON.stringify(
      {
        enrichments: [
          {
            provider_event_id: "string",
            kind: "exam | class | tp | final | meeting | other | unknown",
            subject_id: "uuid o null",
            instance: "1 | 2 | recup | null",
            priority: 1,
            tags: ["Parcial 1"],
            confidence: 0.0,
            needs_review: false,
            explanation_short: "texto corto",
            model: "gemini"
          }
        ]
      },
      null,
      2
    ),
    "Materias disponibles (id, name, code):",
    JSON.stringify(subjects, null, 2),
    "Eventos a enriquecer:",
    JSON.stringify(events, null, 2)
  ].join("\n");
};

const buildFallbackRows = (
  rawEvents: Array<{ id: string; provider_event_id: string }>,
  reason: string
) =>
  rawEvents.map((event) => ({
    event_id: event.id,
    kind: "unknown",
    subject_id: null,
    instance: null,
    priority: null,
    tags: [],
    confidence: 0,
    needs_review: true,
    explanation_short: reason,
    model:
      process.env.CEREBRAS_MODEL ??
      process.env.GEMINI_MODEL ??
      "unknown"
  }));

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos invalidos." }, { status: 400 });
  }

  if (!process.env.CEREBRAS_API_KEY && !process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      {
        error: "AI no configurada.",
        instructions: "Define CEREBRAS_API_KEY (o GEMINI_API_KEY) en .env.local y reinicia el server."
      },
      { status: 501 }
    );
  }

  const { data: rawEvents, error } = await supabaseAdmin
    .from("calendar_events_raw")
    .select(
      "id,provider_event_id,source,title,description,location,starts_at,ends_at"
    )
    .gte("starts_at", parsed.data.start)
    .lte("starts_at", parsed.data.end)
    .order("starts_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rawEvents || rawEvents.length === 0) {
    return NextResponse.json({ ok: true, message: "No hay eventos raw en el rango." });
  }

  const { data: subjects, error: subjectError } = await supabaseAdmin
    .from("subjects")
    .select("id,name,code")
    .order("name", { ascending: true });

  if (subjectError) {
    return NextResponse.json({ error: subjectError.message }, { status: 500 });
  }

  const prompt = buildPrompt(
    rawEvents.map((event) => ({
      provider_event_id: event.provider_event_id,
      source: event.source,
      title: event.title ?? null,
      description: event.description ?? null,
      location: event.location ?? null,
      starts_at: event.starts_at,
      ends_at: event.ends_at ?? null
    })),
    (subjects ?? []).map((subject) => ({
      id: subject.id,
      name: subject.name,
      code: subject.code ?? null
    }))
  );

  const result = await callAIJSON(prompt, calendarEnrichmentBatchSchema);

  let rows: Array<{
    event_id: string;
    kind: string | null;
    subject_id: string | null;
    instance: string | null;
    priority: number | null;
    tags: string[] | null;
    confidence: number | null;
    needs_review: boolean;
    explanation_short: string | null;
    model: string | null;
  }> = [];

  if (!result.ok) {
    rows = buildFallbackRows(rawEvents, "Respuesta AI invalida o incompleta.");
  } else {
    const rawByProviderId = new Map(rawEvents.map((event) => [event.provider_event_id, event]));
    rows = result.data.enrichments
      .map((enrichment) => {
        const raw = rawByProviderId.get(enrichment.provider_event_id);
        if (!raw) return null;
        return {
          event_id: raw.id,
          kind: enrichment.kind ?? "unknown",
          subject_id: enrichment.subject_id ?? null,
          instance: enrichment.instance ?? null,
          priority: enrichment.priority ?? null,
          tags: enrichment.tags ?? [],
          confidence: enrichment.confidence ?? null,
          needs_review: enrichment.needs_review ?? false,
          explanation_short: enrichment.explanation_short ?? null,
          model: enrichment.model ?? result.model
        };
      })
      .filter(Boolean) as typeof rows;
  }

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, message: "Sin enrichments aplicables." });
  }

  const { error: upsertError } = await supabaseAdmin
    .from("calendar_event_enrichments")
    .upsert(rows, { onConflict: "event_id" });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length, needs_review: !result.ok });
}
