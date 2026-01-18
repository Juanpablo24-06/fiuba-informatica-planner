"use client";

import { useState } from "react";
import type { Subject } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const SUBJECT_TYPES = ["obligatoria", "electiva", "cbc"];

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
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/[0.12] bg-surface/80 p-4">
        <p className="text-sm font-semibold">Crear materia</p>
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
            max={10}
            value={newSubject.term_suggested}
            onChange={(event) =>
              setNewSubject((prev) => ({ ...prev, term_suggested: event.target.value }))
            }
            placeholder="Cuatri"
          />
          <Select
            value={newSubject.type}
            onChange={(event) =>
              setNewSubject((prev) => ({ ...prev, type: event.target.value }))
            }
          >
            {SUBJECT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={handleCreate} size="sm" className="mt-3" disabled={!canCreate}>
          Agregar
        </Button>
      </div>
      <div className="space-y-3">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            className="grid gap-2 rounded-3xl border border-white/[0.12] bg-surface/80 p-4 md:grid-cols-[1fr_1.2fr_0.6fr_0.7fr_auto]"
          >
            <Input
              defaultValue={subject.code ?? ""}
              onBlur={(event) => handleUpdate(subject, { code: event.target.value })}
            />
            <Input
              defaultValue={subject.name}
              onBlur={(event) => handleUpdate(subject, { name: event.target.value })}
            />
            <Input
              type="number"
              min={1}
              max={10}
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
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(subject)}>
              Borrar
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
