import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Enrollment, EnrollmentScheduleDay, Event, EventLink } from "@/lib/types";
import { formatDateTime } from "@/lib/date";
import {
  EMPTY_EVENT_FORM,
  buildDescription,
  buildEventForm,
  buildEventPayload,
  draftBlocksToSlots,
  slotsToDraftBlocks,
  sortScheduleDays,
  validateScheduleBlocks,
  type EventForm,
  type ScheduleBlockDraft
} from "@/lib/dashboard/course-workspace";
import { getPrimaryEventLinkDraft } from "@/lib/dashboard/event-links";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorPalette, SUBJECT_COLORS } from "@/components/ui/color-palette";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const STATUS_OPTIONS = [
  { value: "cursando", label: "Cursando" },
  { value: "final_pendiente", label: "Final pendiente" },
  { value: "aprobado", label: "Aprobado" },
  { value: "recursar", label: "Recursar" }
] as const;

const EVENT_TYPES = [
  { value: "tp", label: "TP" },
  { value: "parcial", label: "Parcial" },
  { value: "recuperatorio", label: "Recuperatorio" },
  { value: "final", label: "Final" },
  { value: "defensa", label: "Defensa" },
  { value: "clase", label: "Clase" },
  { value: "otro", label: "Otro" }
] as const;

const EVENT_TYPE_LABELS = Object.fromEntries(EVENT_TYPES.map((item) => [item.value, item.label]));
const SCHEDULE_DAY_OPTIONS: { value: EnrollmentScheduleDay; label: string }[] = [
  { value: "lun", label: "Lunes" },
  { value: "mar", label: "Martes" },
  { value: "mie", label: "Miércoles" },
  { value: "jue", label: "Jueves" },
  { value: "vie", label: "Viernes" },
  { value: "sab", label: "Sábado" }
];

export type CourseWorkspaceModel = {
  enrollment: Enrollment;
  events: Event[];
};

