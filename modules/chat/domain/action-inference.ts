import { chatAdminActionSchema, type ChatAdminAction } from "@/modules/chat/domain/schemas";
import { inferDateFromPhrase, normalizeSubjectAlias, normalizeTermLabel, normalizeText } from "@/modules/chat/domain/normalization";
import type { ChatRequestHistoryItem } from "@/modules/chat/domain/types";

const parseActionsFromRaw = (rawActions: unknown): ChatAdminAction[] => {
  const list = Array.isArray(rawActions) ? rawActions : [];
  const valid: ChatAdminAction[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const rawType = String(
      record.type ?? record.action ?? record.kind ?? ""
    ).trim();
    if (!rawType) continue;

    const type = rawType.toLowerCase();
    const mappedType =
      type === "create_term" || type === "crear_cuatrimestre" || type === "create_semester"
        ? "create_term"
      : type === "update_term" || type === "editar_cuatrimestre" || type === "update_semester"
          ? "update_term"
      : type === "set_current_term" || type === "set_term_current"
            ? "set_current_term"
            : type === "add_enrollment" || type === "add_course" || type === "create_enrollment"
              ? "add_enrollment"
              : type === "update_enrollment_status"
                ? "update_enrollment_status"
                : type === "remove_enrollment"
                  ? "remove_enrollment"
                  : type === "create_subject" || type === "add_subject" || type === "crear_materia"
                    ? "create_subject"
                    : type === "update_subject" || type === "editar_materia"
                      ? "update_subject"
                      : type === "remove_subject" || type === "delete_subject" || type === "eliminar_materia"
                        ? "remove_subject"
                        : type === "create_event" || type === "add_event" || type === "crear_evento"
                          ? "create_event"
                          : type === "update_event" || type === "editar_evento"
                            ? "update_event"
                            : type === "remove_event" || type === "delete_event" || type === "eliminar_evento"
                              ? "remove_event"
                              : type === "set_planner_commission" || type === "planificar_comision"
                                ? "set_planner_commission"
                                : type === "remove_planner_course" || type === "quitar_del_plan"
                                  ? "remove_planner_course"
                  : rawType;

    const randomHint =
      Boolean(record.random) ||
      Boolean(record.random_subject) ||
      Boolean(record.aleatorio) ||
      normalizeText(String(record.subject_query ?? record.subject ?? "")).includes("aleatorio");

    const normalized: Record<string, unknown> = {
      ...record,
      type: mappedType,
      term_label: normalizeTermLabel(
        String(
          record.term_label ??
            record.label ??
            record.term ??
            record.cuatrimestre ??
            ""
        )
      ),
      subject_query: String(
        record.subject_query ??
          record.subject ??
          record.subject_name ??
          record.materia ??
          record.name ??
          (randomHint ? "aleatorio" : "")
      ),
      name: record.name ?? record.subject_name ?? record.materia,
      code: record.code ?? record.codigo,
      event_query: String(record.event_query ?? record.event ?? record.title ?? record.titulo ?? ""),
      event_type: record.event_type ?? record.type_event ?? record.tipo_evento ?? record.tipo,
      commission_query: record.commission_query ?? record.commission ?? record.comision,
      effective_from: record.effective_from ?? record.desde,
      title: record.title ?? record.titulo,
      description: record.description ?? record.descripcion,
      starts_at: record.starts_at ?? record.start_at ?? record.start ?? record.inicio,
      ends_at: record.ends_at ?? record.end_at ?? record.end ?? record.fin,
      start_date:
        record.start_date ??
        record.start ??
        record.inicio ??
        record.from ??
        null,
      end_date:
        record.end_date ??
        record.end ??
        record.fin ??
        record.to ??
        null
    };

    const parsed = chatAdminActionSchema.safeParse(normalized);
    if (parsed.success) {
      valid.push(parsed.data);
    }
  }

  return valid.slice(0, 5);
};

