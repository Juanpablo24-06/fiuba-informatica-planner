"use client";

import { useMemo, useState } from "react";
import type { Enrollment, Event } from "@/lib/types";
import { formatDateTime } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const EVENT_TYPES = [
  "parcial",
  "recuperatorio",
  "tp",
  "defensa",
  "final",
  "clase",
  "otro"
] as const;

export default function EventManager({
  enrollments,
  initialEvents,
  isAdmin
}: {
  enrollments: Enrollment[];
  initialEvents: Event[];
  isAdmin: boolean;
}) {
  const [events, setEvents] = useState(initialEvents);
  const [form, setForm] = useState({
    enrollment_id: enrollments[0]?.id ?? "",
    type: "parcial",
    title: "",
    description: "",
    starts_at: "",
    ends_at: "",
    grade: "",
    status: "",
    attempt: "1",
    linkLabel: "",
    linkUrl: ""
  });

  const sorted = useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      ),
    [events]
  );
  const canCreate = isAdmin && enrollments.length > 0;

  const handleCreate = async () => {
    const toIso = (value: string) => new Date(value).toISOString();
    const payload = {
      enrollment_id: form.enrollment_id,
      type: form.type,
      title: form.title || null,
      description: form.description || null,
      starts_at: toIso(form.starts_at),
      ends_at: form.ends_at ? toIso(form.ends_at) : null,
      grade: form.grade ? Number(form.grade) : null,
      status: form.status || null,
      attempt: form.attempt ? Number(form.attempt) : null,
      links: form.linkUrl
        ? [{ label: form.linkLabel || "Material", url: form.linkUrl }]
        : null
    };

    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return;
    const data = await response.json();
    setEvents((prev) => [...prev, data.event]);
    setForm((prev) => ({
      ...prev,
      title: "",
      description: "",
      starts_at: "",
      ends_at: "",
      grade: "",
      status: "",
      attempt: "1",
      linkLabel: "",
      linkUrl: ""
    }));
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/events/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Historial de evaluaciones</p>
        {canCreate ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">Nueva evaluación</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar evaluación</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted">Materia activa</label>
                  <Select
                    value={form.enrollment_id}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, enrollment_id: event.target.value }))
                    }
                  >
                    {enrollments.map((enrollment) => (
                      <option key={enrollment.id} value={enrollment.id}>
                        {enrollment.subject.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted">Tipo</label>
                  <Select
                    value={form.type}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, type: event.target.value }))
                    }
                  >
                    {EVENT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted">Titulo</label>
                  <Input
                    value={form.title}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="Parcial 1"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted">Fecha y hora</label>
                  <Input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, starts_at: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted">Descripción</label>
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Temas, modalidad, links"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-muted">Nota</label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={form.grade}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, grade: event.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-muted">Estado</label>
                    <Input
                      value={form.status}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, status: event.target.value }))
                      }
                      placeholder="aprobado"
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-muted">Intento</label>
                    <Input
                      type="number"
                      min={1}
                      value={form.attempt}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, attempt: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-muted">Link</label>
                    <Input
                      value={form.linkUrl}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, linkUrl: event.target.value }))
                      }
                      placeholder="https://drive.google.com/..."
                    />
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-muted">Etiqueta</label>
                    <Input
                      value={form.linkLabel}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, linkLabel: event.target.value }))
                      }
                      placeholder="Apuntes / Enunciado"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">
                    Cancelar
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    type="button"
                    onClick={handleCreate}
                    disabled={!form.starts_at}
                  >
                    Guardar
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : isAdmin ? (
          <span className="text-xs text-muted">Activá materias para agregar eventos.</span>
        ) : null}
      </div>
      <div className="space-y-3">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted">No hay evaluaciones registradas.</p>
        ) : (
          sorted.map((event) => (
            <div
              key={event.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface/70 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-semibold">
                  {event.title ?? event.type} · {event.enrollment?.subject?.name ?? "Materia"}
                </p>
                <p className="text-xs text-muted">
                  {formatDateTime(event.starts_at)}
                  {event.grade !== null ? ` · Nota ${event.grade}` : ""}
                  {event.status ? ` · ${event.status}` : ""}
                  {event.enrollment?.term?.label ? ` · ${event.enrollment.term.label}` : ""}
                </p>
                {event.links?.length ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {event.links.map((link) => (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-border/60 px-2 py-1 text-[10px] text-accent hover:text-accent-2"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
              {isAdmin ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(event.id)}
                >
                  Borrar
                </Button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