export default function CourseWorkspaceDrawer({
  enrollment,
  events,
  isAdmin,
  trigger,
  onEnrollmentChange,
  onEventsChange
}: {
  enrollment: Enrollment;
  events: Event[];
  isAdmin: boolean;
  trigger: React.ReactNode;
  onEnrollmentChange?: (enrollment: Enrollment) => void;
  onEventsChange?: (events: Event[]) => void;
}) {
  const router = useRouter();
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    setInteractive(true);
  }, []);

  const [localEnrollment, setLocalEnrollment] = useState(enrollment);
  const [localEvents, setLocalEvents] = useState(events);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleBlockDraft[]>(
    slotsToDraftBlocks(enrollment.schedule ?? [])
  );
  const [scheduleError, setScheduleError] = useState("");
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [creating, setCreating] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>(EMPTY_EVENT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<EventForm>(EMPTY_EVENT_FORM);
  const [editingLinks, setEditingLinks] = useState<EventLink[] | null>(null);

  useEffect(() => {
    setLocalEnrollment(enrollment);
    setScheduleDraft(slotsToDraftBlocks(enrollment.schedule ?? []));
  }, [enrollment]);

  useEffect(() => {
    setLocalEvents(events);
  }, [events]);

  const description = useMemo(() => buildDescription(localEnrollment), [localEnrollment]);

  const sortedEvents = useMemo(
    () =>
      [...localEvents].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      ),
    [localEvents]
  );

  const patchEnrollment = async (patch: Partial<Enrollment>) => {
    if (!isAdmin) return { ok: false, error: "Sin permisos de edición." };
    setSavingEnrollment(true);
    try {
      const response = await fetch(`/api/enrollments/${localEnrollment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        return {
          ok: false,
          error: data?.error ?? "No se pudieron guardar los cambios."
        };
      }
      setLocalEnrollment((prev) => {
        const merged = {
          ...prev,
          ...data.enrollment,
          schedule: Array.isArray(data.enrollment?.schedule)
            ? data.enrollment.schedule
            : prev.schedule
        } satisfies Enrollment;
        onEnrollmentChange?.(merged);
        return merged;
      });
      router.refresh();
      return { ok: true };
    } finally {
      setSavingEnrollment(false);
    }
  };

  const updateScheduleSlot = (
    index: number,
    patch: Partial<ScheduleBlockDraft>
  ) => {
    setScheduleDraft((prev) =>
      prev.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, ...patch } : slot
      )
    );
  };

  const toggleDayInBlock = (index: number, day: EnrollmentScheduleDay) => {
    setScheduleDraft((prev) =>
      prev.map((slot, slotIndex) => {
        if (slotIndex !== index) return slot;
        const exists = slot.days.includes(day);
        const nextDays = exists
          ? slot.days.filter((item) => item !== day)
          : [...slot.days, day];
        return {
          ...slot,
          days: sortScheduleDays(nextDays)
        };
      })
    );
  };

  const addScheduleSlot = () => {
    setScheduleDraft((prev) => [
      ...prev,
      {
        days: ["lun"],
        start_time: "08:00",
        end_time: "10:00",
        location: null
      }
    ]);
    setScheduleError("");
  };

  const removeScheduleSlot = (index: number) => {
    setScheduleDraft((prev) => prev.filter((_, slotIndex) => slotIndex !== index));
    setScheduleError("");
  };

  const handleSaveSchedule = async () => {
    if (!isAdmin) return;
    const validationError = validateScheduleBlocks(scheduleDraft);
    if (validationError) {
      setScheduleError(validationError);
      return;
    }

    const normalized = draftBlocksToSlots(scheduleDraft);

    setScheduleError("");
    setScheduleDraft(slotsToDraftBlocks(normalized));
    const result = await patchEnrollment({ schedule: normalized });
    if (!result?.ok) {
      setScheduleError(result?.error ?? "No se pudo guardar el horario.");
    }
  };

  const handleCreateEvent = async () => {
    if (!isAdmin || !eventForm.starts_at) return;
    const payload = buildEventPayload({
      enrollmentId: localEnrollment.id,
      form: eventForm
    });
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return;
    const data = await response.json();
    setLocalEvents((prev) => {
      const updated = [...prev, data.event];
      onEventsChange?.(updated);
      return updated;
    });
    setEventForm(EMPTY_EVENT_FORM);
    setCreating(false);
    router.refresh();
  };

  const openEdit = (event: Event) => {
    setEditingId(event.id);
    setEditingLinks(event.links);
    const primaryLink = getPrimaryEventLinkDraft(event.links);
    setEditingForm(buildEventForm(event, primaryLink));
  };

  const closeEdit = () => {
    setEditingId(null);
    setEditingLinks(null);
    setEditingForm(EMPTY_EVENT_FORM);
  };

  const handleUpdateEvent = async () => {
    if (!isAdmin || !editingId || !editingForm.starts_at) return;
    const payload = buildEventPayload({
      enrollmentId: localEnrollment.id,
      form: editingForm,
      existingLinks: editingLinks
    });
    const response = await fetch(`/api/events/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return;
    const data = await response.json();
    setLocalEvents((prev) => {
      const updated = prev.map((event) =>
        event.id === editingId ? data.event : event
      );
      onEventsChange?.(updated);
      return updated;
    });
    closeEdit();
    router.refresh();
  };

  const handleDeleteEvent = async (id: string) => {
    if (!isAdmin) return;
    const response = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setLocalEvents((prev) => {
      const updated = prev.filter((event) => event.id !== id);
      onEventsChange?.(updated);
      return updated;
    });
    router.refresh();
  };

  return (
    <Dialog>
      <DialogTrigger asChild disabled={!interactive}>{trigger}</DialogTrigger>
      <DialogContent className="h-[90svh] w-[96vw] max-w-6xl overflow-hidden rounded-[1.75rem] border border-border/75 bg-surface p-0 sm:h-[88svh] sm:w-[95vw] sm:rounded-[2.1rem]">
        <div className="flex h-full flex-col">
          <DialogHeader className="border-b border-border/60 px-4 py-4 sm:px-7 sm:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Ficha de materia</p>
                <DialogTitle className="mt-1 text-2xl font-semibold font-display text-text">
                  {localEnrollment.subject.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Espacio para revisar la materia, su cronología y la información de cursada con un layout adaptado para mobile.
                </DialogDescription>
                <p className="mt-1 font-mono text-xs text-muted">
                  {localEnrollment.subject.code ?? "SIN-COD"} · {localEnrollment.term?.label ?? "Sin cuatrimestre"}
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <Badge className="border-accent/40 bg-accent/10 text-accent">
                  {STATUS_OPTIONS.find((item) => item.value === localEnrollment.status)?.label ?? localEnrollment.status}
                </Badge>
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-full border border-border/70 bg-surface-2 p-2 text-muted transition hover:text-text"
                    aria-label="Cerrar ficha"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </DialogClose>
              </div>
            </div>
          </DialogHeader>

          <div className="grid min-w-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.2fr)]">
            <section className="min-w-0 space-y-4 overflow-y-auto overflow-x-hidden border-b border-border/55 px-4 py-5 sm:px-7 sm:py-6 lg:border-b-0 lg:border-r">
              <div className="rounded-2xl border border-border/60 bg-surface-2/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Descripción base</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{description}</p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-surface-2/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Notas rápidas</p>
                <Textarea
                  value={localEnrollment.notes ?? ""}
                  onChange={(event) =>
                    setLocalEnrollment((prev) => ({ ...prev, notes: event.target.value }))
                  }
                  onBlur={(event) => patchEnrollment({ notes: event.target.value || null })}
                  disabled={!isAdmin}
                  placeholder="Anotá reglas de cátedra, prioridades, links o recordatorios."
                  className="mt-2"
                />
              </div>

              <div className="rounded-2xl border border-border/60 bg-surface-2/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted">Estado y color</p>
                <div className="mt-3 grid gap-3">
                  <Select
                    value={localEnrollment.status}
                    disabled={!isAdmin || savingEnrollment}
                    onChange={(event) => {
                      const status = event.target.value;
                      setLocalEnrollment((prev) => ({ ...prev, status }));
                      void patchEnrollment({ status });
                    }}
                  >
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </Select>
                  <ColorPalette
                    value={localEnrollment.color ?? SUBJECT_COLORS[0]}
                    disabled={!isAdmin}
                    onChange={(value) => {
                      setLocalEnrollment((prev) => ({ ...prev, color: value }));
                      void patchEnrollment({ color: value });
                    }}
                  />
                </div>
                {!isAdmin ? (
                  <p className="mt-2 text-xs text-muted">Modo visualización: sin permisos de edición.</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-border/60 bg-surface-2/60 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-muted">Horario semanal</p>
                  <span className="text-[11px] text-muted">
                    {scheduleDraft.length} bloque{scheduleDraft.length === 1 ? "" : "s"}
                  </span>
                </div>

                {scheduleDraft.length === 0 ? (
                  <p className="mt-3 text-xs text-muted">Sin bloques cargados para esta cursada.</p>
                ) : null}
                <p className="mt-2 text-xs text-muted">
                  Podés elegir varios días en el mismo bloque para evitar duplicar horarios.
                </p>

                <div className="mt-3 space-y-2">
                  {scheduleDraft.map((slot, index) => (
                    <div
                      key={`${slot.start_time}-${slot.end_time}-${index}`}
                      className="space-y-2 overflow-hidden rounded-xl border border-border/60 bg-surface p-2"
                    >
                      <div className="flex flex-wrap gap-2">
                        {SCHEDULE_DAY_OPTIONS.map((option) => {
                          const active = slot.days.includes(option.value);
                          return (
                            <button
                              key={option.value}
                              type="button"
                              disabled={!isAdmin || savingEnrollment}
                              onClick={() => toggleDayInBlock(index, option.value)}
                              className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                                active
                                  ? "border-accent/45 bg-accent/12 text-accent"
                                  : "border-border/60 bg-surface-2/70 text-muted"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          type="time"
                          step={300}
                          value={slot.start_time}
                          className="font-mono text-[13px] tabular-nums"
                          disabled={!isAdmin || savingEnrollment}
                          onChange={(event) =>
                            updateScheduleSlot(index, { start_time: event.target.value })
                          }
                        />
                        <Input
                          type="time"
                          step={300}
                          value={slot.end_time}
                          className="font-mono text-[13px] tabular-nums"
                          disabled={!isAdmin || savingEnrollment}
                          onChange={(event) =>
                            updateScheduleSlot(index, { end_time: event.target.value })
                          }
                        />
                        <Input
                          value={slot.location ?? ""}
                          disabled={!isAdmin || savingEnrollment}
                          onChange={(event) =>
                            updateScheduleSlot(index, { location: event.target.value })
                          }
                          placeholder="Aula o modalidad"
                        />
                        {isAdmin ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="sm:col-span-2 sm:justify-self-end"
                            onClick={() => removeScheduleSlot(index)}
                            disabled={savingEnrollment}
                          >
                            Quitar
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>

                {isAdmin ? (
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addScheduleSlot}
                      disabled={savingEnrollment}
                    >
                      Agregar bloque
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleSaveSchedule}
                      disabled={savingEnrollment}
                    >
                      {savingEnrollment ? "Guardando..." : "Guardar horario"}
                    </Button>
                  </div>
                ) : null}

                {scheduleError ? (
                  <p className="mt-2 text-xs text-danger">{scheduleError}</p>
                ) : null}
              </div>
            </section>

            <section className="flex min-h-0 min-w-0 flex-col overflow-hidden px-4 py-5 sm:px-7 sm:py-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-muted">Cronología</p>
                  <h3 className="text-lg font-semibold text-text">TPs, parciales y finales</h3>
                </div>
                {isAdmin ? (
                  <Button size="sm" variant={creating ? "outline" : "default"} onClick={() => setCreating((prev) => !prev)}>
                    {creating ? "Cerrar" : "Nuevo evento"}
                  </Button>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {creating ? (
                  <div className="mb-4 rounded-2xl border border-border/60 bg-surface-2/60 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Nuevo evento</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <Select
                        value={eventForm.type}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, type: event.target.value }))}
                      >
                        {EVENT_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={eventForm.title}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder="Título"
                      />
                      <Input
                        type="datetime-local"
                        value={eventForm.starts_at}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, starts_at: event.target.value }))}
                      />
                      <Input
                        type="datetime-local"
                        value={eventForm.ends_at}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, ends_at: event.target.value }))}
                      />
                      <Input
                        type="number"
                        min={0}
                        max={10}
                        value={eventForm.grade}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, grade: event.target.value }))}
                        placeholder="Nota (opcional, al completar)"
                      />
                      <Input
                        value={eventForm.status}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, status: event.target.value }))}
                        placeholder="Estado (opcional)"
                      />
                      <Input
                        value={eventForm.linkUrl}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, linkUrl: event.target.value }))}
                        placeholder="Link"
                      />
                      <Input
                        value={eventForm.linkLabel}
                        onChange={(event) => setEventForm((prev) => ({ ...prev, linkLabel: event.target.value }))}
                        placeholder="Etiqueta del link"
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-muted">
                      Tip: podés crear el TP/parcial ahora y cargar la nota más adelante cuando esté corregido.
                    </p>
                    <Textarea
                      value={eventForm.description}
                      onChange={(event) => setEventForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="Descripción o consigna"
                      className="mt-3"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button size="sm" onClick={handleCreateEvent} disabled={!eventForm.starts_at}>
                        Guardar evento
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3 pb-1">
                  {sortedEvents.length === 0 ? (
                    <div className="rounded-2xl border border-border/60 bg-surface-2/60 p-4 text-sm text-muted">
                      No hay eventos cargados para esta materia.
                    </div>
                  ) : (
                    sortedEvents.map((event) => {
                      const isEditing = editingId === event.id;
                      return (
                        <article key={event.id} className="rounded-2xl border border-border/60 bg-surface-2/60 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-text">
                              {event.title ?? EVENT_TYPE_LABELS[event.type] ?? event.type}
                            </p>
                            <p className="mt-1 text-xs text-muted">{formatDateTime(event.starts_at)}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="border-border/60 bg-surface px-2 py-0.5 text-[10px] text-muted">
                              {EVENT_TYPE_LABELS[event.type] ?? event.type}
                            </Badge>
                            {isAdmin ? (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => openEdit(event)}>
                                  Editar
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteEvent(event.id)}>
                                  Borrar
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {event.description ? <p className="mt-2 text-sm text-muted">{event.description}</p> : null}
                        {event.links?.length ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {event.links.map((link) => (
                              <a
                                key={`${event.id}-${link.url}`}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-full border border-border/60 px-2 py-1 text-[11px] text-accent"
                              >
                                {link.label}
                              </a>
                            ))}
                          </div>
                        ) : null}

                        {isEditing ? (
                          <div className="mt-3 rounded-2xl border border-border/60 bg-surface p-3">
                            <div className="grid gap-3 md:grid-cols-2">
                              <Select
                                value={editingForm.type}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({ ...prev, type: event.target.value }))
                                }
                              >
                                {EVENT_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </Select>
                              <Input
                                value={editingForm.title}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({ ...prev, title: event.target.value }))
                                }
                                placeholder="Título"
                              />
                              <Input
                                type="datetime-local"
                                value={editingForm.starts_at}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({ ...prev, starts_at: event.target.value }))
                                }
                              />
                              <Input
                                type="datetime-local"
                                value={editingForm.ends_at}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({ ...prev, ends_at: event.target.value }))
                                }
                              />
                            <Input
                              type="number"
                              min={0}
                              max={10}
                              value={editingForm.grade}
                              onChange={(event) =>
                                setEditingForm((prev) => ({ ...prev, grade: event.target.value }))
                              }
                              placeholder="Nota (opcional)"
                            />
                              <Input
                                value={editingForm.status}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({ ...prev, status: event.target.value }))
                                }
                                placeholder="Estado"
                              />
                            </div>
                            <Textarea
                              value={editingForm.description}
                              onChange={(event) =>
                                setEditingForm((prev) => ({ ...prev, description: event.target.value }))
                              }
                              placeholder="Descripción"
                              className="mt-3"
                            />
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <Input
                                value={editingForm.linkUrl}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({ ...prev, linkUrl: event.target.value }))
                                }
                                placeholder="Link"
                              />
                              <Input
                                value={editingForm.linkLabel}
                                onChange={(event) =>
                                  setEditingForm((prev) => ({ ...prev, linkLabel: event.target.value }))
                                }
                                placeholder="Etiqueta"
                              />
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={closeEdit}>
                                Cancelar
                              </Button>
                              <Button size="sm" onClick={handleUpdateEvent}>
                                Guardar cambios
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </article>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
