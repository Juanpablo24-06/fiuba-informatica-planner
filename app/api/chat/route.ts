import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import assistantRules from "@/config/assistant-rules.json";
import { getSessionFromRequest } from "@/lib/auth";
import { executeAdminActions } from "@/lib/ai/admin-actions";
import { reasoningLevelSchema } from "@/lib/ai/schemas";
import { getCurrentTerm, getEnrollmentsForTerm, getEventsForTerm, getSubjects, getTerms } from "@/lib/queries";
import { getWeekRange } from "@/lib/date";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { callAIJSON } from "@/lib/ai/provider";
import { chatResponseSchema } from "@/lib/ai/schemas";

const payloadSchema = z.object({
  message: z.string().trim().min(1),
  threadId: z.string().uuid().optional(),
  storeHistory: z.boolean().optional(),
  allowActions: z.boolean().optional(),
  reasoningLevel: reasoningLevelSchema.optional(),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1400)
      })
    )
    .max(14)
    .optional()
});

const reasoningHintByLevel: Record<z.infer<typeof reasoningLevelSchema>, string> = {
  bajo: "rápido y concreto, sin análisis extenso",
  medio: "equilibrado entre claridad y detalle",
  alto: "profundo, con validaciones y pasos cuidadosos"
};

const buildPrompt = ({
  role,
  message,
  context,
  recentMessages,
  reasoningLevel,
  allowActions
}: {
  role: "admin" | "viewer";
  message: string;
  context: Record<string, unknown>;
  recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
  reasoningLevel: z.infer<typeof reasoningLevelSchema>;
  allowActions: boolean;
}) => {
  const roleRules = (assistantRules.roles as Record<string, unknown>)[role] ?? {};
  return [
    "Sos un asistente para planificar la cursada en FIUBA. Responde en espanol.",
    "Usa solo el contexto entregado, si falta informacion decilo.",
    "No inventes datos de materias, fechas, estados ni cuatrimestres.",
    "Si el usuario pide crear o actualizar cuatrimestres, usa acciones `create_term` o `update_term` con fechas ISO YYYY-MM-DD.",
    `Nivel de razonamiento solicitado: ${reasoningLevel} (${reasoningHintByLevel[reasoningLevel]}).`,
    `Modo de acciones admin: ${allowActions ? "HABILITADO" : "DESHABILITADO"}.`,
    "Si el usuario pide editar datos y el modo de acciones está habilitado, devuelve acciones en el campo `actions`.",
    "Si no corresponde editar, devuelve `actions: []`.",
    "Responde SOLO JSON valido con este schema:",
    JSON.stringify(
      {
        answer: "string",
        reasoning: "string breve",
        follow_up_questions: ["string"],
        warnings: ["string"],
        actions: [
          {
            type:
              "create_term | update_term | set_current_term | add_enrollment | update_enrollment_status | remove_enrollment"
          }
        ],
        confidence: 0.0,
        model: "string"
      },
      null,
      2
    ),
    `Rol del usuario: ${role}`,
    "Reglas por rol:",
    JSON.stringify(roleRules, null, 2),
    "Reglas globales del asistente:",
    JSON.stringify(assistantRules.base_principles, null, 2),
    "Contexto:",
    JSON.stringify(context, null, 2),
    "Mensajes recientes de la conversación:",
    JSON.stringify(recentMessages, null, 2),
    "Pregunta:",
    message
  ].join("\n");
};

const getPersistedHistory = async (threadId: string | undefined) => {
  if (!threadId) return [];

  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .select("role,content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(12);

  if (error) return [];

  return (data ?? [])
    .filter((row: any) => row?.role === "user" || row?.role === "assistant")
    .map((row: any) => ({
      role: row.role as "user" | "assistant",
      content: String(row.content ?? "").slice(0, 1200)
    }))
    .filter((row) => row.content.length > 0);
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
  const reasoningLevel = parsed.data.reasoningLevel ?? "medio";
  const allowActions =
    session.role === "admin" && Boolean(parsed.data.allowActions);
  const weekRange = getWeekRange(now);
  const currentTerm = await getCurrentTerm();
  const [subjects, terms] = await Promise.all([getSubjects(), getTerms()]);
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
    now: now.toISOString(),
    role: session.role,
    term: currentTerm
      ? {
          label: currentTerm.label,
          start_date: currentTerm.start_date,
          end_date: currentTerm.end_date
        }
      : null,
    terms: terms.slice(0, 24).map((term) => ({
      label: term.label,
      start_date: term.start_date,
      end_date: term.end_date,
      is_current: term.is_current
    })),
    subjects: subjects.slice(0, 60).map((subject) => ({
      name: subject.name,
      code: subject.code
    })),
    enrollments: enrollments.map((enrollment) => ({
      subject: enrollment.subject.name,
      status: enrollment.status
    })),
    week_events: weekEvents,
    week_enrichments: enrichments,
    role_capabilities:
      (assistantRules.roles as Record<string, unknown>)[session.role] ?? null
  };

  const historyFromRequest =
    parsed.data.history?.map((message) => ({
      role: message.role,
      content: message.content.slice(0, 1200)
    })) ?? [];
  const historyFromDb = await getPersistedHistory(parsed.data.threadId);
  const recentMessages =
    historyFromRequest.length > 0 ? historyFromRequest : historyFromDb;

  const prompt = buildPrompt({
    role: session.role,
    message: parsed.data.message,
    context,
    recentMessages,
    reasoningLevel,
    allowActions
  });
  let result = await callAIJSON(prompt, chatResponseSchema);
  if (!result.ok) {
    const repairPrompt = [
      prompt,
      "",
      "Tu respuesta anterior fue inválida para el schema JSON esperado.",
      "Devuelve nuevamente SOLO JSON válido y no agregues texto fuera del objeto."
    ].join("\n");
    result = await callAIJSON(repairPrompt, chatResponseSchema);
  }

  if (!result.ok) {
    return NextResponse.json(
      {
        error: "Respuesta AI invalida o incompleta.",
        details: result.error,
        needs_review: true
      },
      { status: 502 }
    );
  }

  const requestedActions = result.data.actions ?? [];
  const actionResults =
    allowActions && requestedActions.length > 0
      ? await executeAdminActions(requestedActions)
      : [];

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
            reasoning_level: reasoningLevel,
            allow_actions: allowActions,
            follow_up_questions: result.data.follow_up_questions,
            warnings: result.data.warnings,
            actions_requested: requestedActions,
            action_results: actionResults,
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
    actionResults,
    capabilities: {
      role: session.role,
      allowActions,
      reasoningLevel,
      rulesVersion: assistantRules.version
    },
    threadId,
    stored: shouldStore
  });
}
