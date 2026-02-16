"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Subject, Term } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorPalette, SUBJECT_COLORS } from "@/components/ui/color-palette";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

type WizardStep = 1 | 2 | 3 | 4;

const STATUS_OPTIONS = [
  { value: "cursando", label: "Cursando" },
  { value: "final_pendiente", label: "Final pendiente" },
  { value: "aprobado", label: "Aprobado" },
  { value: "recursar", label: "Recursar" }
] as const;

const formatTermRange = (term: Term | null) => {
  if (!term) return "Sin definir";
  const start = term.start_date ?? "";
  const end = term.end_date ? `→ ${term.end_date}` : "";
  return `${term.label}${start ? ` · ${start}` : ""} ${end}`.trim();
};

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) =>
  aStart.getTime() <= bEnd.getTime() && bStart.getTime() <= aEnd.getTime();

export default function TermManager({
  currentTerm,
  terms,
  subjects,
  isAdmin
}: {
  currentTerm: Term | null;
  terms: Term[];
  subjects: Subject[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Term | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const [newTerm, setNewTerm] = useState({
    label: "",
    start_date: "",
    end_date: "",
    is_current: true
  });

  const [activation, setActivation] = useState({
    status: "cursando",
    color: SUBJECT_COLORS[0],
    subjectIds: [] as string[]
  });

  const validation = useMemo(() => {
    const messages: string[] = [];
    const overlapLabels: string[] = [];

    if (!newTerm.label.trim()) {
      messages.push("Completá el nombre del cuatrimestre.");
    }

    if (newTerm.start_date && newTerm.end_date) {
      const start = new Date(newTerm.start_date);
      const end = new Date(newTerm.end_date);
      if (start.getTime() > end.getTime()) {
        messages.push("La fecha de inicio no puede ser mayor a la fecha de fin.");
      } else {
        for (const term of terms) {
          if (!term.start_date || !term.end_date) continue;
          if (
            overlaps(start, end, new Date(term.start_date), new Date(term.end_date))
          ) {
            overlapLabels.push(term.label);
          }
        }
      }
    }

    if (overlapLabels.length) {
      messages.push(`Se detecta solapamiento con: ${overlapLabels.join(", ")}.`);
    }

    return {
      valid: messages.length === 0,
      messages
    };
  }, [newTerm.end_date, newTerm.label, newTerm.start_date, terms]);

  const resetWizard = () => {
    setWizardStep(1);
    setNewTerm({ label: "", start_date: "", end_date: "", is_current: true });
    setActivation({ status: "cursando", color: SUBJECT_COLORS[0], subjectIds: [] });
  };

  const handleSetCurrent = async (termId: string) => {
    const response = await fetch(`/api/terms/${termId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_current: true })
    });
    if (!response.ok) return;
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirm !== deleteTarget.label) return;
    const response = await fetch(`/api/terms/${deleteTarget.id}`, { method: "DELETE" });
    if (!response.ok) return;
    setDeleteTarget(null);
    setDeleteConfirm("");
    router.refresh();
  };

  const finishWizard = async () => {
    if (!validation.valid || !isAdmin) return;
    setPending(true);
    try {
      const response = await fetch("/api/terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTerm,
          label: newTerm.label.trim(),
          start_date: newTerm.start_date || null,
          end_date: newTerm.end_date || null
        })
      });
      if (!response.ok) return;
      const data = await response.json();
      const termId = data?.term?.id as string | undefined;
      if (!termId) return;

      for (const subjectId of activation.subjectIds) {
        await fetch("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            term_id: termId,
            subject_id: subjectId,
            status: activation.status,
            color: activation.color
          })
        });
      }

      setWizardOpen(false);
      resetWizard();
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setActivation((prev) => {
      const exists = prev.subjectIds.includes(subjectId);
      return {
        ...prev,
        subjectIds: exists
          ? prev.subjectIds.filter((id) => id !== subjectId)
          : [...prev.subjectIds, subjectId]
      };
    });
  };

  const canNextFromStep1 = newTerm.label.trim().length > 0;
  const canNextFromStep2 = validation.valid;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text">Cuatrimestre actual</p>
          <p className="text-xs text-muted">{formatTermRange(currentTerm)}</p>
        </div>

        {isAdmin ? (
          <Dialog
            open={wizardOpen}
            onOpenChange={(open) => {
              setWizardOpen(open);
              if (!open) resetWizard();
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm">Asistente de cuatrimestre</Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Crear cuatrimestre con asistente</DialogTitle>
              </DialogHeader>

              <div className="rounded-2xl border border-border/60 bg-surface-2/50 px-4 py-3 text-xs text-muted">
                Paso {wizardStep} de 4
              </div>

              {wizardStep === 1 ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">1) Datos base</p>
                  <Input
                    value={newTerm.label}
                    onChange={(event) => setNewTerm((prev) => ({ ...prev, label: event.target.value }))}
                    placeholder="Ej: 2026-1"
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-muted">Inicio</label>
                      <Input
                        type="date"
                        value={newTerm.start_date}
                        onChange={(event) =>
                          setNewTerm((prev) => ({ ...prev, start_date: event.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-muted">Fin</label>
                      <Input
                        type="date"
                        value={newTerm.end_date}
                        onChange={(event) => setNewTerm((prev) => ({ ...prev, end_date: event.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {wizardStep === 2 ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">2) Validaciones</p>
                  {validation.messages.length === 0 ? (
                    <div className="rounded-2xl border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
                      Fechas y estructura válidas. Podés continuar.
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-warning/45 bg-warning/10 px-4 py-3 text-sm text-warning">
                      <p className="font-semibold">Ajustes pendientes:</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        {validation.messages.map((message) => (
                          <li key={message}>{message}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}

              {wizardStep === 3 ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">3) Configuración y materias</p>
                  <label className="flex items-center gap-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={newTerm.is_current}
                      onChange={(event) =>
                        setNewTerm((prev) => ({ ...prev, is_current: event.target.checked }))
                      }
                    />
                    Marcar este cuatrimestre como actual
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-muted">Estado inicial</label>
                      <Select
                        value={activation.status}
                        onChange={(event) =>
                          setActivation((prev) => ({ ...prev, status: event.target.value }))
                        }
                      >
                        {STATUS_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>
                            {item.label}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs uppercase tracking-[0.2em] text-muted">Color inicial</label>
                      <ColorPalette
                        value={activation.color}
                        onChange={(value) => setActivation((prev) => ({ ...prev, color: value }))}
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-surface/70 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Materias a activar</p>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setActivation((prev) => ({ ...prev, subjectIds: subjects.map((subject) => subject.id) }))
                          }
                        >
                          Todas
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setActivation((prev) => ({ ...prev, subjectIds: [] }))}
                        >
                          Ninguna
                        </Button>
                      </div>
                    </div>

                    <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                      {subjects.map((subject) => {
                        const checked = activation.subjectIds.includes(subject.id);
                        return (
                          <label
                            key={subject.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border/55 bg-surface-2/60 px-3 py-2 text-sm"
                          >
                            <span>{subject.name}</span>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSubject(subject.id)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : null}

              {wizardStep === 4 ? (
                <div className="space-y-3 rounded-2xl border border-border/60 bg-surface-2/60 p-4 text-sm">
                  <p className="text-sm font-semibold text-text">4) Confirmación</p>
                  <p><span className="font-semibold">Cuatrimestre:</span> {newTerm.label || "-"}</p>
                  <p><span className="font-semibold">Fechas:</span> {newTerm.start_date || "sin inicio"} {newTerm.end_date ? `→ ${newTerm.end_date}` : ""}</p>
                  <p><span className="font-semibold">Marcar como actual:</span> {newTerm.is_current ? "Sí" : "No"}</p>
                  <p><span className="font-semibold">Materias a activar:</span> {activation.subjectIds.length}</p>
                </div>
              ) : null}

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">
                    Cancelar
                  </Button>
                </DialogClose>
                <div className="flex items-center gap-2">
                  {wizardStep > 1 ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setWizardStep((prev) => (prev - 1) as WizardStep)}
                    >
                      Atrás
                    </Button>
                  ) : null}
                  {wizardStep < 4 ? (
                    <Button
                      type="button"
                      onClick={() => setWizardStep((prev) => (prev + 1) as WizardStep)}
                      disabled={
                        (wizardStep === 1 && !canNextFromStep1) ||
                        (wizardStep === 2 && !canNextFromStep2)
                      }
                    >
                      Siguiente
                    </Button>
                  ) : (
                    <Button type="button" onClick={finishWizard} disabled={pending || !validation.valid}>
                      {pending ? "Creando..." : "Crear cuatrimestre"}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <p className="text-xs text-muted">Gestión disponible solo para admin.</p>
        )}
      </div>

      <div className="rounded-3xl border border-border/60 bg-surface/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-text">Cuatrimestres cargados</p>
          {isAdmin ? <p className="text-xs text-muted">Eliminar borra materias activas y eventos asociados.</p> : null}
        </div>

        <div className="mt-3 space-y-2">
          {terms.length === 0 ? (
            <p className="text-xs text-muted">No hay cuatrimestres creados.</p>
          ) : (
            terms.map((term) => (
              <div
                key={term.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-surface-2/60 px-3 py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-text">{term.label}</p>
                  <p className="text-xs text-muted">
                    {term.start_date ?? "Sin fecha"}
                    {term.end_date ? ` → ${term.end_date}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {term.is_current ? (
                    <Badge className="border-accent/40 bg-accent/10 text-accent">Actual</Badge>
                  ) : isAdmin ? (
                    <Button variant="outline" size="sm" onClick={() => handleSetCurrent(term.id)}>
                      Marcar actual
                    </Button>
                  ) : null}
                  {isAdmin ? (
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(term)}>
                      Eliminar
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirm("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar cuatrimestre</DialogTitle>
          </DialogHeader>
          {deleteTarget ? (
            <div className="space-y-3 text-sm text-muted">
              <p>
                Esta acción elimina <span className="text-text">{deleteTarget.label}</span>,
                sus materias activas y todos sus eventos.
              </p>
              <p>
                Para confirmar, escribí exactamente: <span className="font-semibold text-text">{deleteTarget.label}</span>
              </p>
              <Input
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                placeholder="Escribí el nombre del cuatrimestre"
              />
            </div>
          ) : null}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleDelete} disabled={!deleteTarget || deleteConfirm !== deleteTarget.label}>
              Confirmar borrado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
