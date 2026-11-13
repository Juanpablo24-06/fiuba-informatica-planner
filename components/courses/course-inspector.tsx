"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  FileText,
  GitBranch,
  Pencil,
  Plus,
  Trash2
} from "lucide-react";
import type { ComponentProps, ComponentType, Dispatch, ReactNode, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import type { CourseCatalogItem, CourseRelation } from "@/lib/courses/catalog";
import type { EvaluationTemplate } from "@/lib/types";
import { CourseForm, CourseFormHeading, type CourseFormValues } from "@/components/courses/course-form";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  cursando: "Cursando",
  aprobado: "Aprobada",
  final_pendiente: "Final pendiente",
  recursar: "Recursar"
};

const statusLabel = (course: CourseCatalogItem) =>
  course.status?.status ? STATUS_LABELS[course.status.status] ?? course.status.status : "Sin estado registrado";

const termLabel = (term: number | null) => (term ? `Período ${term}` : "Sin período sugerido");
const cycleLabel = (cycle: string | null) => {
  if (!cycle) return "Sin ciclo";
  return cycle.toLowerCase() === "cbc" ? "CBC" : cycle;
};
const formatHours = (value: number | null) => (value === null ? "—" : `${value} h`);

export const formatLegacyEvaluationTemplate = (template: EvaluationTemplate | null | undefined) => {
  if (!template) return [];
  const lines: string[] = [];
  const count = (label: string, value: number | undefined) => {
    if (typeof value === "number") lines.push(`${label}: ${value}`);
  };
  count("Parciales", template.parciales);
  count("Recuperatorios", template.recuperatorios);
  count("Trabajos prácticos", template.tps);
  count("Defensas", template.defensas);
  count("Finales", template.finales);
  if (typeof template.promocion === "boolean") lines.push(`Promoción: ${template.promocion ? "Sí" : "No"}`);
  if (template.notas?.trim()) lines.push(`Notas: ${template.notas.trim()}`);
  return lines;
};

export type CourseInspectorProps = {
  course: CourseCatalogItem | null;
  isAdmin: boolean;
  onStartEditing: () => void;
  onArchive: () => void;
  onSelectRelation: (relation: CourseRelation) => void;
  onCreate: () => void;
  archivePending?: boolean;
  formMode?: "create" | "edit" | null;
  editor?: CourseFormValues | null;
  setEditor?: Dispatch<SetStateAction<CourseFormValues | null>>;
  courses?: CourseCatalogItem[];
  saving?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  error?: string | null;
};

