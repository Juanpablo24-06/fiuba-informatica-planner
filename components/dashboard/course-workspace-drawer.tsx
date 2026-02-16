"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Enrollment, Event } from "@/lib/types";
import { formatDateTime } from "@/lib/date";
import { formatEvaluationTemplate } from "@/lib/templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorPalette, SUBJECT_COLORS } from "@/components/ui/color-palette";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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

type EventForm = {
  type: string;
  title: string;
  description: string;
  starts_at: string;
  ends_at: string;
  grade: string;
  status: string;
  attempt: string;
  linkLabel: string;
  linkUrl: string;
};

const emptyEventForm: EventForm = {
  type: "tp",
  title: "",
  description: "",
  starts_at: "",
  ends_at: "",
  grade: "",
  status: "",
  attempt: "1",
  linkLabel: "",
  linkUrl: ""
};

const toDatetimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const toIso = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const buildDescription = (enrollment: Enrollment) => {
  const subject = enrollment.subject;
  const lines: string[] = [];

  if (subject.template?.notas) {
    lines.push(subject.template.notas.trim());
  }

  if (subject.requirements?.length) {
    lines.push(`Requisitos generales: ${subject.requirements.join(" · ")}.`);
  }

  const meta: string[] = [];
  if (subject.credits) meta.push(`${subject.credits} créditos`);
  if (subject.weekly_hours) meta.push(`${subject.weekly_hours} h semanales`);
  if (subject.total_hours) meta.push(`${subject.total_hours} h totales`);
  if (subject.term_suggested) meta.push(`sugerida en cuatrimestre ${subject.term_suggested}`);
  if (meta.length) {
    lines.push(`Datos de cátedra: ${meta.join(" · ")}.`);
  }

  if (subject.template) {
    lines.push(`Plantilla de evaluación: ${formatEvaluationTemplate(subject.template)}.`);
  }

  return lines.length
    ? lines.join("\n\n")
    : "No hay descripción de plantilla cargada para esta materia. Podés sumar contexto en tus notas personales.";
};

export type CourseWorkspaceModel = {
  enrollment: Enrollment;
  events: Event[];
};

export default function CourseWorkspaceDrawer({
  enrollment,
  events,
  isAdmin,
  trigger
}: {
  enrollment: Enrollment;
  events: Event[];
  isAdmin: boolean;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [localEnrollment, setLocalEnrollment] = useState(enrollment);
  const [localEvents, setLocalEvents] = useState(events);
  const [savingEnrollment, setSavingEnrollment] = useState(false);
  const [creating, setCreating] = useState(false);
  const [eventForm, setEventForm] = useState<EventForm>(emptyEventForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<EventForm>(emptyEventForm);

  useEffect(() => {
    setLocalEnrollment(enrollment);
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
    if (!isAdmin) return;
    setSavingEnrollment(true);
    try {
      const response = await fetch(`/api/enrollments/${localEnrollment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      if (!response.ok) return;
      const data = await response.json();
      setLocalEnrollment((prev) => ({ ...prev, ...data.enrollment }));
      router.refresh();
    } finally {
      setSavingEnrollment(false);
    }
  };

  const buildEventPayload = (form: EventForm) => ({
    enrollment_id: localEnrollment.id,
    type: form.type,
    title: form.title.trim() || null,
    description: form.description.trim() || null,
    starts_at: toIso(form.starts_at),
    ends_at: toIso(form.ends_at),
    grade: form.grade ? Number(form.grade) : null,
    status: form.status.trim() || null,
    attempt: form.attempt ? Number(form.attempt) : null,
    links: form.linkUrl
      ? [
          {
            label: form.linkLabel.trim() || "Material",
            url: form.linkUrl.trim()
          }
        ]
      : null
  });

  const handleCreateEvent = async () => {
    if (!isAdmin || !eventForm.starts_at) return;
    const payload = buildEventPayload(eventForm);
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return;
    const data = await response.json();
    setLocalEvents((prev) => [...prev, data.event]);
    setEventForm(emptyEventForm);
    setCreating(false);
    router.refresh();
  };

  const openEdit = (event: Event) => {
    setEditingId(event.id);
    setEditingForm({
      type: event.type,
      title: event.title ?? "",
      description: event.description ?? "",
      starts_at: toDatetimeLocal(event.starts_at),
      ends_at: toDatetimeLocal(event.ends_at),
      grade: event.grade !== null ? String(event.grade) : "",
      status: event.status ?? "",
      attempt: event.attempt !== null ? String(event.attempt) : "",
      linkLabel: event.links?.[0]?.label ?? "",
      linkUrl: event.links?.[0]?.url ?? ""
    });
  };

  const handleUpdateEvent = async () => {
    if (!isAdmin || !editingId || !editingForm.starts_at) return;
    const payload = buildEventPayload(editingForm);
    const response = await fetch(`/api/events/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return;
    const data = await response.json();
    setLocalEvents((prev) => prev.map((event) => (event.id === editingId ? data.event : event)));
    setEditingId(null);
    setEditingForm(emptyEventForm);
    router.refresh();
  };

  const handleDeleteEvent = async (id: string) => {
    if (!isAdmin) return;
    const response = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setLocalEvents((prev) => prev.filter((event) => event.id !== id));
    router.refresh();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="h-[88svh] w-[95vw] max-w-6xl overflow-hidden rounded-[2.1rem] border border-border/75 bg-surface p-0">
        <div className="flex h-full flex-col">
          <DialogHeader className="border-b border-border/60 px-7 py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted">Ficha de materia</p>
                <DialogTitle className="mt-1 text-2xl font-semibold font-display text-text">
                  {localEnrollment.subject.name}
                </DialogTitle>
                <p className="mt-1 font-mono text-xs text-muted">
                  {localEnrollment.subject.code ?? "SIN-COD"} · {localEnrollment.term?.label ?? "Sin cuatrimestre"}
                </p>
              </div>
              <div className="flex items-center gap-2">
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

          <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[0.9fr_1.25fr]">
            <section className="space-y-4 overflow-y-auto border-b border-border/55 px-7 py-6 lg:border-b-0 lg:border-r">
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
            </section>

            <section className="flex min-h-0 flex-col overflow-hidden px-7 py-6">
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
                      placeholder="Nota"
                    />
                    <Input
                      value={eventForm.status}
                      onChange={(event) => setEventForm((prev) => ({ ...prev, status: event.target.value }))}
                      placeholder="Estado (ej: entregado)"
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

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
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
                                placeholder="Nota"
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
                              <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
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
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
