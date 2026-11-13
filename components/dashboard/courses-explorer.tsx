"use client";

import { useModalFocus } from "@/components/ui/use-modal-focus";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Plus,
  Search,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  compareCourseItems,
  courseMatchesFilter,
  type CourseCatalogItem,
  type CourseRelation,
  type CourseSubject
} from "@/lib/courses/catalog";
import {
  emptyCourseForm,
  editorValuesFor,
  subjectPayloadFor,
  type CourseFormValues
} from "@/components/courses/course-form";
import { CourseInspector } from "@/components/courses/course-inspector";
import { CourseTrashDialog } from "@/components/courses/course-trash-dialog";
import { cn } from "@/lib/utils";

type CourseFilter = "all" | "cursando" | "aprobadas" | "disponibles" | "cbc" | "electivas";
type SortMode = "curriculum" | "name" | "load";

const FILTERS: Array<{ id: CourseFilter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "cursando", label: "Cursando" },
  { id: "aprobadas", label: "Aprobadas" },
  { id: "disponibles", label: "Disponibles" },
  { id: "cbc", label: "CBC" },
  { id: "electivas", label: "Electivas" }
];

const STATUS_LABELS: Record<string, string> = {
  cursando: "Cursando",
  aprobado: "Aprobada",
  final_pendiente: "Final pendiente",
  recursar: "Recursar"
};

const STATUS_STYLES: Record<string, string> = {
  cursando: "border-accent/35 bg-accent/10 text-accent",
  aprobado: "border-emerald-400/25 bg-emerald-400/10 text-success",
  final_pendiente: "border-amber-300/25 bg-amber-300/10 text-warning",
  recursar: "border-rose-300/25 bg-rose-300/10 text-danger"
};

const statusLabel = (course: CourseCatalogItem) => course.status?.status ? STATUS_LABELS[course.status.status] ?? course.status.status : course.blockedBy?.length ? "Correlativas pendientes" : "Disponible";
const statusClass = (course: CourseCatalogItem) => course.status?.status ? STATUS_STYLES[course.status.status] ?? "border-border/70 bg-surface-2 text-muted" : "border-border/70 bg-transparent text-muted";
const relationFromSubject = (subject: CourseSubject): CourseRelation => ({ id: subject.id, code: subject.code, name: subject.name, term_suggested: subject.term_suggested });
const termLabel = (term: number | null) => term ? `Período ${term}` : "Sin período";

const emptyCatalogItem = (subject: CourseSubject): CourseCatalogItem => ({
  subject,
  status: null,
  prerequisites: [],
  unlocks: [],
  currentEnrollment: null,
  events: []
});

const updateRelations = (
  previous: CourseCatalogItem[],
  subject: CourseSubject,
  prerequisiteIds: string[],
  unlockIds: string[]
) => {
  const prerequisiteSet = new Set(prerequisiteIds.filter((id) => id !== subject.id));
  const unlockSet = new Set(unlockIds.filter((id) => id !== subject.id));
  const selectedRelation = relationFromSubject(subject);
  const byId = new Map(previous.map((item) => [item.subject.id, item.subject]));

  return previous.map((item) => {
    if (item.subject.id === subject.id) {
      return {
        ...item,
        subject,
        prerequisites: [...prerequisiteSet].map((id) => byId.get(id)).filter(Boolean).map((value) => relationFromSubject(value as CourseSubject)),
        unlocks: [...unlockSet].map((id) => byId.get(id)).filter(Boolean).map((value) => relationFromSubject(value as CourseSubject))
      };
    }

    const prerequisites = item.prerequisites.filter((relation) => relation.id !== subject.id);
    const unlocks = item.unlocks.filter((relation) => relation.id !== subject.id);
    if (unlockSet.has(item.subject.id)) prerequisites.push(selectedRelation);
    if (prerequisiteSet.has(item.subject.id)) unlocks.push(selectedRelation);
    return { ...item, prerequisites, unlocks };
  });
};

