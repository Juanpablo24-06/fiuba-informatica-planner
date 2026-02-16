"use client";

import { useMemo, useState } from "react";
import type { Subject } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const SUBJECT_TYPES = [
  { value: "obligatoria", label: "Obligatoria" },
  { value: "electiva", label: "Electiva" },
  { value: "cbc", label: "CBC" }
] as const;

export default function SubjectManager({
  initialSubjects
}: {
  initialSubjects: Subject[];
}) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [newSubject, setNewSubject] = useState({
    code: "",
    name: "",
    term_suggested: "",
    type: "obligatoria"
  });

  const sortedSubjects = useMemo(
    () => [...subjects].sort((a, b) => a.name.localeCompare(b.name)),
    [subjects]
  );

  const canCreate = newSubject.name.trim().length > 0;

  const handleCreate = async () => {
    const payload = {
      code: newSubject.code || null,
      name: newSubject.name,
      term_suggested: newSubject.term_suggested
        ? Number(newSubject.term_suggested)
        : null,
      type: newSubject.type
    };

    const response = await fetch("/api/subjects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) return;
    const data = await response.json();
    setSubjects((prev) => [...prev, data.subject]);
    setNewSubject({ code: "", name: "", term_suggested: "", type: "obligatoria" });
  };

  const handleUpdate = async (subject: Subject, patch: Partial<Subject>) => {
    const response = await fetch(`/api/subjects/${subject.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!response.ok) return;
    const data = await response.json();
    setSubjects((prev) =>
      prev.map((item) => (item.id === subject.id ? data.subject : item))
    );
  };

  const handleDelete = async (subject: Subject) => {
    const response = await fetch(`/api/subjects/${subject.id}`, { method: "DELETE" });
    if (!response.ok) return;
    setSubjects((prev) => prev.filter((item) => item.id !== subject.id));
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border/75 bg-surface-2 p-4">
        <p className="text-sm font-semibold text-text">Agregar materia al catálogo</p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Input
            value={newSubject.code}
            onChange={(event) =>
              setNewSubject((prev) => ({ ...prev, code: event.target.value }))
            }
            placeholder="Código"
          />
          <Input
            value={newSubject.name}
            onChange={(event) =>
              setNewSubject((prev) => ({ ...prev, name: event.target.value }))
            }
            placeholder="Nombre"
          />
          <Input
            type="number"
            min={1}
            max={12}
            value={newSubject.term_suggested}
            onChange={(event) =>
              setNewSubject((prev) => ({ ...prev, term_suggested: event.target.value }))
            }
            placeholder="Cuatri sugerido"
          />
          <Select
            value={newSubject.type}
            onChange={(event) =>
              setNewSubject((prev) => ({ ...prev, type: event.target.value }))
            }
          >
            {SUBJECT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={handleCreate} size="sm" disabled={!canCreate}>
            Agregar materia
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <div className="grid grid-cols-[0.72fr_1.4fr_0.5fr_0.7fr_0.45fr] gap-2 px-3 text-[11px] uppercase tracking-[0.16em] text-muted">
          <span>Código</span>
          <span>Materia</span>
          <span>Cuatri</span>
          <span>Tipo</span>
          <span />
        </div>
        {sortedSubjects.map((subject) => (
          <div
            key={subject.id}
            className="grid gap-2 rounded-2xl border border-border/75 bg-surface p-3 md:grid-cols-[0.72fr_1.4fr_0.5fr_0.7fr_0.45fr]"
          >
            <Input
              defaultValue={subject.code ?? ""}
              onBlur={(event) => handleUpdate(subject, { code: event.target.value || null })}
            />
            <Input
              defaultValue={subject.name}
              onBlur={(event) => handleUpdate(subject, { name: event.target.value })}
            />
            <Input
              type="number"
              min={1}
              max={12}
              defaultValue={subject.term_suggested ?? ""}
              onBlur={(event) =>
                handleUpdate(subject, {
                  term_suggested: (() => {
                    if (!event.target.value) return null;
                    const value = Number(event.target.value);
                    return Number.isNaN(value) ? null : value;
                  })()
                })
              }
            />
            <Select
              defaultValue={subject.type ?? "obligatoria"}
              onChange={(event) => handleUpdate(subject, { type: event.target.value })}
            >
              {SUBJECT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(subject)}>
              Borrar
            </Button>
          </div>
        ))}
      </section>
    </div>
  );
}
