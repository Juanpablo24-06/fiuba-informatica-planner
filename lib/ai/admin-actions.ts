import type { ChatAdminAction } from "@/lib/ai/schemas";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

type SubjectLite = {
  id: string;
  code: string | null;
  name: string;
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const normalizeColor = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return /^#[\da-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
};

const findTermByLabel = (terms: TermLite[], label: string) => {
  const normalized = normalizeText(label);
  return terms.find((term) => normalizeText(term.label) === normalized) ?? null;
};

const normalizeTermDate = (value: string | null | undefined) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : undefined;
};

const hasInvalidDateRange = (startDate: string | null, endDate: string | null) => {
  if (!startDate || !endDate) return false;
  return new Date(startDate).getTime() > new Date(endDate).getTime();
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

const findSubjectByQuery = (subjects: SubjectLite[], query: string) => {
  const normalized = normalizeText(query);
  if (!normalized) {
    return { error: "La consulta de materia llegó vacía." } as const;
  }

  const byCode = subjects.filter((subject) =>
    subject.code ? normalizeText(subject.code) === normalized : false
  );
  if (byCode.length === 1) {
    return { subject: byCode[0] } as const;
  }
  if (byCode.length > 1) {
    return { error: `La materia '${query}' coincide con varios códigos.` } as const;
  }

  const byExactName = subjects.filter(
    (subject) => normalizeText(subject.name) === normalized
  );
  if (byExactName.length === 1) {
    return { subject: byExactName[0] } as const;
  }
  if (byExactName.length > 1) {
    return { error: `La materia '${query}' coincide con varios nombres exactos.` } as const;
  }

  const byPartial = subjects.filter((subject) => {
    const name = normalizeText(subject.name);
    const code = subject.code ? normalizeText(subject.code) : "";
    return name.includes(normalized) || code.includes(normalized);
  });
  if (byPartial.length === 1) {
    return { subject: byPartial[0] } as const;
  }
  if (byPartial.length > 1) {
    const options = byPartial
      .slice(0, 4)
      .map((subject) => `${subject.code ?? "SIN-COD"} ${subject.name}`)
      .join(" / ");
    return { error: `Consulta ambigua para '${query}'. Opciones: ${options}.` } as const;
  }

  return { error: `No se encontró ninguna materia que coincida con '${query}'.` } as const;
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

export const executeAdminActions = async (
  actions: ChatAdminAction[]
): Promise<AdminActionResult[]> => {
  if (actions.length === 0) return [];

  const [terms, subjects] = await Promise.all([loadTerms(), loadSubjects()]);
  const results: AdminActionResult[] = [];

  for (const action of actions) {
    try {
      if (action.type === "create_term" || action.type === "update_term") {
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
            summary: `El cuatrimestre '${action.term_label}' ya existe. Usá update_term para modificarlo.`
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
              label: action.term_label,
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
              summary: `No se pudo crear '${action.term_label}': ${insertError?.message ?? "sin detalle"}`
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

      const term = findTermByLabel(terms, action.term_label);
      if (!term) {
        results.push({
          type: action.type,
          ok: false,
          summary: `No se encontró el cuatrimestre '${action.term_label}'.`
        });
        continue;
      }

      const subjectResult = findSubjectByQuery(subjects, action.subject_query);
      if ("error" in subjectResult) {
        results.push({
          type: action.type,
          ok: false,
          summary: subjectResult.error ?? "No se pudo resolver la materia solicitada."
        });
        continue;
      }
      const subject = subjectResult.subject;

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
