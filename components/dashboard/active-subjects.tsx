"use client";

import { useMemo, useState } from "react";
import type { Enrollment } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

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

export default function ActiveSubjects({
  initialEnrollments,
  isAdmin
}: {
  initialEnrollments: Enrollment[];
  isAdmin: boolean;
}) {
  const [enrollments, setEnrollments] = useState(initialEnrollments);

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
  };

  const sorted = useMemo(
    () =>
      [...enrollments].sort((a, b) =>
        a.subject.name.localeCompare(b.subject.name)
      ),
    [enrollments]
  );

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sorted.map((enrollment) => (
        <div
          key={enrollment.id}
          className="rounded-2xl border border-border/60 bg-surface/70 p-4 shadow-tile"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{enrollment.subject.name}</p>
              <p className="text-xs text-muted">{enrollment.subject.code ?? "Sin código"}</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: enrollment.color ?? "#38bdf8" }}
              />
              <Badge className={STATUS_COLORS[enrollment.status] ?? ""}>
                {STATUS_LABELS[enrollment.status] ?? enrollment.status}
              </Badge>
            </div>
          </div>
          {enrollment.notes ? (
            <p className="mt-3 text-xs text-muted">{enrollment.notes}</p>
          ) : (
            <p className="mt-3 text-xs text-muted">Sin notas aún.</p>
          )}
          {enrollment.subject.template ? (
            <div className="mt-3 text-[11px] text-muted">
              <span className="font-semibold text-text">Plantilla:</span> {" "}
              {Object.entries(enrollment.subject.template)
                .map(([key, value]) => `${key}: ${value}`)
                .join(" · ")}
            </div>
          ) : null}
          {isAdmin ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="mt-4">
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
                    <Input
                      type="color"
                      defaultValue={enrollment.color ?? "#38bdf8"}
                      onChange={(event) =>
                        handleUpdate(enrollment.id, { color: event.target.value })
                      }
                      className="h-12"
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
            <p className="mt-4 text-xs text-muted">Solo lectura para usuarios.</p>
          )}
        </div>
      ))}
    </div>
  );
}
