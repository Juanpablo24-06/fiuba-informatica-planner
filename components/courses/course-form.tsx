"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Plus, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  CourseCatalogItem,
  CourseCustomField,
  CourseSubject,
  CourseUsefulLink
} from "@/lib/courses/catalog";
import { cn } from "@/lib/utils";

export type CourseFormLink = CourseUsefulLink;
export type CourseFormField = CourseCustomField;

export type CourseFormValues = {
  code: string;
  name: string;
  description: string;
  term_suggested: string;
  term_order: string;
  cycle: string;
  type: string;
  credits: string;
  weekly_hours: string;
  total_hours: string;
  requirements: string;
  evaluation_info: string;
  notes: string;
  useful_links: CourseFormLink[];
  custom_fields: CourseFormField[];
  prerequisiteIds: string[];
  unlockIds: string[];
};

export type RelationDirection = "prerequisite" | "unlock";

export type CourseRelationCandidate = {
  course: CourseCatalogItem;
  outOfOrder: boolean;
};

type RelationCandidatesOptions = {
  editingSubjectId?: string | null;
  subjectTerm: number | null | undefined;
  direction: RelationDirection;
  selectedIds?: string[];
};

export const SUBJECT_TYPES = [
  { value: "", label: "Sin tipo" },
  { value: "obligatoria", label: "Obligatoria" },
  { value: "electiva", label: "Electiva" },
  { value: "cbc", label: "CBC" },
  { value: "optativa", label: "Optativa" },
  { value: "otro", label: "Otro" }
] as const;

const NUMERIC_FIELDS = ["term_suggested", "term_order", "credits", "weekly_hours", "total_hours"] as const;

const nonEmpty = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const editorValuesFor = (course: CourseCatalogItem): CourseFormValues => ({
  code: nonEmpty(course.subject.code),
  name: course.subject.name,
  description: nonEmpty(course.subject.description),
  term_suggested: course.subject.term_suggested?.toString() ?? "",
  term_order: course.subject.term_order?.toString() ?? "",
  cycle: nonEmpty(course.subject.cycle),
  type: nonEmpty(course.subject.type),
  credits: course.subject.credits?.toString() ?? "",
  weekly_hours: course.subject.weekly_hours?.toString() ?? "",
  total_hours: course.subject.total_hours?.toString() ?? "",
  requirements: (course.subject.requirements ?? []).join("\n"),
  evaluation_info: nonEmpty(course.subject.evaluation_info),
  notes: nonEmpty(course.subject.notes),
  useful_links: (course.subject.useful_links ?? []).map((link) => ({
    label: nonEmpty(link.label),
    url: nonEmpty(link.url)
  })),
  custom_fields: (course.subject.custom_fields ?? []).map((field) => ({
    label: nonEmpty(field.label),
    value: nonEmpty(field.value)
  })),
  prerequisiteIds: course.prerequisites.map((relation) => relation.id),
  unlockIds: course.unlocks.map((relation) => relation.id)
});

export const emptyCourseForm = (): CourseFormValues => ({
  code: "",
  name: "",
  description: "",
  term_suggested: "",
  term_order: "",
  cycle: "",
  type: "",
  credits: "",
  weekly_hours: "",
  total_hours: "",
  requirements: "",
  evaluation_info: "",
  notes: "",
  useful_links: [],
  custom_fields: [],
  prerequisiteIds: [],
  unlockIds: []
});

