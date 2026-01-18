import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { requireRoleFromRequest } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { callAIJSON } from "@/lib/ai/provider";
import { weeklySummarySchema } from "@/lib/ai/schemas";
import { getWeekRange } from "@/lib/date";

const payloadSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional()
});

const buildPrompt = (range: { start: string; end: string }, items: any[]) =>
  [
    "Resume la semana academica. Responde SOLO JSON valido.",
    "Schema esperado:",
    JSON.stringify(
      {
        week_start: range.start,
        week_end: range.end,
        title: "string",
        highlights: ["string"],
        deadlines: ["string"],
        risks: ["string"],
        focus_subjects: ["string"],
        action_items: ["string"],
        confidence: 0.0,
        model: "gemini"
      },
      null,
      2
    ),
    "Eventos con enrichments:",
    JSON.stringify(items, null, 2)
  ].join("\n");

export async function POST(request: NextRequest) {
  const session = requireRoleFromRequest(request, "admin");
  if (!session) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(payload ?? {});
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

  const now = new Date();
  const defaultRange = getWeekRange(now);
  const range = {
    start: parsed.data.start ?? defaultRange.start.toISOString(),
    end: parsed.data.end ?? defaultRange.end.toISOString()
  };

  const { data, error } = await supabaseAdmin
    .from("calendar_events_raw")
    .select(
      "provider_event_id,title,starts_at,ends_at,source,calendar_event_enrichments(kind,instance,tags,needs_review,confidence,subject_id)"
    )
    .gte("starts_at", range.start)
    .lte("starts_at", range.end)
    .order("starts_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ ok: true, message: "No hay eventos en el rango." });
  }

  const subjectIds = Array.from(
    new Set(
      data.flatMap((row: any) =>
        (row.calendar_event_enrichments ?? []).map((enrichment: any) => enrichment.subject_id)
      )
    )
  ).filter(Boolean) as string[];

  const subjectMap = new Map<string, { id: string; name: string }>();
  if (subjectIds.length) {
    const { data: subjects } = await supabaseAdmin
      .from("subjects")
      .select("id,name")
      .in("id", subjectIds);
    (subjects ?? []).forEach((subject) => subjectMap.set(subject.id, subject));
  }

  const items = data
    .map((row: any) => {
      const enrichments = (row.calendar_event_enrichments ?? []) as Array<{
        kind: string | null;
        instance: string | null;
        tags: string[] | null;
        needs_review: boolean | null;
        confidence: number | null;
        subject_id: string | null;
      }>;
      if (!enrichments.length) return null;
      return {
        provider_event_id: row.provider_event_id,
        title: row.title,
        starts_at: row.starts_at,
        ends_at: row.ends_at,
        source: row.source,
        enrichments: enrichments.map((enrichment) => ({
          kind: enrichment.kind,
          instance: enrichment.instance,
          tags: enrichment.tags ?? [],
          needs_review: enrichment.needs_review ?? false,
          confidence: enrichment.confidence,
          subject: enrichment.subject_id ? subjectMap.get(enrichment.subject_id)?.name ?? null : null
        }))
      };
    })
    .filter(Boolean);

  const prompt = buildPrompt(range, items);
  const result = await callAIJSON(prompt, weeklySummarySchema);

  if (!result.ok) {
    return NextResponse.json(
      { error: "Respuesta AI invalida o incompleta.", needs_review: true },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, summary: { ...result.data, model: result.model } });
}
