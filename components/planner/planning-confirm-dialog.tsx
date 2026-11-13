"use client";

import { useModalFocus } from "@/components/ui/use-modal-focus";

import { Check, Link2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { PlanningSelection, PlanningSubjectOption } from "@/components/planner/planning-types";

type Resolution = "existing" | "create" | "external";
type Props = { selections: PlanningSelection[]; subjectOptions?: PlanningSubjectOption[]; onClose: () => void; onConfirm: (resolutions: Record<string, Resolution>, linkedSubjectIds: Record<string, string | null>) => void; pending?: boolean; error?: string | null };

export default function PlanningConfirmDialog({ selections, subjectOptions = [], onClose, onConfirm, pending = false, error = null }: Props) {
  const focusRef = useModalFocus(true, () => { if (!pending) onClose(); });
  const [resolutions, setResolutions] = useState<Record<string, Resolution>>(() => Object.fromEntries(selections.map((selection) => [selection.id, selection.subjectId ? "existing" : "external"])));
  const [linkedSubjectIds, setLinkedSubjectIds] = useState<Record<string, string | null>>(() => Object.fromEntries(selections.map((selection) => [selection.id, selection.subjectId])));
  useEffect(() => {
    setResolutions(Object.fromEntries(selections.map((selection) => [selection.id, selection.subjectId ? "existing" : "external"])));
    setLinkedSubjectIds(Object.fromEntries(selections.map((selection) => [selection.id, selection.subjectId])));
  }, [selections]);
  const linkableOptions = subjectOptions.filter((option) => Boolean(option.subjectId ?? option.id));
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    <section ref={focusRef} role="dialog" aria-modal="true" aria-labelledby="confirm-plan-title" className="w-full max-w-xl rounded-[1.5rem] border border-border/70 bg-surface p-5 shadow-2xl sm:p-6">
      <header className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-accent">Último paso</p><h2 id="confirm-plan-title" className="mt-1 text-xl font-semibold text-text">Alinear y confirmar plan</h2><p className="mt-1 text-xs leading-5 text-muted">Sólo las materias elegidas se convierten en cursadas. Las actividades y externas quedan en este escenario.</p></div><button type="button" aria-label="Cerrar" onClick={onClose} disabled={pending} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text disabled:opacity-50"><X className="h-4 w-4" /></button></header>
      <div className="context-scrollbar mt-5 max-h-[52svh] space-y-2 overflow-y-auto">{selections.map((selection) => { const selectedSubjectId = linkedSubjectIds[selection.id] ?? null; const canLink = Boolean(selection.subjectId ?? selectedSubjectId); return <div key={selection.id} className="rounded-xl border border-border/50 bg-surface-2/45 p-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selection.color }} /><p className="min-w-0 flex-1 truncate text-sm font-semibold text-text">{selection.subjectName}</p><span className="text-[10px] text-muted">{selection.commissionName ?? "Sin comisión"}</span></div>{!selection.subjectId && linkableOptions.length > 0 ? <label className="mt-2 block"><span className="sr-only">Materia del plan para {selection.subjectName}</span><select value={selectedSubjectId ?? ""} onChange={(event) => { const value = event.target.value || null; setLinkedSubjectIds((previous) => ({ ...previous, [selection.id]: value })); if (value) setResolutions((previous) => ({ ...previous, [selection.id]: "existing" })); }} className="w-full rounded-lg border border-border/50 bg-surface px-2 py-2 text-[10px] text-text outline-none focus:border-accent"><option value="">Vincular a una materia existente…</option>{linkableOptions.map((option) => <option key={option.subjectId ?? option.id} value={option.subjectId ?? option.id}>{option.code ? `${option.code} · ` : ""}{option.name}</option>)}</select></label> : null}<div className="mt-2 grid grid-cols-3 gap-1">{(["existing", "create", "external"] as const).map((value) => <button key={value} type="button" disabled={value === "existing" && !canLink} onClick={() => setResolutions((previous) => ({ ...previous, [selection.id]: value }))} className={`inline-flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[10px] font-semibold transition ${resolutions[selection.id] === value ? "bg-accent/14 text-accent" : "text-muted hover:bg-surface hover:text-text"} disabled:cursor-not-allowed disabled:opacity-40`}>{value === "existing" ? <Link2 className="h-3 w-3" /> : value === "create" ? <Plus className="h-3 w-3" /> : <Check className="h-3 w-3" />}{value === "existing" ? "Vincular" : value === "create" ? "Crear" : "Externa"}</button>)}</div></div>; })}</div>
      {error ? <p role="alert" className="mt-3 rounded-lg border border-red-300/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">{error}</p> : null}
      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} disabled={pending} className="rounded-full px-4 py-2.5 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-text">Volver</button><button type="button" onClick={() => onConfirm(resolutions, linkedSubjectIds)} disabled={pending || selections.length === 0} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-xs font-semibold text-accent-content disabled:opacity-50">{pending ? "Confirmando…" : <><Check className="h-3.5 w-3.5" />Confirmar plan</>}</button></div>
    </section>
  </div>;
}