export const parseNullableNumber = (value: string) => {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Filter relation choices by the subject's suggested period while retaining
 * selected edges that became invalid after a period edit. Those edges remain
 * actionable so an admin can remove them explicitly instead of losing data.
 */
export const relationCandidates = (
  courses: CourseCatalogItem[],
  { editingSubjectId = null, subjectTerm, direction, selectedIds = [] }: RelationCandidatesOptions
): CourseRelationCandidate[] => {
  const selected = new Set(selectedIds);
  const hasSubjectTerm = typeof subjectTerm === "number" && Number.isFinite(subjectTerm);

  return courses
    .filter((course) => course.subject.id !== editingSubjectId)
    .map((course) => {
      const candidateTerm = course.subject.term_suggested;
      const followsOrder = !hasSubjectTerm
        || (typeof candidateTerm === "number" && (direction === "prerequisite"
          ? candidateTerm < (subjectTerm as number)
          : candidateTerm > (subjectTerm as number)));
      return { course, outOfOrder: hasSubjectTerm && !followsOrder };
    })
    .filter(({ course, outOfOrder }) => !outOfOrder || selected.has(course.subject.id))
    .sort((first, second) =>
      (first.course.subject.term_suggested ?? 99) - (second.course.subject.term_suggested ?? 99) ||
      (first.course.subject.term_order ?? 999) - (second.course.subject.term_order ?? 999) ||
      first.course.subject.name.localeCompare(second.course.subject.name, "es")
    );
};

export const subjectPayloadFor = (values: CourseFormValues) => ({
  code: nonEmpty(values.code) || null,
  name: values.name.trim(),
  description: nonEmpty(values.description) || null,
  term_suggested: parseNullableNumber(values.term_suggested),
  term_order: parseNullableNumber(values.term_order),
  cycle: nonEmpty(values.cycle) || null,
  type: nonEmpty(values.type) || null,
  credits: parseNullableNumber(values.credits),
  weekly_hours: parseNullableNumber(values.weekly_hours),
  total_hours: parseNullableNumber(values.total_hours),
  requirements: values.requirements
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean),
  evaluation_info: nonEmpty(values.evaluation_info) || null,
  notes: nonEmpty(values.notes) || null,
  useful_links: values.useful_links
    .map((link) => ({ label: nonEmpty(link.label), url: nonEmpty(link.url) })),
  custom_fields: values.custom_fields
    .map((field) => ({ label: nonEmpty(field.label), value: nonEmpty(field.value) }))
});

type CourseFormErrorKey = "name" | "term_suggested" | "term_order" | "credits" | "weekly_hours" | "total_hours";
export type CourseFormErrors = Partial<Record<CourseFormErrorKey, string>> & {
  useful_links?: Array<string | undefined>;
  custom_fields?: Array<string | undefined>;
};

export const validateCourseForm = (values: CourseFormValues) => {
  const errors: CourseFormErrors = {};
  if (!values.name.trim()) errors.name = "El nombre es obligatorio.";
  for (const field of NUMERIC_FIELDS) {
    const value = values[field].trim();
    if (!value) continue;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0 || (field === "term_suggested" && parsed < 1)) {
      errors[field] = field === "term_suggested" ? "Usá un entero mayor que cero." : "Usá un entero igual o mayor que cero.";
    }
  }

  const linkErrors = values.useful_links.map((link) => {
    const label = nonEmpty(link.label);
    const url = nonEmpty(link.url);
    if (!label && !url) return "Completá la etiqueta y URL, o quitá esta fila.";
    if (!label) return "Agregá una etiqueta para este link.";
    if (!url) return "Agregá una URL para este link.";
    try {
      const parsed = new URL(url);
      if (!["http:", "https:"].includes(parsed.protocol)) return "Usá una URL http(s) válida.";
    } catch {
      return "Usá una URL http(s) válida.";
    }
    return undefined;
  });
  if (linkErrors.some(Boolean)) errors.useful_links = linkErrors;

  const customFieldErrors = values.custom_fields.map((field) => {
    const label = nonEmpty(field.label);
    const value = nonEmpty(field.value);
    if (!label && !value) return "Completá etiqueta y valor, o quitá esta fila.";
    if (!label) return "Agregá una etiqueta para este campo.";
    if (!value) return "Agregá un valor para este campo.";
    return undefined;
  });
  if (customFieldErrors.some(Boolean)) errors.custom_fields = customFieldErrors;
  return errors;
};

type CourseFormProps = {
  values: CourseFormValues;
  setValues: Dispatch<SetStateAction<CourseFormValues>>;
  courses: CourseCatalogItem[];
  editingSubjectId?: string | null;
  saving?: boolean;
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  error?: string | null;
};