export function CourseInspector({
  course,
  isAdmin,
  onStartEditing,
  onArchive,
  onSelectRelation,
  onCreate,
  archivePending = false,
  formMode = null,
  editor = null,
  setEditor,
  courses = [],
  saving = false,
  onSave,
  onCancel,
  error = null
}: CourseInspectorProps) {
  if (formMode && editor && setEditor && onSave && onCancel) {
    return (
      <section className="border-y border-border/70 bg-surface/[0.18] px-5 py-6 sm:px-8 sm:py-8" data-ai-resource="course-inspector" data-ai-editor="true" data-course-form-mode={formMode}>
        <div className="flex items-start justify-between gap-4">
          <CourseFormHeading mode={formMode} subject={course?.subject} />
        </div>
        <div className="mt-6">
          <CourseForm
            values={editor}
            setValues={(next) => setEditor((previous) => {
              const current = previous ?? editor;
              return typeof next === "function" ? next(current) : next;
            })}
            courses={courses}
            editingSubjectId={formMode === "edit" ? course?.subject.id : null}
            saving={saving}
            submitLabel={formMode === "create" ? "Crear materia" : "Guardar cambios"}
            onSubmit={onSave}
            onCancel={onCancel}
            error={error}
          />
        </div>
      </section>
    );
  }

  if (!course) {
    return (
      <section className="min-h-[560px] border-y border-border/70 px-6 py-10 text-sm text-muted">
        <p>Seleccioná una materia para ver su detalle.</p>
        {isAdmin ? <Button type="button" size="sm" className="mt-5" onClick={onCreate}><Plus className="mr-1.5 h-4 w-4" />Nueva materia</Button> : null}
      </section>
    );
  }

  const subject = course.subject;
  const currentStatus = course.status?.status;
  const personalTitle = course.currentEnrollment
    ? `${statusLabel(course)}${course.currentEnrollment.term?.label ? ` · ${course.currentEnrollment.term.label}` : ""}`
    : currentStatus
      ? statusLabel(course)
      : "Sin estado registrado";
  const legacyEvaluation = formatLegacyEvaluationTemplate(subject.template);
  const hasAcademicInfo = Boolean(subject.evaluation_info || subject.requirements?.length || legacyEvaluation.length);

  return (
    <section className="border-y border-border/70 bg-surface/[0.18]" data-ai-resource="course-inspector" data-ai-resource-id={subject.id}>
      <header className="border-b border-border/60 px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-accent">{subject.type === "electiva" ? "Materia electiva" : "Materia del plan"}</p>
            <h2 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-text sm:text-4xl">{subject.name}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-muted">
              <span className="font-semibold text-text">{subject.code ?? "Sin código"}</span>
              <span className="text-border" aria-hidden="true">·</span>
              <span>{cycleLabel(subject.cycle)}</span>
              <span className="text-border" aria-hidden="true">·</span>
              <span>{termLabel(subject.term_suggested)}</span>
              {subject.type ? <span className="rounded-full border border-border/70 px-2.5 py-1 text-[10px] font-semibold text-muted">{subject.type}</span> : null}
            </div>
            {subject.description ? <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">{subject.description}</p> : null}
          </div>
          {isAdmin ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" variant="outline" size="sm" onClick={onStartEditing}><Pencil className="mr-1.5 h-3.5 w-3.5" />Editar</Button>
              <button type="button" onClick={onArchive} disabled={archivePending} className="grid h-8 w-8 place-items-center rounded-full text-muted transition hover:bg-rose-400/10 hover:text-rose-300 disabled:opacity-50" aria-label="Enviar materia a la papelera" title="Enviar a papelera"><Trash2 className="h-4 w-4" /></button>
            </div>
          ) : null}
        </div>

        <div className="mt-7 grid grid-cols-2 divide-x divide-border/60 border-y border-border/55 sm:grid-cols-4">
          <Metric label="Créditos" value={subject.credits === null ? "No asignados" : String(subject.credits)} />
          <Metric label="Horas semanales" value={formatHours(subject.weekly_hours)} />
          <Metric label="Carga total" value={formatHours(subject.total_hours)} />
          <Metric label="Orden" value={subject.term_order === null || subject.term_order === undefined ? "Automático" : String(subject.term_order)} />
        </div>
      </header>

      <div className="divide-y divide-border/55 px-5 sm:px-8">
        <InspectorSection icon={CheckCircle2} eyebrow="Tu situación" title={personalTitle}>
          {course.currentEnrollment ? (
            <div className="space-y-2 text-sm leading-6 text-muted">
              <p>{course.currentEnrollment.notes || "Tenés una cursada registrada para esta materia."}</p>
              {course.currentEnrollment.schedule.length > 0 ? <p className="text-text/85">{course.currentEnrollment.schedule.map((slot) => `${slot.day.toUpperCase()} ${slot.start_time}–${slot.end_time}`).join(" · ")}</p> : null}
            </div>
          ) : (
            <p className="text-sm leading-6 text-muted">{course.status ? "No hay una cursada en el período actual. El estado mostrado corresponde a tu último registro." : "No hay cursadas registradas. La información que sigue describe la estructura del plan, no resultados personales."}</p>
          )}
        </InspectorSection>

        <InspectorSection icon={GitBranch} eyebrow="Requisitos" title={course.prerequisites.length ? `${course.prerequisites.length} requisito${course.prerequisites.length === 1 ? "" : "s"}` : "Sin requisitos registrados"}>
          {course.prerequisites.length ? <RelationList relations={course.prerequisites} onSelect={onSelectRelation} /> : <p className="text-sm text-muted">No hay una relación previa cargada.</p>}
        </InspectorSection>

        <InspectorSection icon={ArrowUpRightIcon} eyebrow="Habilita" title={course.unlocks.length ? `${course.unlocks.length} materia${course.unlocks.length === 1 ? "" : "s"}` : "Sin dependientes registrados"}>
          {course.unlocks.length ? <RelationList relations={course.unlocks} onSelect={onSelectRelation} /> : <p className="text-sm text-muted">Esta materia no tiene dependientes registrados todavía.</p>}
        </InspectorSection>

        <InspectorSection icon={FileText} eyebrow="Información académica" title={hasAcademicInfo ? "Régimen general" : "Sin información adicional cargada"}>
          <div className="space-y-4 text-sm leading-6 text-muted">
            {subject.evaluation_info ? <p className="whitespace-pre-line">{subject.evaluation_info}</p> : null}
            {subject.requirements?.length ? <div><p className="mb-1 font-semibold text-text">Requisitos escritos</p><ul className="list-inside list-disc space-y-1">{subject.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul></div> : null}
            {legacyEvaluation.length ? <div><p className="mb-1 font-semibold text-text">Plantilla general de evaluación</p><ul className="space-y-1">{legacyEvaluation.map((line) => <li key={line}>{line}</li>)}</ul></div> : null}
            {!hasAcademicInfo ? <p>No hay información académica general cargada para esta materia.</p> : null}
          </div>
        </InspectorSection>

        <InspectorSection icon={Plus} eyebrow="Información adicional" title={subject.notes || subject.custom_fields?.length || subject.useful_links?.length ? "Datos personalizados" : "Sin datos personalizados"}>
          <AdditionalInfo subject={subject} />
        </InspectorSection>
      </div>

      <footer className="flex flex-wrap gap-3 px-5 py-5 sm:px-8">
        <Link href="/calendario" className="inline-flex items-center gap-2 rounded-full border border-border/75 px-4 py-2 text-sm font-semibold text-muted hover:text-accent">Ver horario <ArrowUpRight className="h-4 w-4" /></Link>
        <Link href={`/planificar?subject=${encodeURIComponent(subject.id)}`} className="inline-flex items-center gap-2 rounded-full border border-accent/50 px-4 py-2 text-sm font-semibold text-accent transition hover:bg-accent/10">Planificar cursada <ArrowUpRight className="h-4 w-4" /></Link>
        <Link href="/mapa" className="inline-flex items-center gap-2 rounded-full border border-border/75 px-4 py-2 text-sm font-semibold text-muted transition hover:border-accent/40 hover:text-text">Ver en el mapa <ArrowUpRight className="h-4 w-4" /></Link>
      </footer>
    </section>
  );
}

function ArrowUpRightIcon(props: ComponentProps<typeof ArrowUpRight>) {
  return <ArrowUpRight {...props} />;
}

function AdditionalInfo({ subject }: { subject: CourseCatalogItem["subject"] }) {
  const hasData = Boolean(subject.notes || subject.custom_fields?.length || subject.useful_links?.length);
  if (!hasData) return <p className="text-sm text-muted">Podés agregar notas, links o campos propios desde Editar.</p>;
  return <div className="space-y-4 text-sm leading-6 text-muted">
    {subject.notes ? <p className="whitespace-pre-line">{subject.notes}</p> : null}
    {subject.custom_fields?.length ? <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">{subject.custom_fields.map((field) => <div key={`${field.label}-${field.value}`}><dt className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{field.label}</dt><dd className="text-text">{field.value}</dd></div>)}</dl> : null}
    {subject.useful_links?.length ? <div className="flex flex-wrap gap-x-4 gap-y-2">{subject.useful_links.map((link) => <a key={`${link.label}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-accent transition hover:text-text">{link.label}<ArrowUpRight className="h-3.5 w-3.5" /></a>)}</div> : null}
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 px-3 py-4 first:pl-0 last:pr-0 sm:px-4"><p className="truncate text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p><p className="mt-1 truncate text-sm font-semibold text-text">{value}</p></div>;
}

function InspectorSection({ icon: Icon, eyebrow, title, children }: { icon: ComponentType<{ className?: string }>; eyebrow: string; title: string; children: ReactNode }) {
  return <section className="py-6"><div className="flex items-start gap-3"><Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{eyebrow}</p><h3 className="mt-1 text-base font-semibold text-text">{title}</h3><div className="mt-3">{children}</div></div></div></section>;
}

function RelationList({ relations, onSelect }: { relations: CourseRelation[]; onSelect: (relation: CourseRelation) => void }) {
  return <div className="flex flex-wrap gap-2">{relations.map((relation) => <button key={relation.id} type="button" onClick={() => onSelect(relation)} className={cn("group inline-flex items-center gap-2 rounded-xl border border-border/65 bg-surface-2/50 px-3 py-2 text-left text-sm text-text transition hover:border-accent/45 hover:bg-accent/8")}><span className="text-[10px] font-semibold text-muted">{relation.code ?? "—"}</span><span>{relation.name}</span><ChevronRight className="h-3.5 w-3.5 text-muted transition group-hover:translate-x-0.5 group-hover:text-accent" /></button>)}</div>;
}
