"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CourseWorkspaceDrawer from "@/components/dashboard/course-workspace-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorPalette, SUBJECT_COLORS } from "@/components/ui/color-palette";
import { Select } from "@/components/ui/select";
import { formatSchedulePreview } from "@/lib/schedule";
import type {
  Enrollment,
  Event,
  Subject,
  Term
} from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "cursando", label: "Cursando" },
  { value: "final_pendiente", label: "Final pendiente" },
  { value: "aprobado", label: "Aprobado" },
  { value: "recursar", label: "Recursar" }
] as const;

const formatSchedule = (schedule: Enrollment["schedule"]) =>
  formatSchedulePreview(schedule, { maxBlocks: 2 });

const statusClassByValue: Record<string, string> = {
  cursando: "border-accent/40 bg-accent/10 text-accent",
  final_pendiente: "border-warning/45 bg-warning/10 text-warning",
  aprobado: "border-success/45 bg-success/10 text-success",
  recursar: "border-danger/45 bg-danger/10 text-danger"
};

type EnrollmentApiRow = Omit<Enrollment, "subject" | "term"> & {
  subject?: Subject | Subject[] | null;
  term?: Term | Term[] | null;
};

const asSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
};

const normalizeEnrollment = (
  row: EnrollmentApiRow,
  subjects: Subject[],
  terms: Term[]
): Enrollment | null => {
  const subject = asSingle<Subject>(row.subject) ?? subjects.find((item) => item.id === row.subject_id) ?? null;
  const term = asSingle<Term>(row.term) ?? terms.find((item) => item.id === row.term_id) ?? null;

  if (!subject) return null;

  return {
    id: row.id,
    term_id: row.term_id,
    subject_id: row.subject_id,
    status: row.status,
    color: row.color ?? null,
    notes: row.notes ?? null,
    schedule: Array.isArray(row.schedule) ? row.schedule : [],
    subject,
    term
  } satisfies Enrollment;
};

