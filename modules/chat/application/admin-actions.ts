import type { AcademicService } from "@/modules/academic/application/service";
import type { PlannerEntryService } from "@/modules/planning/application/entries";
import type { SubjectUpdateInput, TermUpdateInput } from "@/modules/academic/application/ports";
import type { EventUpdateInput } from "@/modules/academic/domain/events";
import type { ChatAdminAction } from "../domain/schemas";
import { normalizeText, normalizeTermLabel } from "../domain/normalization";
import { normalizeColor, normalizeTermDate, findTermByLabel } from "../domain/admin-normalization";
import { buildSubjectSearchIndex, resolveSubjectByQuery } from "../domain/subject-resolution";

export type AdminActionResult = { type: ChatAdminAction["type"]; ok: boolean; summary: string };
export const createAdminActionService = (academic: AcademicService, planning: PlannerEntryService, now = () => new Date(), random = Math.random) => {
  const executeAdminActions = async (actions: ChatAdminAction[]): Promise<AdminActionResult[]> => {
    if (!actions.length) return [];
    const [terms, subjects] = await Promise.all([academic.listTerms(), academic.listSubjects()]);
    const results: AdminActionResult[] = [];
    const eventDate = (value: string | null | undefined) => {
      if (value == null) return value;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) throw new Error(`La fecha del evento '${value}' no es válida.`);
      return parsed.toISOString();
    };
    for (const action of actions) {
      try {
        let summary: string;
        if (action.type === "create_term" || action.type === "update_term" || action.type === "set_current_term") {
          const term = findTermByLabel(terms, action.term_label);
          if (action.type === "create_term" && term) throw new Error(`El cuatrimestre '${term.label}' ya existe. Usá update_term para modificarlo.`);
          if (action.type !== "create_term" && !term) throw new Error(`No se encontró el cuatrimestre '${action.term_label}'.`);
          const patch: TermUpdateInput = {};
          if (action.type === "set_current_term") patch.is_current = true;
          else {
            for (const field of ["start_date", "end_date"] as const) {
              if (action[field] !== undefined) {
                const value = normalizeTermDate(action[field]);
                if (value === undefined) throw new Error(`La fecha '${action[field]}' no tiene formato YYYY-MM-DD.`);
                patch[field] = value;
              }
            }
            if (action.is_current !== undefined) patch.is_current = action.is_current;
          }
          const saved = action.type === "create_term"
            ? await academic.createTerm({ label: normalizeTermLabel(action.term_label), ...patch })
            : await academic.updateTerm(term!.id, patch);
          if (!saved) throw new Error("No se pudo guardar el cuatrimestre.");
          if (saved.is_current) for (const item of terms) item.is_current = item.id === saved.id;
          if (term) Object.assign(term, saved); else terms.push(saved);
          summary = action.type === "create_term" ? `Cuatrimestre ${saved.label} creado${saved.is_current ? " y marcado como actual" : ""}.` : action.type === "set_current_term" ? `Cuatrimestre actual actualizado a ${saved.label}.` : `Cuatrimestre ${saved.label} actualizado correctamente.`;
        } else if (action.type === "create_subject") {
          const saved = await academic.createSubject({ code: action.code ?? null, name: action.name, credits: action.credits ?? null, weekly_hours: action.weekly_hours ?? null, total_hours: action.total_hours ?? null, term_suggested: action.term_suggested ?? null, cycle: action.cycle ?? null, type: action.subject_type ?? null, requirements: action.requirements ?? [] });
          subjects.push(saved);
          summary = `Materia ${saved.name} creada correctamente.`;
        } else {
          const subjectQuery = action.subject_query;
          const term = "term_label" in action ? findTermByLabel(terms, action.term_label) : null;
          if ("term_label" in action && !term) throw new Error(`No se encontró el cuatrimestre '${action.term_label}'.`);
          const randomQuery = /aleatorio|random|cualquiera|el que quieras|la que quieras|que tu quieras/.test(normalizeText(subjectQuery));
          const enrolled = term ? await academic.listEnrollments(term.id) : [];
          const candidates = subjects.filter((subject) => !enrolled.some((item) => item.subject_id === subject.id));
          const resolved = randomQuery && term
            ? candidates.length ? { subject: candidates[Math.floor(random() * candidates.length)] } : { error: `No quedan materias disponibles para agregar en ${term.label}.` }
            : resolveSubjectByQuery(buildSubjectSearchIndex(subjects), subjectQuery);
          if ("error" in resolved) throw new Error(resolved.error ?? "No se pudo resolver la materia solicitada.");
          const subject = resolved.subject;
          const enrollment = enrolled.find((item) => item.subject_id === subject.id);
          switch (action.type) {
            case "remove_subject": {
              const saved = await academic.deleteSubject(subject.id);
              if (!saved) throw new Error("No se encontró la materia a archivar.");
              const index = subjects.findIndex((item) => item.id === subject.id);
              if (index >= 0) subjects.splice(index, 1);
              summary = `Materia ${subject.name} archivada correctamente.`;
              break;
            }
            case "update_subject": {
              const patch: SubjectUpdateInput = {};
              for (const key of ["code", "name", "credits", "weekly_hours", "total_hours", "term_suggested", "cycle", "requirements"] as const) if (action[key] !== undefined) Object.assign(patch, { [key]: action[key] });
              if (action.subject_type !== undefined) patch.type = action.subject_type;
              const saved = await academic.updateSubject(subject.id, patch);
              const existing = subjects.find((item) => item.id === subject.id);
              if (existing) Object.assign(existing, saved);
              summary = `Materia ${saved.name} actualizada correctamente.`;
              break;
            }
            case "set_planner_commission":
            case "remove_planner_course": {
              const effectiveFrom = action.effective_from === undefined ? now().toISOString().slice(0, 10) : normalizeTermDate(action.effective_from);
              if (!effectiveFrom) throw new Error(`La fecha '${action.effective_from}' no es válida.`);
              if (action.type === "remove_planner_course") {
                await planning.closeEntries(term!.id, subject, effectiveFrom);
                summary = `${subject.name} fue quitada del plan desde ${effectiveFrom}; el historial anterior se conserva.`;
              } else {
                const commission = await planning.setCommission({ termId: term!.id, subject, commissionQuery: action.commission_query, effectiveFrom });
                summary = `${subject.name}, comisión ${commission}, quedó en el plan desde ${effectiveFrom}.`;
              }
              break;
            }
            case "add_enrollment": {
              const status = action.status ?? "cursando";
              const color = normalizeColor(action.color);
              if (enrollment) await academic.updateEnrollment(enrollment.id, { status, ...(color ? { color } : {}), ...(action.notes !== undefined ? { notes: action.notes?.trim() || null } : {}) });
              else await academic.createEnrollment({ term_id: term!.id, subject_id: subject.id, status, color, notes: action.notes?.trim() || null });
              summary = enrollment ? `${subject.name} ya existía en ${term!.label}; se actualizó su estado a ${status}.` : `${subject.name} agregada en ${term!.label} con estado ${status}.`;
              break;
            }
            case "update_enrollment_status":
            case "remove_enrollment":
              if (!enrollment) throw new Error(`${subject.name} no está cargada en ${term!.label}.`);
              if (action.type === "remove_enrollment") {
                await academic.deleteEnrollment(enrollment.id);
                summary = `${subject.name} eliminada de ${term!.label}.`;
              } else {
                await academic.updateEnrollment(enrollment.id, { status: action.status, ...(action.notes !== undefined ? { notes: action.notes?.trim() || null } : {}) });
                summary = `${subject.name} actualizada a estado ${action.status} en ${term!.label}.`;
              }
              break;
            case "create_event":
            case "update_event":
            case "remove_event": {
              if (!enrollment) throw new Error(`${subject.name} no está cargada en ${term!.label}; agregá la cursada antes de crear eventos.`);
              if (action.type === "create_event") {
                const startsAt = eventDate(action.starts_at);
                if (!startsAt) throw new Error("La fecha del evento no es válida.");
                await academic.createEvent({ enrollment_id: enrollment.id, type: action.event_type ?? "otro", title: action.title ?? null, description: action.description ?? null, starts_at: startsAt, ends_at: eventDate(action.ends_at) ?? null, status: action.status ?? null, grade: action.grade ?? null, attempt: action.attempt ?? 1 });
                summary = `Evento ${action.title ?? action.event_type ?? "otro"} creado para ${subject.name}.`;
              } else {
                const events = await academic.listEvents({ enrollmentId: enrollment.id });
                const query = normalizeText(action.event_query);
                const event = events.find((item) => normalizeText([item.title, item.type, item.starts_at].filter(Boolean).join(" ")).includes(query));
                if (!event) throw new Error(`No encontré un evento de ${subject.name} que coincida con '${action.event_query}'.`);
                if (action.type === "remove_event") {
                  await academic.deleteEvent(event.id);
                  summary = `Evento ${event.title ?? event.type} eliminado correctamente.`;
                } else {
                  const patch: EventUpdateInput = {};
                  for (const key of ["title", "description", "status", "grade", "attempt"] as const) if (action[key] !== undefined) Object.assign(patch, { [key]: action[key] });
                  if (action.event_type !== undefined) patch.type = action.event_type;
                  if (action.starts_at !== undefined) patch.starts_at = eventDate(action.starts_at)!;
                  if (action.ends_at !== undefined) patch.ends_at = eventDate(action.ends_at);
                  await academic.updateEvent(event.id, patch);
                  summary = `Evento ${event.title ?? event.type} actualizado correctamente.`;
                }
              }
              break;
            }
          }
        }
        results.push({ type: action.type, ok: true, summary });
      } catch (error) {
        results.push({ type: action.type, ok: false, summary: error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : "Falló la ejecución de la acción." });
      }
    }
    return results;
  };
  return { executeAdminActions };
};