export function CourseForm({
  values,
  setValues,
  courses,
  editingSubjectId = null,
  saving = false,
  submitLabel,
  onSubmit,
  onCancel,
  error
}: CourseFormProps) {
  const [relationQuery, setRelationQuery] = useState("");
  const formErrors = validateCourseForm(values);
  const canSubmit = Object.keys(formErrors).length === 0 && !saving;
  const subjectTerm = parseNullableNumber(values.term_suggested);
  const prerequisiteCandidates = useMemo(() => relationCandidates(courses, {
    editingSubjectId,
    subjectTerm,
    direction: "prerequisite",
    selectedIds: values.prerequisiteIds
  }), [courses, editingSubjectId, subjectTerm, values.prerequisiteIds]);
  const unlockCandidates = useMemo(() => relationCandidates(courses, {
    editingSubjectId,
    subjectTerm,
    direction: "unlock",
    selectedIds: values.unlockIds
  }), [courses, editingSubjectId, subjectTerm, values.unlockIds]);
  const selectableCourses = useMemo(() => {
    const query = relationQuery.trim().toLocaleLowerCase("es");
    const matchesQuery = ({ course }: CourseRelationCandidate) => {
        if (!query) return true;
        return [course.subject.code, course.subject.name, course.subject.cycle, course.subject.type]
          .filter(Boolean)
          .some((value) => value!.toLocaleLowerCase("es").includes(query));
      };
    return {
      prerequisite: prerequisiteCandidates.filter(matchesQuery),
      unlock: unlockCandidates.filter(matchesQuery)
    };
  }, [prerequisiteCandidates, unlockCandidates, relationQuery]);

  const setField = <K extends keyof CourseFormValues>(field: K, value: CourseFormValues[K]) => {
    setValues((previous) => ({ ...previous, [field]: value }));
  };

  const typeOptions = values.type && !SUBJECT_TYPES.some((type) => type.value === values.type)
    ? [...SUBJECT_TYPES, { value: values.type, label: values.type }]
    : SUBJECT_TYPES;

  const toggleRelation = (field: "prerequisiteIds" | "unlockIds", id: string) => {
    setValues((previous) => {
      const current = previous[field];
      return {
        ...previous,
        [field]: current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      };
    });
  };

  const setLink = (index: number, key: keyof CourseFormLink, value: string) => {
    setValues((previous) => ({
      ...previous,
      useful_links: previous.useful_links.map((link, linkIndex) =>
        linkIndex === index ? { ...link, [key]: value } : link
      )
    }));
  };

  const setCustomField = (index: number, key: keyof CourseFormField, value: string) => {
    setValues((previous) => ({
      ...previous,
      custom_fields: previous.custom_fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, [key]: value } : field
      )
    }));
  };

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onSubmit();
      }}
      noValidate
    >
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-text">Información básica</legend>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(9rem,0.6fr)]">
          <Field label="Nombre" required error={values.name.trim() ? formErrors.name : undefined}>
            <Input
              autoFocus
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              aria-invalid={Boolean(values.name.trim() && formErrors.name)}
              placeholder="Nombre de la materia"
            />
          </Field>
          <Field label="Código">
            <Input value={values.code} onChange={(event) => setField("code", event.target.value)} placeholder="Ej. 75.01" />
          </Field>
        </div>
        <Field label="Descripción">
          <Textarea value={values.description} onChange={(event) => setField("description", event.target.value)} placeholder="Qué aborda esta materia y qué conviene saber antes de cursarla." className="min-h-20" />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 border-t border-border/55 pt-5">
        <legend className="text-sm font-semibold text-text">Ubicación en el plan</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Período sugerido" hint="La columna que usará el Mapa." error={formErrors.term_suggested}>
            <Input type="number" min={1} step={1} value={values.term_suggested} onChange={(event) => setField("term_suggested", event.target.value)} placeholder="Ej. 3" aria-invalid={Boolean(formErrors.term_suggested)} />
          </Field>
          <Field label="Orden dentro del período" hint="Opcional; menor número aparece primero." error={formErrors.term_order}>
            <Input type="number" min={0} value={values.term_order} onChange={(event) => setField("term_order", event.target.value)} placeholder="Ej. 2" aria-invalid={Boolean(formErrors.term_order)} />
          </Field>
          <Field label="Ciclo o etapa">
            <Input value={values.cycle} onChange={(event) => setField("cycle", event.target.value)} placeholder="CBC, ciclo inicial, segundo..." />
          </Field>
          <Field label="Tipo de materia">
            <Select value={values.type} onChange={(event) => setField("type", event.target.value)} aria-label="Tipo de materia">
              {typeOptions.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </Select>
          </Field>
        </div>
      </fieldset>

      <details className="group border-t border-border/55 pt-5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-text marker:hidden">Carga académica <span className="ml-1 text-xs font-normal text-muted group-open:hidden">· Opcional</span></summary>
        <div className="space-y-4 pt-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Créditos" error={formErrors.credits}><Input type="number" min={0} step={1} value={values.credits} onChange={(event) => setField("credits", event.target.value)} placeholder="Opcional" aria-invalid={Boolean(formErrors.credits)} /></Field>
          <Field label="Horas semanales" error={formErrors.weekly_hours}><Input type="number" min={0} step={1} value={values.weekly_hours} onChange={(event) => setField("weekly_hours", event.target.value)} placeholder="Opcional" aria-invalid={Boolean(formErrors.weekly_hours)} /></Field>
          <Field label="Horas totales" error={formErrors.total_hours}><Input type="number" min={0} step={1} value={values.total_hours} onChange={(event) => setField("total_hours", event.target.value)} placeholder="Opcional" aria-invalid={Boolean(formErrors.total_hours)} /></Field>
        </div>
        </div>
      </details>

      <details className="group border-t border-border/55 pt-5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-text marker:hidden">Relaciones académicas <span className="ml-1 text-xs font-normal text-muted group-open:hidden">· Opcional</span></summary>
        <div className="space-y-4 pt-4">
        <p className="text-xs leading-5 text-muted">
          Requiere y Habilita son dos vistas de la misma relación. Una materia no puede relacionarse consigo misma.
          {subjectTerm === null ? " Sin período sugerido: se muestran opciones sin aplicar orden temporal." : " Las opciones nuevas respetan el orden de períodos."}
        </p>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={relationQuery} onChange={(event) => setRelationQuery(event.target.value)} placeholder="Buscar materia por nombre, código o ciclo" className="pl-9" aria-label="Buscar materias para relacionar" />
        </label>
        <div className="grid gap-5 lg:grid-cols-2">
          <RelationPicker title="Requiere" description={subjectTerm === null ? "Materias previas, sin período para comparar." : "Solo materias de períodos anteriores."} candidates={selectableCourses.prerequisite} selectedIds={values.prerequisiteIds} onToggle={(id) => toggleRelation("prerequisiteIds", id)} emptyLabel="No hay materias previas que coincidan." />
          <RelationPicker title="Habilita" description={subjectTerm === null ? "Materias posteriores, sin período para comparar." : "Solo materias de períodos posteriores."} candidates={selectableCourses.unlock} selectedIds={values.unlockIds} onToggle={(id) => toggleRelation("unlockIds", id)} emptyLabel="No hay materias posteriores que coincidan." />
        </div>
        </div>
      </details>

      <details className="group border-t border-border/55 pt-5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-text marker:hidden">Información adicional {formErrors.useful_links || formErrors.custom_fields ? <span className="ml-1 text-xs font-normal text-danger">· Revisá los campos</span> : <span className="ml-1 text-xs font-normal text-muted group-open:hidden">· Opcional</span>}</summary>
        <div className="space-y-4 pt-4">
        <Field label="Régimen o información general de evaluación">
          <Textarea value={values.evaluation_info} onChange={(event) => setField("evaluation_info", event.target.value)} placeholder="Régimen general, modalidad o condiciones de aprobación." className="min-h-20" />
        </Field>
        <Field label="Requisitos adicionales escritos" hint="Uno por línea; usá esto para condiciones que no son correlativas.">
          <Textarea value={values.requirements} onChange={(event) => setField("requirements", event.target.value)} placeholder="CBC aprobado\nRegularidad de laboratorio" className="min-h-20" />
        </Field>
        <Field label="Notas generales">
          <Textarea value={values.notes} onChange={(event) => setField("notes", event.target.value)} placeholder="Observaciones del plan o de la materia." className="min-h-20" />
        </Field>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold text-text">Links útiles</p><p className="text-[11px] text-muted">Página oficial, campus u otra referencia.</p></div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setValues((previous) => ({ ...previous, useful_links: [...previous.useful_links, { label: "", url: "" }] }))}><Plus className="mr-1.5 h-3.5 w-3.5" />Añadir link</Button>
          </div>
          {values.useful_links.length > 0 ? values.useful_links.map((link, index) => (
            <div key={`link-${index}`} className="grid gap-2 sm:grid-cols-[minmax(8rem,0.55fr)_minmax(0,1fr)_auto]">
              <Input value={link.label} onChange={(event) => setLink(index, "label", event.target.value)} placeholder="Etiqueta" aria-label={`Etiqueta del link ${index + 1}`} />
              <Input type="url" value={link.url} onChange={(event) => setLink(index, "url", event.target.value)} placeholder="https://..." aria-label={`URL del link ${index + 1}`} />
              <Button type="button" variant="ghost" size="sm" onClick={() => setValues((previous) => ({ ...previous, useful_links: previous.useful_links.filter((_, linkIndex) => linkIndex !== index) }))} aria-label={`Quitar link ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
              {formErrors.useful_links?.[index] ? <p className="text-[11px] text-danger sm:col-span-2" role="alert">{formErrors.useful_links[index]}</p> : null}
            </div>
          )) : <p className="text-xs text-muted">Todavía no hay links agregados.</p>}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold text-text">Campos personalizados</p><p className="text-[11px] text-muted">Pares simples de etiqueta y valor.</p></div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setValues((previous) => ({ ...previous, custom_fields: [...previous.custom_fields, { label: "", value: "" }] }))}><Plus className="mr-1.5 h-3.5 w-3.5" />Añadir campo</Button>
          </div>
          {values.custom_fields.length > 0 ? values.custom_fields.map((field, index) => (
            <div key={`field-${index}`} className="grid gap-2 sm:grid-cols-[minmax(8rem,0.55fr)_minmax(0,1fr)_auto]">
              <Input value={field.label} onChange={(event) => setCustomField(index, "label", event.target.value)} placeholder="Etiqueta" aria-label={`Etiqueta del campo ${index + 1}`} />
              <Input value={field.value} onChange={(event) => setCustomField(index, "value", event.target.value)} placeholder="Valor" aria-label={`Valor del campo ${index + 1}`} />
              <Button type="button" variant="ghost" size="sm" onClick={() => setValues((previous) => ({ ...previous, custom_fields: previous.custom_fields.filter((_, fieldIndex) => fieldIndex !== index) }))} aria-label={`Quitar campo ${index + 1}`}><Trash2 className="h-4 w-4" /></Button>
              {formErrors.custom_fields?.[index] ? <p className="text-[11px] text-danger sm:col-span-2" role="alert">{formErrors.custom_fields[index]}</p> : null}
            </div>
          )) : <p className="text-xs text-muted">Todavía no hay campos personalizados.</p>}
        </div>
        </div>
      </details>

      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/55 pt-5">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button type="submit" disabled={!canSubmit}>{saving ? "Guardando…" : submitLabel}</Button>
      </div>
    </form>
  );
}

function RelationPicker({
  title,
  description,
  candidates,
  selectedIds,
  onToggle,
  emptyLabel
}: {
  title: string;
  description: string;
  candidates: CourseRelationCandidate[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  emptyLabel: string;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-3"><div><p className="text-xs font-semibold text-text">{title}</p><p className="text-[11px] text-muted">{description}</p></div><span className="text-[10px] tabular-nums text-muted">{selectedIds.length}</span></div>
      <div className="max-h-56 overflow-y-auto border-y border-border/45 py-1">
        {candidates.length > 0 ? candidates.map(({ course, outOfOrder }) => {
          const selected = selectedIds.includes(course.subject.id);
          return (
            <label key={`${title}-${course.subject.id}`} className={cn("flex cursor-pointer items-start gap-3 border-b border-border/30 px-2 py-2.5 last:border-b-0", selected ? "bg-accent/8" : "hover:bg-surface-2/60")}>
              <input type="checkbox" checked={selected} onChange={() => onToggle(course.subject.id)} className="mt-0.5 h-4 w-4 rounded border-border bg-surface-2 accent-accent" />
              <span className="min-w-0"><span className="block truncate text-xs font-medium text-text">{course.subject.name}</span><span className="mt-0.5 block text-[10px] text-muted">{course.subject.code ?? "Sin código"}{course.subject.term_suggested ? ` · P${course.subject.term_suggested}` : " · Sin período"}{outOfOrder ? <span className="ml-1 text-amber-300">· Fuera del orden sugerido</span> : null}</span></span>
            </label>
          );
        }) : <p className="px-2 py-4 text-xs text-muted">{emptyLabel}</p>}
      </div>
    </div>
  );
}

function Field({ label, hint, required, error, children }: { label: string; hint?: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <label className="block min-w-0"><span className="mb-1.5 flex items-baseline gap-1.5 text-xs font-semibold text-muted"><span>{label}{required ? <span className="ml-1 text-accent" aria-hidden="true">*</span> : null}</span>{hint ? <span className="font-normal text-[10px] text-muted/75">{hint}</span> : null}</span>{children}{error ? <span className="mt-1 block text-[11px] text-danger" role="alert">{error}</span> : null}</label>;
}

export function CourseFormHeading({ mode, subject }: { mode: "create" | "edit"; subject?: CourseSubject | null }) {
  return <div className="flex items-start justify-between gap-4 border-b border-border/55 pb-5"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">{mode === "create" ? "Nueva materia" : "Editar materia"}</p><h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-text">{mode === "create" ? "Sumá una materia al plan" : subject?.name ?? "Editar materia"}</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted">La información estructural se mantiene separada de tus cursadas y estados personales.</p></div>{mode === "edit" ? <span className="rounded-full border border-border/65 px-2.5 py-1 text-[10px] text-muted">Edición estructural</span> : null}</div>;
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text" aria-label="Cerrar"><X className="h-4 w-4" /></button>;
}