export default function TermReviewManager({
  terms,
  subjects,
  initialTermId,
  initialEnrollments,
  initialEvents,
  isAdmin
}: {
  terms: Term[];
  subjects: Subject[];
  initialTermId: string | null;
  initialEnrollments: Enrollment[];
  initialEvents: Event[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const fallbackTermId = initialTermId ?? terms[0]?.id ?? "";
  const [selectedTermId, setSelectedTermId] = useState(fallbackTermId);
  const [enrollmentsByTerm, setEnrollmentsByTerm] = useState<Record<string, Enrollment[]>>(
    fallbackTermId ? { [fallbackTermId]: initialEnrollments } : {}
  );
  const [eventsByTerm, setEventsByTerm] = useState<Record<string, Event[]>>(
    fallbackTermId ? { [fallbackTermId]: initialEvents } : {}
  );
  const [loadingTermData, setLoadingTermData] = useState(false);
  const [savingStatusId, setSavingStatusId] = useState<string | null>(null);
  const [addingEnrollment, setAddingEnrollment] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [addForm, setAddForm] = useState({
    subject_id: "",
    status: "cursando",
    color: SUBJECT_COLORS[0]
  });

  useEffect(() => {
    if (!initialTermId) return;
    setSelectedTermId(initialTermId);
    setEnrollmentsByTerm((prev) => ({
      ...prev,
      [initialTermId]: initialEnrollments
    }));
    setEventsByTerm((prev) => ({
      ...prev,
      [initialTermId]: initialEvents
    }));
  }, [initialEvents, initialEnrollments, initialTermId]);

  useEffect(() => {
    if (!selectedTermId && terms[0]?.id) {
      setSelectedTermId(terms[0].id);
    }
  }, [selectedTermId, terms]);

  useEffect(() => {
    if (!selectedTermId) return;
    if (enrollmentsByTerm[selectedTermId] && eventsByTerm[selectedTermId]) return;

    let active = true;
    setLoadingTermData(true);
    setErrorMessage("");

    const load = async () => {
      const [enrollmentResponse, eventResponse] = await Promise.all([
        fetch(`/api/enrollments?termId=${selectedTermId}`),
        fetch(`/api/events?termId=${selectedTermId}`)
      ]);

      if (!active) return;

      if (!enrollmentResponse.ok || !eventResponse.ok) {
        setErrorMessage("No se pudo cargar el detalle del cuatrimestre seleccionado.");
        setLoadingTermData(false);
        return;
      }

      const enrollmentData = await enrollmentResponse.json();
      const eventData = await eventResponse.json();
      if (!active) return;

      const normalizedEnrollments = (Array.isArray(enrollmentData.enrollments)
        ? enrollmentData.enrollments
        : []
      )
        .map((item: unknown) =>
          normalizeEnrollment(item as EnrollmentApiRow, subjects, terms)
        )
        .filter((item: Enrollment | null): item is Enrollment => Boolean(item));

      setEnrollmentsByTerm((prev) => ({
        ...prev,
        [selectedTermId]: normalizedEnrollments
      }));
      setEventsByTerm((prev) => ({
        ...prev,
        [selectedTermId]: Array.isArray(eventData.events) ? eventData.events : []
      }));
      setLoadingTermData(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [selectedTermId, enrollmentsByTerm, eventsByTerm, subjects, terms]);

  const selectedEnrollments = useMemo(
    () => (selectedTermId ? enrollmentsByTerm[selectedTermId] ?? [] : []),
    [enrollmentsByTerm, selectedTermId]
  );

  const selectedEvents = useMemo(
    () => (selectedTermId ? eventsByTerm[selectedTermId] ?? [] : []),
    [eventsByTerm, selectedTermId]
  );

  const enrolledSubjectIds = useMemo(
    () => new Set(selectedEnrollments.map((item) => item.subject_id)),
    [selectedEnrollments]
  );

  const availableSubjects = useMemo(
    () =>
      subjects
        .filter((subject) => !enrolledSubjectIds.has(subject.id))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [subjects, enrolledSubjectIds]
  );

  useEffect(() => {
    if (availableSubjects.length === 0) {
      setAddForm((prev) => ({ ...prev, subject_id: "" }));
      return;
    }
    if (!availableSubjects.some((subject) => subject.id === addForm.subject_id)) {
      setAddForm((prev) => ({ ...prev, subject_id: availableSubjects[0].id }));
    }
  }, [availableSubjects, addForm.subject_id]);

  const eventsByEnrollment = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const event of selectedEvents) {
      const list = map.get(event.enrollment_id) ?? [];
      list.push(event);
      map.set(event.enrollment_id, list);
    }
    return map;
  }, [selectedEvents]);

  const applyEnrollmentChange = (updated: Enrollment) => {
    setEnrollmentsByTerm((prev) => ({
      ...prev,
      [updated.term_id]: (prev[updated.term_id] ?? []).map((item) =>
        item.id === updated.id ? updated : item
      )
    }));
  };

  const applyEventChange = (
    termId: string,
    enrollmentId: string,
    nextEvents: Event[]
  ) => {
    if (!termId) return;
    setEventsByTerm((prev) => {
      const existing = prev[termId] ?? [];
      const rest = existing.filter((event) => event.enrollment_id !== enrollmentId);
      return {
        ...prev,
        [termId]: [...rest, ...nextEvents].sort(
          (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        )
      };
    });
  };

  const handleChangeStatus = async (enrollment: Enrollment, status: string) => {
    if (!isAdmin) return;
    setSavingStatusId(enrollment.id);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/enrollments/${enrollment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!response.ok) {
        setErrorMessage("No se pudo actualizar el estado de la materia.");
        return;
      }

      setEnrollmentsByTerm((prev) => ({
        ...prev,
        [enrollment.term_id]: (prev[enrollment.term_id] ?? []).map((item) =>
          item.id === enrollment.id ? { ...item, status } : item
        )
      }));
      router.refresh();
    } finally {
      setSavingStatusId(null);
    }
  };

  const handleAddEnrollment = async () => {
    if (!isAdmin || !selectedTermId || !addForm.subject_id) return;

    setAddingEnrollment(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          term_id: selectedTermId,
          subject_id: addForm.subject_id,
          status: addForm.status,
          color: addForm.color
        })
      });

      if (!response.ok) {
        setErrorMessage("No se pudo agregar la materia. Revisá si ya existe en este cuatrimestre.");
        return;
      }

      const data = await response.json();
      const normalized = normalizeEnrollment(
        data.enrollment as EnrollmentApiRow,
        subjects,
        terms
      );

      if (!normalized) {
        setErrorMessage("La materia se creó, pero no se pudo preparar para la vista.");
        return;
      }

      setEnrollmentsByTerm((prev) => ({
        ...prev,
        [selectedTermId]: [...(prev[selectedTermId] ?? []), normalized].sort((a, b) =>
          a.subject.name.localeCompare(b.subject.name)
        )
      }));

      router.refresh();
    } finally {
      setAddingEnrollment(false);
    }
  };

  const handleDeleteEnrollment = async (enrollmentId: string) => {
    if (!isAdmin || !selectedTermId) return;

    const response = await fetch(`/api/enrollments/${enrollmentId}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      setErrorMessage("No se pudo eliminar la materia de este cuatrimestre.");
      return;
    }

    setEnrollmentsByTerm((prev) => ({
      ...prev,
      [selectedTermId]: (prev[selectedTermId] ?? []).filter(
        (item) => item.id !== enrollmentId
      )
    }));
    setEventsByTerm((prev) => ({
      ...prev,
      [selectedTermId]: (prev[selectedTermId] ?? []).filter(
        (event) => event.enrollment_id !== enrollmentId
      )
    }));

    router.refresh();
  };

  const selectedTerm = terms.find((term) => term.id === selectedTermId) ?? null;
  const sortedEnrollments = [...selectedEnrollments].sort((a, b) =>
    a.subject.name.localeCompare(b.subject.name)
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-border/65 bg-surface-2/45 p-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1.1fr)]">
        <div>
          <label className="text-xs uppercase tracking-[0.2em] text-muted">Cuatrimestre a revisar</label>
          <Select
            value={selectedTermId}
            onChange={(event) => setSelectedTermId(event.target.value)}
          >
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.label}{term.is_current ? " · actual" : ""}
              </option>
            ))}
          </Select>
          {selectedTerm ? (
            <p className="mt-2 text-xs text-muted">
              {selectedTerm.start_date ?? "sin inicio"}
              {selectedTerm.end_date ? ` → ${selectedTerm.end_date}` : ""}
            </p>
          ) : null}
        </div>

        {isAdmin ? (
          <div className="rounded-2xl border border-border/65 bg-surface/65 p-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Agregar materia al cuatrimestre</p>
            <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
              <Select
                value={addForm.subject_id}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, subject_id: event.target.value }))
                }
                disabled={availableSubjects.length === 0 || !selectedTermId}
              >
                {availableSubjects.length === 0 ? (
                  <option value="">Sin materias disponibles</option>
                ) : (
                  availableSubjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))
                )}
              </Select>
              <Select
                value={addForm.status}
                onChange={(event) =>
                  setAddForm((prev) => ({ ...prev, status: event.target.value }))
                }
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>
            <ColorPalette
              value={addForm.color}
              onChange={(value) => setAddForm((prev) => ({ ...prev, color: value }))}
              className="mt-2 flex-nowrap overflow-x-auto pb-1"
            />
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                onClick={handleAddEnrollment}
                disabled={!selectedTermId || !addForm.subject_id || addingEnrollment}
              >
                {addingEnrollment ? "Agregando..." : "Agregar materia"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/65 bg-surface/65 p-3 text-xs text-muted">
            Modo visualización: podés revisar materias y eventos, sin edición.
          </div>
        )}
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          {errorMessage}
        </div>
      ) : null}

      {loadingTermData ? (
        <div className="rounded-2xl border border-border/60 bg-surface-2/50 px-4 py-5 text-sm text-muted">
          Cargando materias y eventos del cuatrimestre...
        </div>
      ) : sortedEnrollments.length === 0 ? (
        <div className="rounded-2xl border border-border/60 bg-surface-2/50 px-4 py-5 text-sm text-muted">
          Este cuatrimestre todavía no tiene materias activas.
        </div>
      ) : (
        <div className="space-y-2">
          {sortedEnrollments.map((enrollment) => {
            const courseColor = enrollment.color ?? SUBJECT_COLORS[0];
            return (
            <div
              key={enrollment.id}
              className="rounded-2xl border border-border/65 bg-surface-2/60 px-4 py-3"
              style={{ boxShadow: `inset 4px 0 0 ${courseColor}` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full border border-border/60"
                      style={{ backgroundColor: courseColor }}
                    />
                    <p className="font-mono text-[11px] text-muted">
                      {enrollment.subject.code ?? "SIN-COD"}
                    </p>
                  </div>
                  <p className="mt-1 text-base font-semibold text-text">
                    {enrollment.subject.name}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {formatSchedule(enrollment.schedule)}
                    {eventsByEnrollment.get(enrollment.id)?.length
                      ? ` · ${eventsByEnrollment.get(enrollment.id)?.length} evento(s)`
                      : " · sin eventos"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span
                    className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-semibold text-muted"
                    style={{ backgroundColor: `${courseColor}22`, borderColor: `${courseColor}88`, color: courseColor }}
                  >
                    Color
                  </span>
                  <Badge
                    className={
                      statusClassByValue[enrollment.status] ??
                      "border-border/60 bg-surface text-muted"
                    }
                  >
                    {STATUS_OPTIONS.find((item) => item.value === enrollment.status)?.label ??
                      enrollment.status}
                  </Badge>
                  <CourseWorkspaceDrawer
                    enrollment={enrollment}
                    events={eventsByEnrollment.get(enrollment.id) ?? []}
                    isAdmin={isAdmin}
                    onEnrollmentChange={applyEnrollmentChange}
                    onEventsChange={(nextEvents) =>
                      applyEventChange(enrollment.term_id, enrollment.id, nextEvents)
                    }
                    trigger={
                      <Button size="sm" variant="outline">
                        Abrir ficha
                      </Button>
                    }
                  />
                  {isAdmin ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteEnrollment(enrollment.id)}
                    >
                      Quitar
                    </Button>
                  ) : null}
                </div>
              </div>

              {isAdmin ? (
                <div className="mt-3 grid gap-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                  <Select
                    value={enrollment.status}
                    disabled={savingStatusId === enrollment.id}
                    onChange={(event) =>
                      handleChangeStatus(enrollment, event.target.value)
                    }
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                  <p className="rounded-xl border border-border/60 bg-surface px-3 py-2 text-xs text-muted">
                    Horario editable desde la ficha de materia.
                  </p>
                </div>
              ) : null}
            </div>
          )})}
        </div>
      )}
    </div>
  );
}
