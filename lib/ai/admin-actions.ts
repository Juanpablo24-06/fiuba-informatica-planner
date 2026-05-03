import type { ChatAdminAction } from "@/lib/ai/schemas";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getMonthEndDay,
  monthMap,
  normalizeTermLabel,
  normalizeText,
  pad
} from "@/lib/chat/normalization";
import {
  buildSubjectSearchIndex,
  resolveSubjectByQuery,
  type SubjectLite
} from "@/lib/chat/subject-resolution";

type AdminActionResult = {
  type: ChatAdminAction["type"];
  ok: boolean;
  summary: string;
};

type TermLite = {
  id: string;
  label: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
};

const normalizeColor = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[\da-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
};

const findTermByLabel = (terms: TermLite[], label: string) => {
  const normalized = normalizeText(normalizeTermLabel(label));
  return terms.find((term) => normalizeText(term.label) === normalized) ?? null;
};

const normalizeTermDate = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      Number.isInteger(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= getMonthEndDay(year, month)
    ) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  const dmyMatch = trimmed.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      Number.isInteger(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= getMonthEndDay(year, month)
    ) {
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  const normalized = normalizeText(trimmed).replace(/[.,]/g, " ");
  const tokens = normalized.split(/\s+/).filter(Boolean);
  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  for (const token of tokens) {
    if (!year && /^\d{4}$/.test(token)) {
      year = Number(token);
      continue;
    }
    if (!month && token in monthMap) {
      month = monthMap[token];
      continue;
    }
    if (!day && /^\d{1,2}$/.test(token)) {
      const numeric = Number(token);
      if (numeric >= 1 && numeric <= 31) {
        day = numeric;
      }
    }
  }

  if (!year || !month) return undefined;
  if (!day) {
    if (normalized.includes("final") || normalized.includes("fin")) {
      day = getMonthEndDay(year, month);
    } else if (normalized.includes("medio")) {
      day = 15;
    } else {
      day = 1;
    }
  }
  if (day > getMonthEndDay(year, month)) return undefined;
  return `${year}-${pad(month)}-${pad(day)}`;
};

const hasInvalidDateRange = (startDate: string | null, endDate: string | null) => {
  if (!startDate || !endDate) return false;
  return new Date(startDate).getTime() > new Date(endDate).getTime();
};

const toEventDate = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

const clearCurrentTerm = async (targetTermId: string) => {
  const { error } = await supabaseAdmin
    .from("terms")
    .update({ is_current: false })
    .neq("id", targetTermId);
  if (error) {
    throw new Error(error.message);
  }
};

const isRandomSubjectQuery = (query: string) => {
  const normalized = normalizeText(query);
  return (
    normalized.includes("aleatorio") ||
    normalized.includes("random") ||
    normalized.includes("cualquiera") ||
    normalized.includes("el que quieras") ||
    normalized.includes("la que quieras") ||
    normalized.includes("que tu quieras") ||
    normalized.includes("que tú quieras")
  );
};

