"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Subject, Term } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

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
  const [newTerm, setNewTerm] = useState({
    label: "",
    start_date: "",
    end_date: "",
    is_current: true
  });
  const [newEnrollment, setNewEnrollment] = useState({
    term_id: currentTerm?.id ?? terms[0]?.id ?? "",
    subject_id: subjects[0]?.id ?? "",
    status: "cursando",
    color: "#38bdf8"
  });
  const canActivate = terms.length > 0 && subjects.length > 0;
  const canCreateTerm = newTerm.label.trim().length > 0;

  const handleCreateTerm = async () => {
    const payload = {
      ...newTerm,
      start_date: newTerm.start_date || null,
      end_date: newTerm.end_date || null
    };
    const response = await fetch("/api/terms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) return;
    router.refresh();
  };

  const handleActivate = async () => {
    const response = await fetch("/api/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        term_id: newEnrollment.term_id,
        subject_id: newEnrollment.subject_id,
        status: newEnrollment.status,
        color: newEnrollment.color
      })
    });
    if (!response.ok) return;
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold">Cuatrimestre actual</p>
        <p className="text-xs text-muted">
          {currentTerm?.label ?? "Sin definir"} · {currentTerm?.start_date ?? ""} {" "}
          {currentTerm?.end_date ? `→ ${currentTerm.end_date}` : ""}
        </p>
      </div>
      {isAdmin ? (
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">Nuevo cuatrimestre</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear cuatrimestre</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={newTerm.label}
                  onChange={(event) =>
                    setNewTerm((prev) => ({ ...prev, label: event.target.value }))
                  }
                  placeholder="2026-1"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <Input
                    type="date"
                    value={newTerm.start_date}
                    onChange={(event) =>
                      setNewTerm((prev) => ({ ...prev, start_date: event.target.value }))
                    }
                  />
                  <Input
                    type="date"
                    value={newTerm.end_date}
                    onChange={(event) =>
                      setNewTerm((prev) => ({ ...prev, end_date: event.target.value }))
                    }
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={newTerm.is_current}
                    onChange={(event) =>
                      setNewTerm((prev) => ({ ...prev, is_current: event.target.checked }))
                    }
                  />
                  Marcar como actual
                </label>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">
                    Cancelar
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button type="button" onClick={handleCreateTerm} disabled={!canCreateTerm}>
                    Guardar
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={!canActivate}>
                Activar materia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Activar materia en cuatrimestre</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted">Cuatrimestre</label>
                  <Select
                    value={newEnrollment.term_id}
                    onChange={(event) =>
                      setNewEnrollment((prev) => ({ ...prev, term_id: event.target.value }))
                    }
                  >
                    {terms.map((term) => (
                      <option key={term.id} value={term.id}>
                        {term.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] text-muted">Materia</label>
                  <Select
                    value={newEnrollment.subject_id}
                    onChange={(event) =>
                      setNewEnrollment((prev) => ({ ...prev, subject_id: event.target.value }))
                    }
                  >
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-muted">Estado</label>
                    <Select
                      value={newEnrollment.status}
                      onChange={(event) =>
                        setNewEnrollment((prev) => ({ ...prev, status: event.target.value }))
                      }
                    >
                      <option value="cursando">Cursando</option>
                      <option value="final_pendiente">Final pendiente</option>
                      <option value="aprobado">Aprobado</option>
                      <option value="recursar">Recursar</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs uppercase tracking-[0.2em] text-muted">Color</label>
                    <Input
                      type="color"
                      value={newEnrollment.color}
                      onChange={(event) =>
                        setNewEnrollment((prev) => ({ ...prev, color: event.target.value }))
                      }
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
                  <Button type="button" onClick={handleActivate}>
                    Activar
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {!canActivate ? (
            <p className="text-xs text-muted">Primero cargá materias y cuatrimestres.</p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted">Gestión disponible solo para admin.</p>
      )}
    </div>
  );
}
