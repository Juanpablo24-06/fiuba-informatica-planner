"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Enrollment, Event, EvaluationTemplate, Subject } from "@/lib/types";
import { formatEvaluationTemplate } from "@/lib/templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ColorPalette, SUBJECT_COLORS } from "@/components/ui/color-palette";

const STATUS_LABELS: Record<string, string> = {
  cursando: "Cursando",
  final_pendiente: "Final pendiente",
  aprobado: "Aprobado",
  recursar: "Recursar"
};

const STATUS_COLORS: Record<string, string> = {
  cursando: "bg-accent/10 text-accent",
  final_pendiente: "bg-warning/10 text-warning",
  aprobado: "bg-success/10 text-success",
  recursar: "bg-danger/10 text-danger"
};

const CATEGORY_LABELS: Record<string, string> = {
  software: "Software",
  matematica: "Matemática",
  hardware: "Hardware"
};

const CYCLE_LABELS: Record<string, string> = {
  cbc: "CBC",
  segundo: "Ciclo profesional"
};

type TemplateNumberKey = "tps" | "parciales" | "recuperatorios" | "defensas" | "finales";

const TEMPLATE_FIELDS: Array<{ key: TemplateNumberKey; label: string }> = [
  { key: "tps", label: "TPs" },
  { key: "parciales", label: "Parciales" },
  { key: "recuperatorios", label: "Recuperatorios" },
  { key: "defensas", label: "Defensas" },
  { key: "finales", label: "Finales" }
];

const buildDraft = (template?: EvaluationTemplate | null) => ({
  tps: template?.tps?.toString() ?? "",
  parciales: template?.parciales?.toString() ?? "",
  recuperatorios: template?.recuperatorios?.toString() ?? "",
  defensas: template?.defensas?.toString() ?? "",
  finales: template?.finales?.toString() ?? "",
  promocion: Boolean(template?.promocion),
  notas: template?.notas ?? ""
});

function TemplateEditor({
  template,
  onSave
}: {
  template?: EvaluationTemplate | null;
  onSave: (template: EvaluationTemplate | null) => void;
}) {
  const [draft, setDraft] = useState(() => buildDraft(template));

  useEffect(() => {
    setDraft(buildDraft(template));
  }, [template]);

  const handleSave = () => {
    const toNumber = (value: string) => {
      if (!value) return null;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const next: EvaluationTemplate = {};
    TEMPLATE_FIELDS.forEach(({ key }) => {
      const parsed = toNumber(draft[key]);
      if (parsed !== null) {
        next[key] = parsed;
      }
    });

    if (draft.promocion) {
      next.promocion = true;
    }
    if (draft.notas.trim()) {
      next.notas = draft.notas.trim();
    }

    onSave(Object.keys(next).length ? next : null);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {TEMPLATE_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label className="text-xs uppercase tracking-[0.2em] text-muted">{label}</label>
            <Input
              type="number"
              min={0}
              value={draft[key]}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, [key]: event.target.value }))
              }
            />
          </div>
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={draft.promocion}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, promocion: event.target.checked }))
          }
        />
        Promoción habilitada
      </label>
      <div>
        <label className="text-xs uppercase tracking-[0.2em] text-muted">Notas</label>
        <Textarea
          value={draft.notas}
          onChange={(event) =>
            setDraft((prev) => ({ ...prev, notas: event.target.value }))
          }
          placeholder="Condiciones especiales, exámenes integradores, etc."
        />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={handleSave}>
        Guardar plantilla
      </Button>
    </div>
  );
}