const loadTerms = async () => {
  const { data, error } = await supabaseAdmin
    .from("terms")
    .select("id,label,start_date,end_date,is_current")
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("label", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as TermLite[];
};

const loadSubjects = async () => {
  const { data, error } = await supabaseAdmin
    .from("subjects")
    .select("id,code,name")
    .order("name", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as SubjectLite[];
};

const findEnrollment = async (termId: string, subjectId: string) => {
  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select("id")
    .eq("term_id", termId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data?.id ? String(data.id) : null;
};

const findEventByQuery = async (enrollmentId: string, query: string) => {
  const { data, error } = await supabaseAdmin
    .from("events")
    .select("id,title,type,starts_at")
    .eq("enrollment_id", enrollmentId)
    .order("starts_at", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  const normalizedQuery = normalizeText(query);
  return (
    (data ?? []).find((event) => {
      const haystack = normalizeText(
        [event.title, event.type, event.starts_at].filter(Boolean).join(" ")
      );
      return haystack.includes(normalizedQuery);
    }) ?? null
  );
};

export const executeAdminActions = async (
  actions: ChatAdminAction[]
): Promise<AdminActionResult[]> => {
  if (actions.length === 0) return [];

  const [terms, subjects] = await Promise.all([loadTerms(), loadSubjects()]);
  const subjectIndex = buildSubjectSearchIndex(subjects);
  const termEnrollmentCache = new Map<string, Set<string>>();
  const results: AdminActionResult[] = [];

  const getEnrolledSubjectIds = async (termId: string) => {
    if (termEnrollmentCache.has(termId)) {
      return termEnrollmentCache.get(termId) as Set<string>;
    }
    const { data, error } = await supabaseAdmin
      .from("enrollments")
      .select("subject_id")
      .eq("term_id", termId);
    if (error) {
      throw new Error(error.message);
    }
    const set = new Set((data ?? []).map((row) => row.subject_id as string));
    termEnrollmentCache.set(termId, set);
    return set;
  };

  for (const action of actions) {
    try {
      if (action.type === "create_term" || action.type === "update_term") {
        const normalizedLabel = normalizeTermLabel(action.term_label);
        const existing = findTermByLabel(terms, action.term_label);
        const startDate = normalizeTermDate(action.start_date);
        const endDate = normalizeTermDate(action.end_date);

        if (action.start_date !== undefined && startDate === undefined) {
          results.push({
            type: action.type,
            ok: false,
            summary: `La fecha de inicio '${action.start_date}' no tiene formato YYYY-MM-DD.`
          });
          continue;
        }
        if (action.end_date !== undefined && endDate === undefined) {
          results.push({
            type: action.type,
            ok: false,
            summary: `La fecha de fin '${action.end_date}' no tiene formato YYYY-MM-DD.`
          });
          continue;
        }

        if (action.type === "create_term" && existing) {
          results.push({
            type: action.type,
            ok: false,
            summary: `El cuatrimestre '${normalizedLabel}' ya existe. Usá update_term para modificarlo.`
          });
          continue;
        }

        if (action.type === "update_term" && !existing) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se encontró el cuatrimestre '${action.term_label}' para actualizar.`
          });
          continue;
        }

        if (action.type === "create_term") {
          const nextStart = startDate ?? null;
          const nextEnd = endDate ?? null;
          if (hasInvalidDateRange(nextStart, nextEnd)) {
            results.push({
              type: action.type,
              ok: false,
              summary: "La fecha de inicio no puede ser mayor a la fecha de fin."
            });
            continue;
          }

          const { data: inserted, error: insertError } = await supabaseAdmin
            .from("terms")
            .insert({
              label: normalizedLabel,
              start_date: nextStart,
              end_date: nextEnd,
              is_current: Boolean(action.is_current)
            })
            .select("id,label,start_date,end_date,is_current")
            .maybeSingle();

          if (insertError || !inserted) {
            results.push({
              type: action.type,
              ok: false,
              summary: `No se pudo crear '${normalizedLabel}': ${insertError?.message ?? "sin detalle"}`
            });
            continue;
          }

          if (action.is_current) {
            await clearCurrentTerm(inserted.id);
          }

          terms.push({
            id: inserted.id,
            label: inserted.label,
            start_date: inserted.start_date ?? null,
            end_date: inserted.end_date ?? null,
            is_current: inserted.is_current
          });

          results.push({
            type: action.type,
            ok: true,
            summary: `Cuatrimestre ${inserted.label} creado${action.is_current ? " y marcado como actual" : ""}.`
          });
          continue;
        }

        const term = existing as TermLite;
        const nextStart =
          startDate !== undefined ? startDate : term.start_date;
        const nextEnd =
          endDate !== undefined ? endDate : term.end_date;
        if (hasInvalidDateRange(nextStart ?? null, nextEnd ?? null)) {
          results.push({
            type: action.type,
            ok: false,
            summary: "La fecha de inicio no puede ser mayor a la fecha de fin."
          });
          continue;
        }

        const patch: Record<string, unknown> = {};
        if (action.start_date !== undefined) patch.start_date = startDate;
        if (action.end_date !== undefined) patch.end_date = endDate;
        if (action.is_current !== undefined) patch.is_current = action.is_current;

        if (Object.keys(patch).length === 0) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No llegaron cambios para '${term.label}'.`
          });
          continue;
        }

        const { error: updateError } = await supabaseAdmin
          .from("terms")
          .update(patch)
          .eq("id", term.id);
        if (updateError) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se pudo actualizar '${term.label}': ${updateError.message}`
          });
          continue;
        }

        if (action.is_current) {
          await clearCurrentTerm(term.id);
        }

        term.start_date = nextStart ?? null;
        term.end_date = nextEnd ?? null;
        if (action.is_current !== undefined) {
          for (const item of terms) {
            item.is_current = action.is_current ? item.id === term.id : false;
          }
        }

        results.push({
          type: action.type,
          ok: true,
          summary: `Cuatrimestre ${term.label} actualizado correctamente.`
        });
        continue;
      }

      if (action.type === "set_current_term") {
        const term = findTermByLabel(terms, action.term_label);
        if (!term) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se encontró el cuatrimestre '${action.term_label}'.`
          });
          continue;
        }

        try {
          await clearCurrentTerm(term.id);
        } catch (error: any) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se pudo limpiar cuatrimestre actual: ${error?.message ?? "sin detalle"}`
          });
          continue;
        }

        const { error: setError } = await supabaseAdmin
          .from("terms")
          .update({ is_current: true })
          .eq("id", term.id);
        if (setError) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se pudo marcar '${term.label}' como actual: ${setError.message}`
          });
          continue;
        }

        for (const item of terms) {
          item.is_current = item.id === term.id;
        }

        results.push({
          type: action.type,
          ok: true,
          summary: `Cuatrimestre actual actualizado a ${term.label}.`
        });
        continue;
      }

      if (action.type === "create_subject") {
        const payload = {
          code: action.code ?? null,
          name: action.name,
          credits: action.credits ?? null,
          weekly_hours: action.weekly_hours ?? null,
          total_hours: action.total_hours ?? null,
          term_suggested: action.term_suggested ?? null,
          cycle: action.cycle ?? null,
          type: action.subject_type ?? null,
          requirements: action.requirements ?? []
        };
        const { data, error } = await supabaseAdmin
          .from("subjects")
          .insert(payload)
          .select("id,code,name")
          .single();
        if (error || !data) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se pudo crear la materia '${action.name}': ${error?.message ?? "sin detalle"}`
          });
          continue;
        }
        subjects.push({ id: data.id, code: data.code, name: data.name });
        results.push({
          type: action.type,
          ok: true,
          summary: `Materia ${data.name} creada correctamente.`
        });
        continue;
      }

      if (action.type === "update_subject" || action.type === "remove_subject") {
        const subjectResult = resolveSubjectByQuery(subjectIndex, action.subject_query);
        if ("error" in subjectResult) {
          results.push({
            type: action.type,
            ok: false,
            summary: subjectResult.error ?? "No se pudo resolver la materia solicitada."
          });
          continue;
        }

        if (action.type === "remove_subject") {
          const { error } = await supabaseAdmin
            .from("subjects")
            .delete()
            .eq("id", subjectResult.subject.id);
          if (error) {
            results.push({
              type: action.type,
              ok: false,
              summary: `No se pudo eliminar ${subjectResult.subject.name}: ${error.message}`
            });
            continue;
          }
          results.push({
            type: action.type,
            ok: true,
            summary: `Materia ${subjectResult.subject.name} eliminada correctamente.`
          });
          continue;
        }

        const patch: Record<string, unknown> = {};
        if (action.code !== undefined) patch.code = action.code;
        if (action.name !== undefined) patch.name = action.name;
        if (action.credits !== undefined) patch.credits = action.credits;
        if (action.weekly_hours !== undefined) patch.weekly_hours = action.weekly_hours;
        if (action.total_hours !== undefined) patch.total_hours = action.total_hours;
        if (action.term_suggested !== undefined) patch.term_suggested = action.term_suggested;
        if (action.cycle !== undefined) patch.cycle = action.cycle;
        if (action.subject_type !== undefined) patch.type = action.subject_type;
        if (action.requirements !== undefined) patch.requirements = action.requirements;

        if (Object.keys(patch).length === 0) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No llegaron cambios para ${subjectResult.subject.name}.`
          });
          continue;
        }

        const { error } = await supabaseAdmin
          .from("subjects")
          .update(patch)
          .eq("id", subjectResult.subject.id);
        if (error) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se pudo actualizar ${subjectResult.subject.name}: ${error.message}`
          });
          continue;
        }
        results.push({
          type: action.type,
          ok: true,
          summary: `Materia ${subjectResult.subject.name} actualizada correctamente.`
        });
        continue;
      }

      const term = findTermByLabel(terms, action.term_label);
      if (!term) {
        results.push({
          type: action.type,
          ok: false,
          summary: `No se encontró el cuatrimestre '${action.term_label}'.`
        });
        continue;
      }

      let subject: SubjectLite | null = null;
      if (isRandomSubjectQuery(action.subject_query)) {
        const enrolledIds = await getEnrolledSubjectIds(term.id);
        const candidates = subjects.filter((item) => !enrolledIds.has(item.id));
        if (candidates.length === 0) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No quedan materias disponibles para agregar en ${term.label}.`
          });
          continue;
        }
        const randomIndex = Math.floor(Math.random() * candidates.length);
        subject = candidates[randomIndex];
      } else {
        const subjectResult = resolveSubjectByQuery(
          subjectIndex,
          action.subject_query
        );
        if ("error" in subjectResult) {
          results.push({
            type: action.type,
            ok: false,
            summary: subjectResult.error ?? "No se pudo resolver la materia solicitada."
          });
          continue;
        }
        subject = subjectResult.subject;
      }

      if (
        action.type === "create_event" ||
        action.type === "update_event" ||
        action.type === "remove_event"
      ) {
        const enrollmentId = await findEnrollment(term.id, subject.id);
        if (!enrollmentId) {
          results.push({
            type: action.type,
            ok: false,
            summary: `${subject.name} no está cargada en ${term.label}; agregá la cursada antes de crear eventos.`
          });
          continue;
        }

        if (action.type === "create_event") {
          const startsAt = toEventDate(action.starts_at);
          const endsAt = toEventDate(action.ends_at);
          if (!startsAt) {
            results.push({
              type: action.type,
              ok: false,
              summary: `La fecha del evento '${action.starts_at}' no es válida.`
            });
            continue;
          }

          const { error } = await supabaseAdmin.from("events").insert({
            enrollment_id: enrollmentId,
            type: action.event_type,
            title: action.title ?? null,
            description: action.description ?? null,
            starts_at: startsAt,
            ends_at: endsAt ?? null,
            status: action.status ?? null,
            grade: action.grade ?? null,
            attempt: action.attempt ?? 1
          });
          if (error) {
            results.push({
              type: action.type,
              ok: false,
              summary: `No se pudo crear el evento para ${subject.name}: ${error.message}`
            });
            continue;
          }
          results.push({
            type: action.type,
            ok: true,
            summary: `Evento ${action.title ?? action.event_type} creado para ${subject.name}.`
          });
          continue;
        }

        const event = await findEventByQuery(enrollmentId, action.event_query);
        if (!event) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No encontré un evento de ${subject.name} que coincida con '${action.event_query}'.`
          });
          continue;
        }

        if (action.type === "remove_event") {
          const { error } = await supabaseAdmin
            .from("events")
            .delete()
            .eq("id", event.id);
          if (error) {
            results.push({
              type: action.type,
              ok: false,
              summary: `No se pudo eliminar el evento: ${error.message}`
            });
            continue;
          }
          results.push({
            type: action.type,
            ok: true,
            summary: `Evento ${event.title ?? event.type} eliminado correctamente.`
          });
          continue;
        }

        const patch: Record<string, unknown> = {};
        if (action.event_type !== undefined) patch.type = action.event_type;
        if (action.title !== undefined) patch.title = action.title;
        if (action.description !== undefined) patch.description = action.description;
        if (action.starts_at !== undefined) {
          const startsAt = toEventDate(action.starts_at);
          if (!startsAt) {
            results.push({
              type: action.type,
              ok: false,
              summary: `La fecha del evento '${action.starts_at}' no es válida.`
            });
            continue;
          }
          patch.starts_at = startsAt;
        }
        if (action.ends_at !== undefined) patch.ends_at = toEventDate(action.ends_at) ?? null;
        if (action.status !== undefined) patch.status = action.status;
        if (action.grade !== undefined) patch.grade = action.grade;
        if (action.attempt !== undefined) patch.attempt = action.attempt;

        if (Object.keys(patch).length === 0) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No llegaron cambios para el evento ${event.title ?? event.type}.`
          });
          continue;
        }

        const { error } = await supabaseAdmin
          .from("events")
          .update(patch)
          .eq("id", event.id);
        if (error) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se pudo actualizar el evento: ${error.message}`
          });
          continue;
        }
        results.push({
          type: action.type,
          ok: true,
          summary: `Evento ${event.title ?? event.type} actualizado correctamente.`
        });
        continue;
      }

      if (action.type === "add_enrollment") {
        const targetStatus = action.status ?? "cursando";
        const { data: existing, error: existingError } = await supabaseAdmin
          .from("enrollments")
          .select("id,status,color")
          .eq("term_id", term.id)
          .eq("subject_id", subject.id)
          .maybeSingle();

        if (existingError) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se pudo validar si la materia ya existe: ${existingError.message}`
          });
          continue;
        }

        const color = normalizeColor(action.color);
        const notes = action.notes?.trim() || null;
        if (existing) {
          const patch: Record<string, unknown> = {
            status: targetStatus
          };
          if (color) patch.color = color;
          if (action.notes !== undefined) patch.notes = notes;

          const { error: updateError } = await supabaseAdmin
            .from("enrollments")
            .update(patch)
            .eq("id", existing.id);

          if (updateError) {
            results.push({
              type: action.type,
              ok: false,
              summary: `La materia ya existía, pero no se pudo actualizar: ${updateError.message}`
            });
            continue;
          }

          results.push({
            type: action.type,
            ok: true,
            summary: `${subject.name} ya existía en ${term.label}; se actualizó su estado a ${targetStatus}.`
          });
          continue;
        }

        const { error: insertError } = await supabaseAdmin.from("enrollments").insert({
          term_id: term.id,
          subject_id: subject.id,
          status: targetStatus,
          color,
          notes
        });

        if (insertError) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se pudo agregar ${subject.name} en ${term.label}: ${insertError.message}`
          });
          continue;
        }

        const enrolledIds = await getEnrolledSubjectIds(term.id);
        enrolledIds.add(subject.id);

        results.push({
          type: action.type,
          ok: true,
          summary: `${subject.name} agregada en ${term.label} con estado ${targetStatus}.`
        });
        continue;
      }

      if (action.type === "update_enrollment_status") {
        const { data: enrollment, error: findError } = await supabaseAdmin
          .from("enrollments")
          .select("id,status")
          .eq("term_id", term.id)
          .eq("subject_id", subject.id)
          .maybeSingle();

        if (findError) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se pudo buscar la cursada a actualizar: ${findError.message}`
          });
          continue;
        }
        if (!enrollment) {
          results.push({
            type: action.type,
            ok: false,
            summary: `${subject.name} no está cargada en ${term.label}.`
          });
          continue;
        }

        const patch: Record<string, unknown> = { status: action.status };
        if (action.notes !== undefined) {
          patch.notes = action.notes?.trim() || null;
        }

        const { error: updateError } = await supabaseAdmin
          .from("enrollments")
          .update(patch)
          .eq("id", enrollment.id);

        if (updateError) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se pudo actualizar ${subject.name}: ${updateError.message}`
          });
          continue;
        }

        results.push({
          type: action.type,
          ok: true,
          summary: `${subject.name} actualizada a estado ${action.status} en ${term.label}.`
        });
        continue;
      }

      if (action.type === "remove_enrollment") {
        const { data: enrollment, error: findError } = await supabaseAdmin
          .from("enrollments")
          .select("id")
          .eq("term_id", term.id)
          .eq("subject_id", subject.id)
          .maybeSingle();

        if (findError) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se pudo buscar la cursada a eliminar: ${findError.message}`
          });
          continue;
        }
        if (!enrollment) {
          results.push({
            type: action.type,
            ok: false,
            summary: `${subject.name} no estaba cargada en ${term.label}.`
          });
          continue;
        }

        const { error: deleteError } = await supabaseAdmin
          .from("enrollments")
          .delete()
          .eq("id", enrollment.id);

        if (deleteError) {
          results.push({
            type: action.type,
            ok: false,
            summary: `No se pudo quitar ${subject.name}: ${deleteError.message}`
          });
          continue;
        }

        const enrolledIds = await getEnrolledSubjectIds(term.id);
        enrolledIds.delete(subject.id);

        results.push({
          type: action.type,
          ok: true,
          summary: `${subject.name} eliminada de ${term.label}.`
        });
      }
    } catch (error: any) {
      results.push({
        type: action.type,
        ok: false,
        summary: error?.message ?? "Falló la ejecución de la acción."
      });
    }
  }

  return results;
};

export type { AdminActionResult };