export default function CoursesExplorer({
  initialCourses,
  initialDeletedCourses = [],
  isAdmin
}: {
  initialCourses: CourseCatalogItem[];
  initialDeletedCourses?: CourseSubject[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [deletedCourses, setDeletedCourses] = useState(initialDeletedCourses);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CourseFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("curriculum");
  const [selectedId, setSelectedId] = useState<string | null>(initialCourses[0]?.subject.id ?? null);
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editor, setEditor] = useState<CourseFormValues | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<CourseCatalogItem | null>(null);
  const [archivePending, setArchivePending] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const mobileFocusRef = useModalFocus(mobileInspectorOpen, () => setMobileInspectorOpen(false));
  const [coursesReady, setCoursesReady] = useState(false);

  useEffect(() => {
    setCourses(initialCourses);
    setCoursesReady(true);
  }, [initialCourses]);

  useEffect(() => setDeletedCourses(initialDeletedCourses), [initialDeletedCourses]);

  useEffect(() => {
    if (selectedId && courses.some((course) => course.subject.id === selectedId)) return;
    setSelectedId(courses[0]?.subject.id ?? null);
  }, [courses, selectedId]);

  useEffect(() => {
    if (!mobileInspectorOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileInspectorOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [mobileInspectorOpen]);

  const selected = courses.find((course) => course.subject.id === selectedId) ?? null;
  const summary = useMemo(() => ({
    credits: courses.reduce((sum, course) => sum + (course.subject.credits ?? 0), 0),
    totalHours: courses.reduce((sum, course) => sum + (course.subject.total_hours ?? 0), 0)
  }), [courses]);

  const visibleCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return courses
      .filter((course) => courseMatchesFilter(course, filter))
      .filter((course) => !normalizedQuery || [course.subject.code, course.subject.name, course.subject.cycle, course.subject.type]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase("es").includes(normalizedQuery)))
      .sort((a, b) => {
        if (sortMode === "name") return a.subject.name.localeCompare(b.subject.name, "es");
        if (sortMode === "load") return (b.subject.total_hours ?? 0) - (a.subject.total_hours ?? 0) || a.subject.name.localeCompare(b.subject.name, "es");
        return compareCourseItems(a, b);
      });
  }, [courses, filter, query, sortMode]);

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("courses:view") ?? "null");
      if (saved) {
        if (typeof saved.query === "string") setQuery(saved.query);
        if (FILTERS.some((item) => item.id === saved.filter)) setFilter(saved.filter);
        if (["curriculum", "name", "load"].includes(saved.sort)) setSortMode(saved.sort);
        if (typeof saved.selected === "string") setSelectedId(saved.selected);
      }
    } catch { /* Ignore an invalid local view preference. */ }
  }, []);
  useEffect(() => {
    if (!coursesReady) return;
    try { sessionStorage.setItem("courses:view", JSON.stringify({ query, filter, sort: sortMode, selected: selectedId })); } catch { /* Optional view preference. */ }
  }, [query, filter, sortMode, selectedId, coursesReady]);

  const groupedCourses = useMemo(() => {
    const groups = new Map<number | null, CourseCatalogItem[]>();
    for (const course of visibleCourses) groups.set(course.subject.term_suggested, [...(groups.get(course.subject.term_suggested) ?? []), course]);
    return [...groups.entries()];
  }, [visibleCourses]);

  const counts = useMemo(() => {
    const values = new Map<CourseFilter, number>();
    for (const item of FILTERS) values.set(item.id, courses.filter((course) => courseMatchesFilter(course, item.id)).length);
    return values;
  }, [courses]);

  const openCreate = () => {
    if (!isAdmin) return;
    setEditor(emptyCourseForm());
    setFormMode("create");
    setError(null);
    setNotice(null);
    if (window.matchMedia("(max-width: 1023px)").matches) setMobileInspectorOpen(true);
  };

  const openEdit = () => {
    if (!selected || !isAdmin) return;
    setEditor(editorValuesFor(selected));
    setFormMode("edit");
    setError(null);
    setNotice(null);
  };

  const closeForm = () => {
    if (saving) return;
    setFormMode(null);
    setEditor(null);
    setError(null);
  };

  const saveCourse = async () => {
    if (!editor || saving) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const isCreating = formMode === "create";
    const subjectId = isCreating ? null : selected?.subject.id;
    let persistedSubject: CourseSubject | null = null;

    try {
      const subjectResponse = await fetch(subjectId ? `/api/subjects/${subjectId}` : "/api/subjects", {
        method: subjectId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subjectPayloadFor(editor))
      });
      const subjectData = await subjectResponse.json().catch(() => null);
      if (!subjectResponse.ok) throw new Error(subjectData?.error ?? "No se pudo guardar la materia.");
      const updatedSubject = subjectData?.subject as CourseSubject | undefined;
      if (!updatedSubject?.id) throw new Error("La respuesta no incluyó la materia guardada.");
      persistedSubject = updatedSubject;

      if (isCreating) {
        setCourses((previous) => previous.some((course) => course.subject.id === updatedSubject.id)
          ? previous
          : [...previous, emptyCatalogItem(updatedSubject)].sort(compareCourseItems));
        setSelectedId(updatedSubject.id);
        setFormMode("edit");
      }

      const relationResponse = await fetch(`/api/subjects/${updatedSubject.id}/prerequisites`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prerequisiteIds: editor.prerequisiteIds, unlockIds: editor.unlockIds })
      });
      const relationData = await relationResponse.json().catch(() => null);
      if (!relationResponse.ok) throw new Error(relationData?.error ?? "No se pudieron guardar las relaciones.");
      const prerequisiteIds = Array.isArray(relationData?.prerequisiteIds) ? relationData.prerequisiteIds : editor.prerequisiteIds;
      const unlockIds = Array.isArray(relationData?.unlockIds) ? relationData.unlockIds : editor.unlockIds;

      if (isCreating) {
        setCourses((previous) => updateRelations(previous, updatedSubject, prerequisiteIds, unlockIds).sort(compareCourseItems));
        setSelectedId(updatedSubject.id);
        setNotice("Materia creada y agregada al plan.");
      } else {
        setCourses((previous) => updateRelations(previous, updatedSubject, prerequisiteIds, unlockIds));
        setNotice("Materia y relaciones guardadas.");
      }
      setFormMode(null);
      setEditor(null);
      router.refresh();
      if (window.matchMedia("(max-width: 1023px)").matches) setMobileInspectorOpen(true);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "No se pudo guardar la materia.";
      const createdSubject = persistedSubject;
      if (isCreating && createdSubject) {
        setCourses((previous) => previous.some((course) => course.subject.id === createdSubject.id)
          ? previous
          : [...previous, emptyCatalogItem(createdSubject)].sort(compareCourseItems));
        setSelectedId(createdSubject.id);
        setFormMode("edit");
        setEditor(editor);
        setError(`La materia se creó, pero no se pudieron guardar sus relaciones: ${message} Podés reintentar ahora sin crear otra materia.`);
      } else {
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const selectRelation = (relation: CourseRelation) => {
    setSelectedId(relation.id);
    setFormMode(null);
    setEditor(null);
    setNotice(null);
    if (window.matchMedia("(max-width: 1023px)").matches) setMobileInspectorOpen(true);
  };

  const confirmArchive = async () => {
    if (!archiveTarget || archivePending) return;
    setArchivePending(true);
    setError(null);
    try {
      const response = await fetch(`/api/subjects/${archiveTarget.subject.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "No se pudo enviar la materia a la papelera.");
      setCourses((previous) => previous
        .filter((course) => course.subject.id !== archiveTarget.subject.id)
        .map((course) => ({
          ...course,
          prerequisites: course.prerequisites.filter((relation) => relation.id !== archiveTarget.subject.id),
          unlocks: course.unlocks.filter((relation) => relation.id !== archiveTarget.subject.id)
        })));
      setDeletedCourses((previous) => [archiveTarget.subject, ...previous.filter((subject) => subject.id !== archiveTarget.subject.id)]);
      setSelectedId((current) => current === archiveTarget.subject.id ? null : current);
      setArchiveTarget(null);
      setNotice("Materia archivada. Podés restaurarla desde Papelera.");
      router.refresh();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "No se pudo archivar la materia.");
    } finally {
      setArchivePending(false);
    }
  };

  const restoreCourse = async (subject: CourseSubject) => {
    const response = await fetch(`/api/subjects/${subject.id}/restore`, { method: "POST" });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? "No se pudo restaurar la materia.");
    const restored = (data?.subject ?? subject) as CourseSubject;
    const relationResponse = await fetch(`/api/subjects/${restored.id}/prerequisites`);
    const relationData = await relationResponse.json().catch(() => null);
    const prerequisiteIds = Array.isArray(relationData?.prerequisiteIds) ? relationData.prerequisiteIds : [];
    const unlockIds = Array.isArray(relationData?.unlockIds) ? relationData.unlockIds : [];
    setDeletedCourses((previous) => previous.filter((item) => item.id !== subject.id));
    setCourses((previous) => updateRelations([...previous, emptyCatalogItem(restored)], restored, prerequisiteIds, unlockIds).sort(compareCourseItems));
    setSelectedId(restored.id);
    setNotice("Materia restaurada en el catálogo.");
    router.refresh();
  };

  const selectCourse = (relation: CourseRelation) => selectRelation(relation);

  return (
    <main className="mx-auto w-full max-w-none pb-6 pt-1 lg:pb-16" data-ai-resource="courses" data-courses-ready={coursesReady ? "true" : "false"}>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(20rem,0.72fr)_minmax(0,1.38fr)] 2xl:grid-cols-[minmax(24rem,0.66fr)_minmax(0,1.5fr)] 2xl:gap-10">
        <aside className="flex h-[calc(100dvh-var(--app-header-height,160px)-1.25rem)] min-h-[460px] min-w-0 flex-col lg:sticky lg:top-[calc(var(--app-header-height)+1.25rem)] lg:h-[calc(100svh-var(--app-header-height)-1.5rem)]" aria-label="Lista de materias">
          <section className="mb-4 border-y border-border/70 bg-surface/35 px-1 py-3" aria-label="Explorar cursos">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent">Plan académico</p><p className="mt-1 text-xs text-muted">{courses.length} materias · {summary.credits} créditos · {summary.totalHours} h</p></div>{isAdmin ? <div className="flex items-center gap-1"><Button type="button" size="sm" onClick={openCreate}><Plus className="mr-1.5 h-3.5 w-3.5" />Nueva materia</Button><Button type="button" variant="outline" size="sm" onClick={() => setTrashOpen(true)} title="Abrir papelera"><Trash2 className="h-3.5 w-3.5 sm:mr-1.5" /><span className="hidden sm:inline">Papelera</span>{deletedCourses.length > 0 ? <span className="ml-1 text-[10px]">{deletedCourses.length}</span> : null}</Button></div> : null}</div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre, código o ciclo..." aria-label="Buscar cursos" className={cn("rounded-xl bg-transparent pl-11", query && "pr-10")} />{query ? <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-text" aria-label="Limpiar búsqueda"><X className="h-3.5 w-3.5" /></button> : null}</label>
              <div className="w-full sm:w-44"><Select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="h-[42px] rounded-xl" aria-label="Ordenar cursos"><option value="curriculum">Orden del plan</option><option value="name">Nombre (A–Z)</option><option value="load">Mayor carga horaria</option></Select></div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-3" role="group" aria-label="Filtrar cursos">{FILTERS.map((item) => <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={cn("flex min-w-0 items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition-colors", filter === item.id ? "bg-accent/14 text-accent" : "text-muted hover:bg-surface-2 hover:text-text")}><span className="truncate">{item.label}</span><span className="ml-1.5 text-[10px] opacity-60">{counts.get(item.id)}</span></button>)}</div>
          </section>

          <div className="context-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain border-y border-border/70 pr-1">
            {groupedCourses.length === 0 ? <div className="px-4 py-12 text-center text-sm text-muted">No encontramos materias con esos filtros.</div> : sortMode === "curriculum" ? groupedCourses.map(([term, items]) => <section key={term ?? "none"} className="border-b border-border/45 last:border-b-0"><div className="sticky top-0 z-10 flex items-center justify-between bg-background/90 px-1 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted backdrop-blur"><span>{termLabel(term)}</span><span>{items.length}</span></div><div>{items.map((course) => <CourseListRow key={course.subject.id} course={course} active={course.subject.id === selectedId} onSelect={selectCourse} />)}</div></section>) : <div>{visibleCourses.map((course) => <CourseListRow key={course.subject.id} course={course} active={course.subject.id === selectedId} onSelect={selectCourse} />)}</div>}
          </div>
        </aside>

        <div ref={(element) => { mobileFocusRef.current = element; }} className={cn("context-scrollbar min-w-0 lg:static lg:block lg:overflow-visible lg:bg-transparent lg:backdrop-blur-none", mobileInspectorOpen ? "fixed inset-x-0 bottom-0 top-[calc(var(--app-header-height,160px)+0.25rem)] z-40 overflow-y-auto overscroll-contain bg-shadow/30 backdrop-blur-sm" : "hidden")} role={mobileInspectorOpen ? "dialog" : undefined} aria-modal={mobileInspectorOpen ? "true" : undefined} aria-label={mobileInspectorOpen ? (selected ? `Detalle de ${selected.subject.name}` : "Detalle de materia") : undefined}>
          <div className="min-h-full rounded-t-[1.75rem] border border-border/60 bg-background shadow-2xl lg:min-h-0 lg:rounded-none lg:border-0 lg:bg-transparent lg:shadow-none">
            <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border/55 bg-background/95 px-4 py-3 backdrop-blur-xl lg:hidden"><div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-accent">{formMode === "create" ? "Nueva materia" : formMode === "edit" ? "Editar materia" : "Detalle de materia"}</p><p className="truncate text-sm font-semibold text-text">{formMode === "create" ? "Sumá una materia al plan" : selected?.subject.name ?? "Curso"}</p></div><button type="button" onClick={() => setMobileInspectorOpen(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted transition hover:text-text" aria-label="Cerrar detalle"><X className="h-4 w-4" /></button></div>
            <CourseInspector
              course={selected}
              isAdmin={isAdmin}
              onStartEditing={openEdit}
              onArchive={() => selected && setArchiveTarget(selected)}
              onSelectRelation={selectRelation}
              onCreate={openCreate}
              archivePending={archivePending}
              formMode={formMode}
              editor={editor}
              setEditor={setEditor}
              courses={courses}
              saving={saving}
              onSave={saveCourse}
              onCancel={closeForm}
              error={error}
            />
            {notice ? <p className="px-5 py-2 text-xs text-success sm:px-8" role="status">{notice}</p> : null}
            {error && !formMode ? <p className="px-5 py-2 text-xs text-danger sm:px-8" role="alert">{error}</p> : null}
          </div>
        </div>
      </div>

      <CourseTrashDialog open={trashOpen} onOpenChange={setTrashOpen} subjects={deletedCourses} onRestore={restoreCourse} />
      <ArchiveDialog target={archiveTarget} pending={archivePending} onOpenChange={(open) => { if (!open && !archivePending) setArchiveTarget(null); }} onConfirm={confirmArchive} />
    </main>
  );
}

function CourseListRow({ course, active, onSelect }: { course: CourseCatalogItem; active: boolean; onSelect: (relation: CourseRelation) => void }) {
  return <button type="button" data-ai-resource="course" data-ai-resource-id={course.subject.id} onClick={() => onSelect(relationFromSubject(course.subject))} className={cn("group relative flex w-full items-center gap-3 border-t border-border/35 px-3 py-3.5 text-left transition-colors", active ? "bg-accent/[0.07]" : "hover:bg-surface-2/65")}><span className={cn("h-2.5 w-2.5 shrink-0 rounded-full border", active ? "border-accent bg-accent" : course.status?.color ? "border-accent/70 bg-accent/45" : "border-muted/70")} /><span className="min-w-0 flex-1"><span className="flex items-baseline gap-2"><span className="text-[11px] font-semibold tabular-nums text-muted">{course.subject.code ?? "—"}</span><span className={cn("truncate text-sm font-medium", active ? "text-text" : "text-text/85")}>{course.subject.name}</span></span><span className="mt-1 flex gap-2 text-[11px] text-muted"><span>{course.subject.credits ? `${course.subject.credits} créditos` : course.subject.total_hours ? `${course.subject.total_hours} h totales` : "Sin carga informada"}</span>{course.subject.type && <span className="text-accent/80">{course.subject.type}</span>}</span></span><span className={cn("shrink-0 rounded-full border px-2 py-1 text-[10px] font-semibold", statusClass(course))}>{statusLabel(course)}</span><ChevronRight className={cn("h-4 w-4 shrink-0 text-muted/60 transition-transform", active && "translate-x-0.5 text-accent")} /></button>;
}

function ArchiveDialog({ target, pending, onOpenChange, onConfirm }: { target: CourseCatalogItem | null; pending: boolean; onOpenChange: (open: boolean) => void; onConfirm: () => void }) {
  return <Dialog open={Boolean(target)} onOpenChange={onOpenChange}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Enviar a Papelera</DialogTitle><DialogDescription className="pt-1">{target ? `“${target.subject.name}” dejará de aparecer en Cursos y Mapa. Podés restaurarla después sin perder sus datos ni relaciones.` : ""}</DialogDescription></DialogHeader><DialogFooter className="mt-5"><Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>Cancelar</Button><Button type="button" onClick={onConfirm} disabled={pending}>{pending ? "Archivando…" : "Enviar a Papelera"}</Button></DialogFooter></DialogContent></Dialog>;
}