const inferTermActionFromMessages = (
  messages: ChatRequestHistoryItem[]
): ChatAdminAction[] => {
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");
  const normalized = normalizeText(userText);
  if (!normalized) return [];

  const labelMatch = normalized.match(/\b(20\d{2})\s*[- ]?\s*(0|1|2)\b/i);
  if (!labelMatch) return [];
  const label = `${labelMatch[1]}-${labelMatch[2].toUpperCase()}`;
  const year = Number(labelMatch[1]);

  const startPhraseMatch =
    normalized.match(/(?:inicio|inicios|principio|principios)\s+de\s+([a-záéíóúñ]+(?:\s+de\s+\d{4})?)/i) ??
    normalized.match(/desde\s+([a-záéíóúñ]+(?:\s+de\s+\d{4})?)/i);
  const endPhraseMatch =
    normalized.match(/(?:fin|fines|final|finales)\s+de\s+([a-záéíóúñ]+(?:\s+de\s+\d{4})?)/i) ??
    normalized.match(/hasta\s+([a-záéíóúñ]+(?:\s+de\s+\d{4})?)/i);

  const createIntent = /\b(crea|crear|agrega|agregar|anade|añade|nuevo)\b/i.test(normalized);
  const updateIntent = /\b(actualiza|actualizar|edita|editar|modifica|modificar|cambia|cambiar)\b/i.test(normalized);
  if (!createIntent && !updateIntent) return [];

  const startDate = startPhraseMatch
    ? inferDateFromPhrase(startPhraseMatch[1], year, "start")
    : null;
  const endDate = endPhraseMatch
    ? inferDateFromPhrase(endPhraseMatch[1], year, "end")
    : null;

  const actionType: ChatAdminAction["type"] =
    createIntent ? "create_term" : "update_term";

  return [
    {
      type: actionType,
      term_label: label,
      start_date: startDate,
      end_date: endDate,
      is_current: /\bactual\b/i.test(normalized) ? true : undefined
    } satisfies ChatAdminAction
  ];
};

const inferEnrollmentActionsFromMessages = ({
  messages,
  subjects
}: {
  messages: ChatRequestHistoryItem[];
  subjects: Array<{ code: string | null; name: string }>;
}): ChatAdminAction[] => {
  const userText = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content)
    .join("\n");
  const normalized = normalizeText(userText);
  if (!normalized) return [];

  const addIntent = /\b(agrega|agregar|agregame|anade|añade|añadir|inscribe|sum[aá])\b/i.test(
    normalized
  );
  if (!addIntent) return [];

  const labelMatch = normalized.match(/\b(20\d{2})\s*[- ]?\s*(0|1|2)\b/i);
  const termLabel = labelMatch ? `${labelMatch[1]}-${labelMatch[2]}` : null;
  if (!termLabel) return [];

  const randomRequested =
    /\b(aleatorio|random|cualquiera|el que quieras|la que quieras|que tu quieras|que tú quieras)\b/i.test(
      normalized
    );

  const normalizedText = normalizeSubjectAlias(userText);
  const detectedQueries = new Set<string>();

  for (const subject of subjects) {
    if (subject.code) {
      const normalizedCode = normalizeText(subject.code);
      if (normalized.includes(normalizedCode)) {
        detectedQueries.add(subject.code);
      }
    }
    const alias = normalizeSubjectAlias(subject.name);
    if (alias.length >= 6 && normalizedText.includes(alias)) {
      detectedQueries.add(subject.name);
    }
  }

  const actions: ChatAdminAction[] = [];
  for (const query of detectedQueries) {
    actions.push({
      type: "add_enrollment",
      term_label: termLabel,
      subject_query: query,
      status: "cursando"
    });
    if (actions.length >= 4) break;
  }

  if (randomRequested) {
    actions.push({
      type: "add_enrollment",
      term_label: termLabel,
      subject_query: "aleatorio",
      status: "cursando"
    });
  }

  return actions.slice(0, 5);
};

export const buildRequestedActions = ({
  allowActions,
  modelSucceeded,
  responseActions,
  recentMessages,
  subjects
}: {
  allowActions: boolean;
  modelSucceeded: boolean;
  responseActions: unknown;
  recentMessages: ChatRequestHistoryItem[];
  subjects: Array<{ code: string | null; name: string }>;
}): ChatAdminAction[] => {
  if (!allowActions || !modelSucceeded) return [];

  const parsedActions = parseActionsFromRaw(responseActions);
  if (parsedActions.length > 0) {
    return parsedActions;
  }

  const inferredTermActions = inferTermActionFromMessages(recentMessages);
  const inferredEnrollmentActions = inferEnrollmentActionsFromMessages({
    messages: recentMessages,
    subjects
  });

  return [...inferredTermActions, ...inferredEnrollmentActions].slice(0, 5);
};

export {
  inferEnrollmentActionsFromMessages,
  inferTermActionFromMessages,
  parseActionsFromRaw
};
