import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import assistantRules from "@/config/assistant-rules.json";
import { getSessionFromRequest } from "@/lib/auth";
import { executeAdminActions } from "@/lib/ai/admin-actions";
import { reasoningLevelSchema } from "@/lib/ai/schemas";
import { getEnrollmentSummaryByTermIds, getEventsForTerm, getSubjects, getTerms } from "@/lib/queries";
import { getWeekRange } from "@/lib/date";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { callAIJSON, hasAnyAIProviderConfigured, isAIProviderConfigured } from "@/lib/ai/provider";
import { chatResponseSchema } from "@/lib/ai/schemas";
import type { Term } from "@/lib/types";
import { buildRequestedActions } from "@/lib/chat/action-planning";
import { normalizeText } from "@/lib/chat/normalization";

const payloadSchema = z.object({
  message: z.string().trim().min(1),
  threadId: z.string().uuid().optional(),
  storeHistory: z.boolean().optional(),
  allowActions: z.boolean().optional(),
  reasoningLevel: reasoningLevelSchema.optional(),
  provider: z.enum(["auto", "cerebras", "nvidia", "gemini"]).optional(),
  model: z.string().trim().max(120).optional(),
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

const reasoningFormatByLevel: Record<z.infer<typeof reasoningLevelSchema>, string> = {
  bajo:
    "1-2 frases. Explica la decision principal sin detalle largo.",
  medio:
    "3-5 frases con pasos, supuestos y una mini-validacion.",
  alto:
    "6-10 frases bien estructuradas: analisis, supuestos, verificaciones y por que elegiste esa respuesta."
};

const contextProfileByReasoningLevel: Record<
  z.infer<typeof reasoningLevelSchema>,
  {
    termsWindow: number;
    termsLimit: number;
    subjectsLimit: number;
    coursesByTermLimit: number;
    weekEnrichmentsLimit: number;
  }
> = {
  bajo: {
    termsWindow: 5,
    termsLimit: 10,
    subjectsLimit: 28,
    coursesByTermLimit: 8,
    weekEnrichmentsLimit: 12
  },
  medio: {
    termsWindow: 8,
    termsLimit: 16,
    subjectsLimit: 42,
    coursesByTermLimit: 12,
    weekEnrichmentsLimit: 24
  },
  alto: {
    termsWindow: 12,
    termsLimit: 24,
    subjectsLimit: 60,
    coursesByTermLimit: 18,
    weekEnrichmentsLimit: 40
  }
};

const shouldRetryWithRepairPrompt = (error: string) =>
  error === "invalid_json" || error === "invalid_schema" || error === "empty_response";

const shouldIncludeCalendarContext = (message: string) => {
  const normalized = normalizeText(message);
  if (!normalized) return false;
  return /\b(calendario|agenda|evento|eventos|semana|hoy|manana|mañana|parcial|final|entrega)\b/.test(
    normalized
  );
};

const buildFallbackDiagnostics = (error: string) => {
  const normalized = error.toLowerCase();
  if (normalized.includes("timeout")) {
    return {
      answer:
        "El proveedor tardó demasiado en responder. Podés reintentar o usar el modelo predeterminado para más estabilidad.",
      reasoning:
        "La solicitud venció por tiempo de espera. Se devolvió una respuesta de contingencia para no romper el flujo.",
      warningLabel: "Tiempo de espera del proveedor"
    };
  }
  if (
    normalized.includes("_404") ||
    normalized.includes("does not exist") ||
    normalized.includes("no access")
  ) {
    return {
      answer:
        "El modelo seleccionado no está disponible para esta cuenta/proveedor. Probé recuperación para mantener el chat activo.",
      reasoning:
        "Se detectó modelo no disponible o sin permisos y se activó recuperación segura.",
      warningLabel: "Modelo no disponible en proveedor"
    };
  }
  if (normalized.includes("network")) {
    return {
      answer:
        "Hubo un problema de red al contactar al proveedor del modelo. El chat quedó activo para que puedas reintentar.",
      reasoning:
        "Falla de conectividad durante la llamada al proveedor; se activó respuesta de recuperación.",
      warningLabel: "Problema de red con proveedor"
    };
  }
  if (shouldRetryWithRepairPrompt(error)) {
    return {
      answer:
        "La salida del modelo no cumplió el formato esperado y no pude usarla directamente. El chat sigue activo para reintentar.",
      reasoning:
        "El proveedor devolvió contenido incompatible con el esquema JSON requerido.",
      warningLabel: "Salida incompatible del modelo"
    };
  }
  return {
    answer:
      "No pude obtener una respuesta válida del proveedor en este intento, pero el chat sigue activo para reintentar.",
    reasoning:
      "Se activó modo de recuperación por error del proveedor o formato no compatible.",
    warningLabel: "Error del proveedor"
  };
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
    `Formato exigido para el campo reasoning en este nivel: ${reasoningFormatByLevel[reasoningLevel]}`,
    `Modo de acciones admin: ${allowActions ? "HABILITADO" : "DESHABILITADO"}.`,
    "Si el usuario pide editar datos y el modo de acciones está habilitado, devuelve acciones en el campo `actions`.",
    "Si no corresponde editar, devuelve `actions: []`.",
    "Responde SOLO JSON valido con este schema:",
    JSON.stringify({
      answer: "string",
      reasoning: "string con profundidad segun nivel",
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
    }),
    `Rol del usuario: ${role}`,
    "Reglas por rol:",
    JSON.stringify(roleRules),
    "Reglas globales del asistente:",
    JSON.stringify(assistantRules.base_principles),
    "Contexto:",
    JSON.stringify(context),
    "Mensajes recientes de la conversación:",
    JSON.stringify(recentMessages),
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

const resolveCurrentTerm = (terms: Term[]): Term | null => {
  const current = terms.find((term) => term.is_current);
  if (current) return current;
  return terms[0] ?? null;
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

  if (!hasAnyAIProviderConfigured()) {
    return NextResponse.json(
      {
        error: "Chat AI deshabilitado.",
        instructions:
          "Definí CEREBRAS_API_KEY, NVIDIA_API_KEY o GEMINI_API_KEY en el entorno activo (.env.local en local o Variables de Entorno en Vercel) y redeploy/reiniciá la app."
      },
      { status: 501 }
    );
  }

  const selectedProvider = parsed.data.provider ?? "auto";
  const selectedModel = parsed.data.model?.trim() || undefined;
  const providerConfigured = isAIProviderConfigured(selectedProvider);
  const effectiveProvider =
    selectedProvider !== "auto" && !providerConfigured ? "auto" : selectedProvider;
  const providerFallbackWarning =
    selectedProvider !== "auto" && !providerConfigured
      ? `El proveedor seleccionado (${selectedProvider}) no está configurado en este entorno. Se usó Auto para continuar.`
      : null;

  const now = new Date();
  const reasoningLevel = parsed.data.reasoningLevel ?? "medio";
  const contextProfile = contextProfileByReasoningLevel[reasoningLevel];
  const includeCalendarContext = shouldIncludeCalendarContext(parsed.data.message);
  const allowActions =
    session.role === "admin" && Boolean(parsed.data.allowActions);
  const weekRange = getWeekRange(now);
  const historyFromRequest =
    parsed.data.history?.map((message) => ({
      role: message.role,
      content: message.content.slice(0, 1200)
    })) ?? [];

  const historyFromDbPromise =
    historyFromRequest.length > 0
      ? Promise.resolve([] as Array<{ role: "user" | "assistant"; content: string }>)
      : getPersistedHistory(parsed.data.threadId);
  const rawEventsPromise = includeCalendarContext
    ? supabaseAdmin
        .from("calendar_events_raw")
        .select(
          "provider_event_id,title,starts_at,ends_at,calendar_event_enrichments(kind,instance,tags,needs_review,confidence,subject_id)"
        )
        .gte("starts_at", weekRange.start.toISOString())
        .lte("starts_at", weekRange.end.toISOString())
    : Promise.resolve({ data: [] as any[] });

  const [subjects, terms, historyFromDb, rawEventsResult] = await Promise.all([
    getSubjects(),
    getTerms(),
    historyFromDbPromise,
    rawEventsPromise
  ]);

  const currentTerm = resolveCurrentTerm(terms);
  const contextTerms = terms.slice(0, contextProfile.termsWindow);
  const termIdsForSummary = Array.from(new Set(contextTerms.map((term) => term.id)));
  if (currentTerm && !termIdsForSummary.includes(currentTerm.id)) {
    termIdsForSummary.unshift(currentTerm.id);
  }

  const [enrollmentsByTermMap, termEvents] = await Promise.all([
    getEnrollmentSummaryByTermIds(termIdsForSummary),
    includeCalendarContext && currentTerm
      ? getEventsForTerm(currentTerm.id)
      : Promise.resolve([])
  ]);

  const currentTermEnrollments = currentTerm
    ? enrollmentsByTermMap.get(currentTerm.id) ?? []
    : [];
  const enrollmentsByTerm = contextTerms.map((term) => {
    const termEnrollments = enrollmentsByTermMap.get(term.id) ?? [];
    return {
      term_label: term.label,
      total: termEnrollments.length,
      courses: termEnrollments.slice(0, contextProfile.coursesByTermLimit).map((enrollment) => ({
        subject: enrollment.subject.name,
        code: enrollment.subject.code,
        status: enrollment.status
      }))
    };
  });

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

  const rawEvents = rawEventsResult.data;

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
    .slice(0, contextProfile.weekEnrichmentsLimit);

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
    terms: terms.slice(0, contextProfile.termsLimit).map((term) => ({
      label: term.label,
      start_date: term.start_date,
      end_date: term.end_date,
      is_current: term.is_current
    })),
    subjects: subjects.slice(0, contextProfile.subjectsLimit).map((subject) => ({
      name: subject.name,
      code: subject.code
    })),
    enrollments: currentTermEnrollments.map((enrollment) => ({
      subject: enrollment.subject.name,
      status: enrollment.status
    })),
    enrollments_by_term: enrollmentsByTerm,
    week_events: includeCalendarContext ? weekEvents : [],
    week_enrichments: includeCalendarContext ? enrichments : [],
    role_capabilities:
      (assistantRules.roles as Record<string, unknown>)[session.role] ?? null
  };

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
  let result = await callAIJSON(prompt, chatResponseSchema, {
    provider: effectiveProvider,
    model: selectedModel
  });
  if (!result.ok && shouldRetryWithRepairPrompt(result.error)) {
    const repairPrompt = [
      prompt,
      "",
      "Tu respuesta anterior fue inválida para el schema JSON esperado.",
      "Devuelve nuevamente SOLO JSON válido y no agregues texto fuera del objeto."
    ].join("\n");
    result = await callAIJSON(repairPrompt, chatResponseSchema, {
      provider: effectiveProvider,
      model: selectedModel
    });
  }

  let responseBody:
    | {
        answer: string;
        reasoning: string | null | undefined;
        follow_up_questions: string[];
        warnings: string[];
        actions: unknown;
        confidence: number | null | undefined;
      provider: string | null | undefined;
      model: string | null | undefined;
    }
    | null = null;
  let requestedActions: ReturnType<typeof buildRequestedActions> = [];
  let actionResults: Awaited<ReturnType<typeof executeAdminActions>> = [];
  let usedFallback = false;

  if (result.ok) {
    responseBody = {
      answer: result.data.answer,
      reasoning: result.data.reasoning,
      follow_up_questions: result.data.follow_up_questions,
      warnings: providerFallbackWarning
        ? [providerFallbackWarning, ...result.data.warnings]
        : result.data.warnings,
      actions: result.data.actions ?? [],
      confidence: result.data.confidence,
      provider: result.provider,
      model: result.model
    };
    requestedActions = buildRequestedActions({
      allowActions,
      modelSucceeded: true,
      responseActions: responseBody.actions,
      recentMessages,
      subjects: subjects.map((subject) => ({
        code: subject.code,
        name: subject.name
      }))
    });
    actionResults = requestedActions.length > 0 ? await executeAdminActions(requestedActions) : [];
  } else {
    usedFallback = true;
    const diagnostics = buildFallbackDiagnostics(result.error);

    responseBody = {
      answer: diagnostics.answer,
      reasoning: diagnostics.reasoning,
      follow_up_questions: [
        "Si querés, te puedo reintentar automáticamente con el modelo predeterminado del proveedor.",
        "También podés pasarme el cuatrimestre exacto (ej: 2026-2) con fechas YYYY-MM-DD para aplicarlo directo."
      ],
      warnings: [
        `${diagnostics.warningLabel}: ${result.error}`
      ],
      actions: [],
      confidence: null,
      provider: null,
      model: "fallback-recovery"
    };
  }

  const persistenceEnabled = process.env.CHAT_PERSISTENCE_ENABLED === "true";
  const shouldStore = persistenceEnabled && parsed.data.storeHistory;
  let threadId = parsed.data.threadId;
  let stored = false;

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
      const { error: messageError } = await supabaseAdmin.from("chat_messages").insert([
        {
          thread_id: threadId,
          role: "user",
          content: parsed.data.message,
          metadata: { role: session.role }
        },
        {
          thread_id: threadId,
          role: "assistant",
          content: responseBody.answer,
          metadata: {
            reasoning_level: reasoningLevel,
            allow_actions: allowActions,
            follow_up_questions: responseBody.follow_up_questions,
            warnings: responseBody.warnings,
            actions_requested: requestedActions,
            action_results: actionResults,
            confidence: responseBody.confidence ?? null,
            reasoning: responseBody.reasoning ?? null
          }
        }
      ]);
      stored = !messageError;
    }
  }

  return NextResponse.json({
    ok: true,
    response: {
      answer: responseBody.answer,
      reasoning: responseBody.reasoning ?? null,
      follow_up_questions: responseBody.follow_up_questions,
      warnings: responseBody.warnings,
      actions: requestedActions,
      confidence: responseBody.confidence ?? null,
      model: responseBody.model ?? null,
      provider: responseBody.provider ?? null
    },
    actionResults,
    usedFallback,
    capabilities: {
      role: session.role,
      allowActions,
      reasoningLevel,
      rulesVersion: assistantRules.version
    },
    threadId,
    stored
  });
}