export default function ActiveSubjects({
  initialEnrollments,
  events = [],
  isAdmin
}: {
  initialEnrollments: Enrollment[];
  events?: Event[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [enrollments, setEnrollments] = useState(initialEnrollments);

  useEffect(() => {
    setEnrollments(initialEnrollments);
  }, [initialEnrollments]);

  const eventsByEnrollment = useMemo(() => {
    const map = new Map<string, Event[]>();
    events.forEach((event) => {
      if (!event.enrollment_id) return;
      if (!map.has(event.enrollment_id)) map.set(event.enrollment_id, []);
      map.get(event.enrollment_id)?.push(event);
    });
    return map;
  }, [events]);

  const handleUpdate = async (id: string, payload: Partial<Enrollment>) => {
    const response = await fetch(`/api/enrollments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return;
    const data = await response.json();
    setEnrollments((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...data.enrollment } : item))
    );
    router.refresh();
  };

  const handleSubjectUpdate = async (subject: Subject, patch: Partial<Subject>) => {
    const response = await fetch(`/api/subjects/${subject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!response.ok) return;
    const data = await response.json();
    setEnrollments((prev) =>
      prev.map((item) =>
        item.subject.id === subject.id ? { ...item, subject: data.subject } : item
      )
    );
    router.refresh();
  };

  const sorted = useMemo(
    () => [...enrollments].sort((a, b) => a.subject.name.localeCompare(b.subject.name)),
    [enrollments]
  );

  return (
    <div className="space-y-3">
      <div className="hidden grid-cols-[1.4fr_0.9fr_0.7fr_0.6fr] gap-3 text-xs uppercase tracking-[0.25em] text-muted md:grid">
        <span>Materia</span>
        <span>Progreso</span>
        <span>Estado</span>
        <span>Categoría</span>
      </div>
      {sorted.map((enrollment) => {
        const subjectEvents = eventsByEnrollment.get(enrollment.id) ?? [];
        const tpsPlanned = enrollment.subject.template?.tps ?? null;
        const parcialesPlanned = enrollment.subject.template?.parciales ?? null;
        const tpsLogged = subjectEvents.filter((event) => event.type === "tp").length;
        const parcialesLogged = subjectEvents.filter((event) => event.type === "parcial").length;
        const recupLogged = subjectEvents.filter((event) => event.type === "recuperatorio").length;
        const finalGrade =
          subjectEvents.find(
            (event) => event.type === "final" && event.grade !== null
          )?.grade ?? null;
        const categoryRaw = enrollment.subject.type?.toLowerCase();
        const category = categoryRaw ? CATEGORY_LABELS[categoryRaw] : null;

        return (
          <div
            key={enrollment.id}
            className="grid gap-3 rounded-3xl border border-white/[0.12] bg-surface/80 p-4 text-sm shadow-tile md:grid-cols-[1.4fr_0.9fr_0.7fr_0.6fr]"
          >
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text">{enrollment.subject.name}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <span
                  className="h-2 w-2 rounded-full border border-white/[0.2]"
                  style={{ backgroundColor: enrollment.color ?? "#a855f7" }}
                />
                <span>{enrollment.subject.code ?? "Sin código"}</span>
                {enrollment.subject.cycle ? (
                  <Badge className="bg-white/[0.04] text-muted">
                    {CYCLE_LABELS[enrollment.subject.cycle] ?? enrollment.subject.cycle}
                  </Badge>
                ) : null}
              </div>
              {enrollment.notes ? (
                <p className="text-xs text-muted">{enrollment.notes}</p>
              ) : null}
              {enrollment.subject.template ? (
                <p className="text-[11px] text-muted">
                  Plantilla: {formatEvaluationTemplate(enrollment.subject.template)}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge className="bg-accent/10 text-accent border-accent/40">
                TPs {tpsLogged}{tpsPlanned ? `/${tpsPlanned}` : ""}
              </Badge>
              <Badge className="bg-accent-2/10 text-accent-2 border-accent-2/40">
                Parciales {parcialesLogged}{parcialesPlanned ? `/${parcialesPlanned}` : ""}
              </Badge>
              {recupLogged ? (
                <Badge className="bg-warning/10 text-warning border-warning/40">
                  Recup {recupLogged}
                </Badge>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge className={STATUS_COLORS[enrollment.status] ?? ""}>
                {STATUS_LABELS[enrollment.status] ?? enrollment.status}
              </Badge>
              {finalGrade !== null ? (
                <span className="rounded-full border border-white/[0.1] bg-white/[0.03] px-2 py-0.5 text-[11px] text-muted">
                  Final {finalGrade}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted md:justify-end">
              <span className="rounded-full border border-white/[0.12] bg-surface/80 px-2 py-0.5">
                {category ?? "Sin categoría"}
              </span>
              {isAdmin ? (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Editar materia activa</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs uppercase tracking-[0.2em] text-muted">Estado</label>
                        <Select
                          defaultValue={enrollment.status}
                          onChange={(event) =>
                            handleUpdate(enrollment.id, { status: event.target.value })
                          }
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-[0.2em] text-muted">Color</label>
                          <ColorPalette
                            value={enrollment.color ?? SUBJECT_COLORS[0]}
                            onChange={(value) => handleUpdate(enrollment.id, { color: value })}
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-[0.2em] text-muted">Notas</label>
                          <Textarea
                            defaultValue={enrollment.notes ?? ""}
                          onBlur={(event) =>
                            handleUpdate(enrollment.id, { notes: event.target.value })
                          }
                            placeholder="Agregar observaciones"
                          />
                        </div>
                        <div className="rounded-3xl border border-white/[0.12] bg-surface/80 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted">
                            Plantilla de evaluación
                          </p>
                          <div className="mt-3">
                            <TemplateEditor
                              template={enrollment.subject.template}
                              onSave={(template) =>
                                handleSubjectUpdate(enrollment.subject, { template })
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline" type="button">
                            Listo
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ) : (
                <span className="text-[11px] text-muted">Solo lectura</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
