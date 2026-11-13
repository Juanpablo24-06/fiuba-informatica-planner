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
const SUBJECT_TYPE_ORDER: Record<string, number> = {
  cbc: 1,
  obligatoria: 2,
  electiva: 3
};
const SORT_OPTIONS = [
  { value: "name", label: "Nombre" },
  { value: "code", label: "Código" },
  { value: "term", label: "Cuatri sugerido" },
  { value: "type", label: "Tipo" }
] as const;

const getEffectiveType = (subject: Subject) => {
  const type = (subject.type ?? "").toLowerCase();
  const cycle = (subject.cycle ?? "").toLowerCase();
  if (type) return type;
  if (cycle === "cbc") return "cbc";
  return "obligatoria";
};

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
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]["value"]>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const visibleSubjects = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const filtered = subjects.filter((subject) => {
      const effectiveType = getEffectiveType(subject);
      if (typeFilter !== "all" && effectiveType !== typeFilter) return false;
      if (!search) return true;
      return [subject.name, subject.code ?? ""].some((value) =>
        value.toLowerCase().includes(search)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "code") {
        return (a.code ?? "").localeCompare(b.code ?? "");
      }
      if (sortBy === "term") {
        return (a.term_suggested ?? 999) - (b.term_suggested ?? 999);
      }
      if (sortBy === "type") {
        return (SUBJECT_TYPE_ORDER[getEffectiveType(a)] ?? 99) - (SUBJECT_TYPE_ORDER[getEffectiveType(b)] ?? 99);
      }
      return a.name.localeCompare(b.name);
    });

    return sortDirection === "desc" ? sorted.reverse() : sorted;
  }, [searchTerm, sortBy, sortDirection, subjects, typeFilter]);

  const typeCounters = useMemo(
    () => ({
      all: subjects.length,
      obligatoria: subjects.filter((subject) => getEffectiveType(subject) === "obligatoria").length,
      cbc: subjects.filter((subject) => getEffectiveType(subject) === "cbc").length,
      electiva: subjects.filter((subject) => getEffectiveType(subject) === "electiva").length
    }),
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

      <section className="rounded-2xl border border-border/75 bg-surface-2 p-4">
        <p className="text-sm font-semibold text-text">Orden y filtros del catálogo</p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nombre o código"
          />
          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="all">Todos los tipos</option>
            {SUBJECT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
          <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as (typeof SORT_OPTIONS)[number]["value"])}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Ordenar por {option.label}
              </option>
            ))}
          </Select>
          <Select
            value={sortDirection}
            onChange={(event) => setSortDirection(event.target.value as "asc" | "desc")}
          >
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
          <span className="rounded-full border border-border/65 bg-surface px-3 py-1">Total: {typeCounters.all}</span>
          <span className="rounded-full border border-border/65 bg-surface px-3 py-1">
            Obligatorias: {typeCounters.obligatoria}
          </span>
          <span className="rounded-full border border-border/65 bg-surface px-3 py-1">CBC: {typeCounters.cbc}</span>
          <span className="rounded-full border border-border/65 bg-surface px-3 py-1">
            Electivas: {typeCounters.electiva}
          </span>
          <span className="rounded-full border border-accent/45 bg-accent/10 px-3 py-1 text-accent">
            Mostrando: {visibleSubjects.length}
          </span>
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
        {visibleSubjects.map((subject) => (
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
              defaultValue={getEffectiveType(subject)}
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
        {visibleSubjects.length === 0 ? (
          <div className="rounded-2xl border border-border/65 bg-surface px-4 py-4 text-sm text-muted">
            No hay materias que coincidan con el filtro actual.
          </div>
        ) : null}
      </section>
    </div>
  );
}
