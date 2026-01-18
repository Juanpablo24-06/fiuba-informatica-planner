import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth";
import { getCurrentTerm, getEnrollmentsForTerm, getEventsForTerm, getSubjects } from "@/lib/queries";
import { getWeekRange } from "@/lib/date";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { callAIJSON } from "@/lib/ai/provider";
import { chatResponseSchema } from "@/lib/ai/schemas";

const payloadSchema = z.object({
  message: z.string().trim().min(1),
  threadId: z.string().uuid().optional(),
  storeHistory: z.boolean().optional()
});

const buildPrompt = (role: string, message: string, context: Record<string, unknown>) => {
  return [
    "Sos un asistente para planificar la cursada en FIUBA. Responde en espanol.",
    "Usa solo el contexto entregado, si falta informacion decilo.",
    "Responde SOLO JSON valido con este schema:",
    JSON.stringify(
      {
        answer: "string",
        reasoning: "string breve",
        follow_up_questions: ["string"],
        warnings: ["string"],
        confidence: 0.0,
        model: "gemini"
      },
      null,
      2
    ),
    `Rol del usuario: ${role}`,
    "Contexto:",
    JSON.stringify(context, null, 2),
    "Pregunta:",
    message
  ].join("\n");
};

export async function POST(request: NextRequest) {
  const session = getSessionFromRequest(request);
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
        error: "Chat AI deshabilitado.",
        instructions: "Define CEREBRAS_API_KEY (o GEMINI_API_KEY) en .env.local para habilitarlo."
      },
      { status: 501 }
    );
  }

  const now = new Date();
  const weekRange = getWeekRange(now);
  const currentTerm = await getCurrentTerm();
  const subjects = await getSubjects();
  const enrollments = currentTerm ? await getEnrollmentsForTerm(currentTerm.id) : [];
  const termEvents = currentTerm ? await getEventsForTerm(currentTerm.id) : [];

  const weekEvents = termEvents
    .filter((event) => {
      const date = new Date(event.starts_at).getTime();
      return date >= weekRange.start.getTime() && date < weekRange.end.getTime();
    })
    .slice(0, 30)
    .map((event) => ({
      title: event.title ?? event.type,
      subject: event.enrollment?.subject?.name ?? null,
      starts_at: event.starts_at,
      ends_at: event.ends_at
    }));

  const { data: rawEvents } = await supabaseAdmin
    .from("calendar_events_raw")
    .select(
      "provider_event_id,title,starts_at,ends_at,calendar_event_enrichments(kind,instance,tags,needs_review,confidence,subject_id)"
    )
    .gte("starts_at", weekRange.start.toISOString())
    .lte("starts_at", weekRange.end.toISOString());

  const enrichments = (rawEvents ?? [])
    .flatMap((row: any) =>
      (row.calendar_event_enrichments ?? []).map((enrichment: any) => ({
        provider_event_id: row.provider_event_id,
        title: row.title,
        starts_at: row.starts_at,
        kind: enrichment.kind,
        instance: enrichment.instance,
        tags: enrichment.tags ?? [],
        needs_review: enrichment.needs_review ?? false
      }))
    )
    .slice(0, 40);

  const context = {
    term: currentTerm
      ? {
          label: currentTerm.label,
          start_date: currentTerm.start_date,
          end_date: currentTerm.end_date
        }
      : null,
    subjects: subjects.slice(0, 60).map((subject) => ({
      name: subject.name,
      code: subject.code
    })),
    enrollments: enrollments.map((enrollment) => ({
      subject: enrollment.subject.name,
      status: enrollment.status
    })),
    week_events: weekEvents,
    week_enrichments: enrichments
  };

  const prompt = buildPrompt(session.role, parsed.data.message, context);
  const result = await callAIJSON(prompt, chatResponseSchema);

  if (!result.ok) {
    return NextResponse.json(
      { error: "Respuesta AI invalida o incompleta.", needs_review: true },
      { status: 502 }
    );
  }

  const persistenceEnabled = process.env.CHAT_PERSISTENCE_ENABLED === "true";
  const shouldStore = persistenceEnabled && parsed.data.storeHistory;
  let threadId = parsed.data.threadId;

  if (shouldStore) {
    if (!threadId) {
      const { data: thread, error } = await supabaseAdmin
        .from("chat_threads")
        .insert({ owner_role: session.role })
        .select("id")
        .single();
      if (!error && thread) {
        threadId = thread.id;
      }
    }

    if (threadId) {
      await supabaseAdmin.from("chat_messages").insert([
        {
          thread_id: threadId,
          role: "user",
          content: parsed.data.message,
          metadata: { role: session.role }
        },
        {
          thread_id: threadId,
          role: "assistant",
          content: result.data.answer,
          metadata: {
            follow_up_questions: result.data.follow_up_questions,
            warnings: result.data.warnings,
            confidence: result.data.confidence ?? null,
            reasoning: result.data.reasoning ?? null
          }
        }
      ]);
    }
  }

  return NextResponse.json({
    ok: true,
    response: { ...result.data, model: result.model },
    threadId,
    stored: shouldStore
  });
}
