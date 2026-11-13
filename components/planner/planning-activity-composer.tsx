"use client";

import { useModalFocus } from "@/components/ui/use-modal-focus";

import { CalendarPlus, X } from "lucide-react";
import { useState } from "react";
import type { PlanningActivity } from "@/components/planner/planning-types";

const DAYS = [{ key: "lun", label: "Lunes" }, { key: "mar", label: "Martes" }, { key: "mie", label: "Miércoles" }, { key: "jue", label: "Jueves" }, { key: "vie", label: "Viernes" }, { key: "sab", label: "Sábado" }];
const COLORS = ["#d38ba8", "#a98ad8", "#82a85a", "#5d9fc5", "#e6a14b"];

type Props = {
  initial: { day: string; start: string; end: string };
  activity?: PlanningActivity | null;
  onClose: () => void;
  onSave: (value: Omit<PlanningActivity, "id"> & { id?: string }) => void;
};

export default function PlanningActivityComposer({ initial, activity, onClose, onSave }: Props) {
  const focusRef = useModalFocus(true, onClose);
  const [day, setDay] = useState(activity?.blocks[0]?.day ?? initial.day);
  const [start, setStart] = useState(activity?.blocks[0]?.start_time ?? initial.start);
  const [end, setEnd] = useState(activity?.blocks[0]?.end_time ?? initial.end);
  const [title, setTitle] = useState(activity?.title ?? "");
  const [kind, setKind] = useState(activity?.kind ?? "Actividad personal");
  const [location, setLocation] = useState(activity?.location ?? "");
  const [notes, setNotes] = useState(activity?.notes ?? "");
  const [color, setColor] = useState(activity?.color ?? COLORS[0]);
  const valid = title.trim() && start < end;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={focusRef} role="dialog" aria-modal="true" aria-labelledby="activity-composer-title" className="w-full max-w-md rounded-[1.5rem] border border-border/70 bg-surface p-5 shadow-2xl sm:p-6">
      <header className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-accent">Grilla semanal</p><h2 id="activity-composer-title" className="mt-1 text-lg font-semibold text-text">{activity ? "Editar actividad" : "Nueva actividad"}</h2><p className="mt-1 text-xs text-muted">Elegí un espacio vacío para reservar tu tiempo.</p></div><button type="button" aria-label="Cerrar" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text"><X className="h-4 w-4" /></button></header>
      <div className="mt-5 grid grid-cols-2 gap-2"><label className="text-[10px] font-semibold text-muted">Día<select value={day} onChange={(event) => setDay(event.target.value)} aria-label="Día de actividad" className="mt-1 w-full rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2.5 text-xs text-text outline-none focus:border-accent">{DAYS.map((item) => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><label className="text-[10px] font-semibold text-muted">Tipo<select value={kind} onChange={(event) => setKind(event.target.value)} aria-label="Tipo de actividad" className="mt-1 w-full rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2.5 text-xs text-text outline-none focus:border-accent"><option>Actividad personal</option><option>Grupo de estudio</option><option>Trabajo</option><option>Gimnasio</option><option>Viaje</option><option>Otro</option></select></label></div>
      <label className="mt-3 block text-[10px] font-semibold text-muted">Título<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. Grupo de estudio" aria-label="Título de actividad" className="mt-1 w-full rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2.5 text-sm text-text outline-none focus:border-accent" /></label>
      <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[10px] font-semibold text-muted">Desde<input type="time" value={start} onChange={(event) => setStart(event.target.value)} aria-label="Inicio de actividad" className="mt-1 w-full rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2.5 text-xs text-text outline-none focus:border-accent" /></label><label className="text-[10px] font-semibold text-muted">Hasta<input type="time" value={end} onChange={(event) => setEnd(event.target.value)} aria-label="Fin de actividad" className="mt-1 w-full rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2.5 text-xs text-text outline-none focus:border-accent" /></label></div>
      <label className="mt-3 block text-[10px] font-semibold text-muted">Lugar<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Opcional" aria-label="Lugar de actividad" className="mt-1 w-full rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2.5 text-xs text-text outline-none focus:border-accent" /></label>
      <label className="mt-3 block text-[10px] font-semibold text-muted">Notas<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Opcional" aria-label="Notas de actividad" className="mt-1 min-h-16 w-full resize-y rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2.5 text-xs text-text outline-none focus:border-accent" /></label>
      <fieldset className="mt-4"><legend className="text-[10px] font-semibold text-muted">Color</legend><div className="mt-2 flex items-center gap-2">{COLORS.map((value) => <button key={value} type="button" aria-label={`Usar color ${value}`} onClick={() => setColor(value)} className="h-6 w-6 rounded-full border-2 transition" style={{ backgroundColor: value, borderColor: color === value ? "white" : "transparent" }} />)}<input type="color" value={color} onChange={(event) => setColor(event.target.value)} aria-label="Color personalizado" className="h-7 w-7 cursor-pointer rounded-full border-0 bg-transparent p-0" /></div></fieldset>
      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-full px-4 py-2.5 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-text">Cancelar</button><button type="button" disabled={!valid} onClick={() => onSave({ id: activity?.id, title: title.trim(), kind, location: location.trim() || null, notes: notes.trim() || null, color, blocks: [{ day: day as PlanningActivity["blocks"][number]["day"], start_time: start, end_time: end, location: location.trim() || null, class_type: "other" }] })} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-xs font-semibold text-accent-content disabled:opacity-50"><CalendarPlus className="h-3.5 w-3.5" />Guardar actividad</button></div>
    </section>
  </div>;
}
