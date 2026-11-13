import { useModalFocus } from "@/components/ui/use-modal-focus";
import { FileUp, Plus, Search, X } from "lucide-react";
import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type { Enrollment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { parseCommissionText, type ParsedCommission } from "@/lib/planner/offer-parser";
import type { PlanningBlock, PlanningSubjectOption } from "@/components/planner/planning-types";

type Props = {
  mode: "add" | "import";
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
  enrollments: Enrollment[];
  offers: ParsedCommission[];
  subjectOptions?: PlanningSubjectOption[];
  onClose: () => void;
  onAdd: (enrollment: Enrollment) => void;
  onAddCourse: (course: ParsedCommission) => void;
  onAddSubject?: (option: PlanningSubjectOption) => void;
  onImport: (offers: ParsedCommission[]) => void;
  effectiveMode: "today" | "term";
  setEffectiveMode: Dispatch<SetStateAction<"today" | "term">>;
  importText: string;
  setImportText: Dispatch<SetStateAction<string>>;
};

const DAY_BADGES: Record<string, string> = {
  lunes: "L", martes: "M", miércoles: "X", miercoles: "X", jueves: "J",
  viernes: "V", sábado: "S", sabado: "S", domingo: "D"
};

const offerCourseKey = (offer: ParsedCommission) => `${offer.code ?? ""}::${offer.activity}`;
const statusRank: Record<string, number> = { available: 0, cursando: 1, blocked: 2, final_pendiente: 3, recursar: 4, aprobado: 5 };
const statusLabel: Record<string, string> = { available: "Disponible", blocked: "Bloqueada", cursando: "Cursando", aprobado: "Aprobada", final_pendiente: "Final pendiente", recursar: "Recursar" };

export default function PlannerDrawer(props: Props) {
  const focusRef = useModalFocus(true, props.onClose);
  const preview = props.mode === "import" ? parseCommissionText(props.importText) : null;
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [manualDay, setManualDay] = useState<PlanningBlock["day"]>("lun");
  const [manualStart, setManualStart] = useState("18:00");
  const [manualEnd, setManualEnd] = useState("20:00");
  const [manualLocation, setManualLocation] = useState("");
  const courses = useMemo(() => {
    const grouped = new Map<string, { key: string; code: string | null; activity: string; offers: ParsedCommission[]; days: string[] }>();
    props.offers.forEach((offer) => {
      const key = offerCourseKey(offer);
      const current = grouped.get(key) ?? { key, code: offer.code, activity: offer.activity, offers: [], days: [] };
      current.offers.push(offer);
      current.days = [...new Set([...current.days, ...offer.slots.flatMap((slot) => slot.day ? [DAY_BADGES[slot.day.toLowerCase()] ?? ""] : []).filter(Boolean)])];
      grouped.set(key, current);
    });
    return [...grouped.values()];
  }, [props.offers]);
  const options = useMemo(() => [...(props.subjectOptions ?? [])].sort((a, b) => (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9) || a.name.localeCompare(b.name, "es")), [props.subjectOptions]);
  const filteredOptions = options.filter((option) => `${option.code ?? ""} ${option.name}`.toLocaleLowerCase("es").includes(props.query.toLocaleLowerCase("es")));
  const filteredCourses = courses.filter((course) => `${course.code ?? ""} ${course.activity}`.toLocaleLowerCase("es").includes(props.query.toLocaleLowerCase("es")));
  const createManual = () => {
    const value = manualName.trim();
    if (!value || !props.onAddSubject || manualEnd <= manualStart) return;
    props.onAddSubject({ id: `manual-${Date.now()}`, name: value, code: manualCode.trim() || null, status: "available", statusLabel: "Materia externa", blockedBy: [], termSuggested: null, termOrder: null, source: "manual", subjectId: null, manualBlocks: [{ day: manualDay, start_time: manualStart, end_time: manualEnd, location: manualLocation.trim() || null, class_type: "other" }] });
    setManualOpen(false);
    setManualName("");
    setManualCode("");
    setManualDay("lun");
    setManualStart("18:00");
    setManualEnd("20:00");
    setManualLocation("");
  };
  return <div className="fixed inset-x-0 bottom-0 top-[calc(var(--app-header-height,96px)+0.3rem)] z-40 flex justify-end bg-black/30 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
    <aside role="dialog" aria-modal="true" ref={focusRef} className="context-scrollbar h-full w-full max-w-[460px] overflow-y-auto border-l border-border/50 bg-surface px-5 py-4 shadow-2xl" aria-label={props.mode === "import" ? "Importar oferta académica" : "Añadir materia al escenario"}>
      <header className="flex items-center justify-between gap-3 border-b border-border/35 pb-3"><div className="min-w-0"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-accent">{props.mode === "import" ? "Oferta académica" : "Plan de cursada"}</p><h2 className="truncate text-lg font-semibold text-text">{props.mode === "import" ? "Importar comisiones" : "Añadir materia"}</h2></div><button type="button" aria-label="Cerrar" onClick={props.onClose} className="rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text"><X className="h-4 w-4" /></button></header>
      {props.mode === "add" ? <>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-2/50 p-1">{(["today", "term"] as const).map((option) => <button key={option} type="button" onClick={() => props.setEffectiveMode(option)} className={cn("rounded-lg px-3 py-2 text-xs font-semibold transition", props.effectiveMode === option ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text")}>{option === "today" ? "Desde hoy" : "Todo el período"}</button>)}</div>
        <label className="relative mt-4 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input autoFocus value={props.query} onChange={(event) => props.setQuery(event.target.value)} placeholder="Buscar materia, código u oferta" aria-label="Buscar materia" className="w-full rounded-xl border border-border/60 bg-surface-2/50 py-2.5 pl-10 pr-3 text-sm text-text outline-none focus:border-accent" /></label>
        {filteredOptions.length > 0 ? <section className="mt-4"><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">Plan académico</p><div className="mt-2 divide-y divide-border/30">{filteredOptions.slice(0, 40).map((option) => <button key={option.id} type="button" disabled={option.status === "blocked" && !props.onAddSubject} onClick={() => props.onAddSubject ? props.onAddSubject(option) : undefined} className="group flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition hover:bg-surface-2/70 disabled:cursor-not-allowed disabled:opacity-60"><span className="min-w-0 flex-1"><span className="flex items-baseline gap-2"><span className="text-[10px] tabular-nums text-muted">{option.code ?? "—"}</span><span className="block truncate text-sm font-semibold text-text group-hover:text-accent">{option.name}</span></span><span className={cn("mt-0.5 block text-[10px]", option.status === "aprobado" ? "text-muted/60" : option.status === "blocked" ? "text-amber-200" : "text-muted")}>{option.status === "blocked" ? (option.reason ?? (option.blockedBy.join(", ") || "Requiere correlativas")) : option.statusLabel ?? statusLabel[option.status] ?? option.status}</span></span>{option.status === "blocked" ? <span className="text-[10px] text-amber-200">Bloqueada</span> : <Plus className="h-4 w-4 text-accent" />}</button>)}</div></section> : null}
        {filteredCourses.length > 0 ? <section className="mt-5"><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">Oferta del período</p><div className="mt-2 divide-y divide-border/30">{filteredCourses.slice(0, 40).map((course) => <button key={course.key} type="button" onClick={() => props.onAddCourse(course.offers[0])} className="group flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left hover:bg-surface-2/70"><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text group-hover:text-accent">{course.activity}</span><span className="mt-0.5 block text-[10px] text-muted">{course.code ?? "Sin código"} · {course.offers.length} comisiones</span></span><span className="flex gap-1">{course.days.map((day) => <span key={day} className="grid h-5 w-5 place-items-center rounded-full bg-surface-2 text-[8px] font-bold text-muted">{day}</span>)}</span><Plus className="h-4 w-4 text-accent" /></button>)}</div></section> : null}
        {filteredOptions.length === 0 && filteredCourses.length === 0 && props.enrollments.length > 0 ? <section className="mt-5"><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted">Cursadas registradas</p><div className="mt-2 divide-y divide-border/30">{props.enrollments.map((enrollment) => <button key={enrollment.id} type="button" onClick={() => props.onAdd(enrollment)} className="flex w-full items-center justify-between gap-3 py-3 text-left"><span><span className="block text-sm font-semibold text-text">{enrollment.subject.name}</span><span className="text-[10px] text-muted">{enrollment.subject.code ?? "Sin código"}</span></span><Plus className="h-4 w-4 text-accent" /></button>)}</div></section> : null}
        {props.onAddSubject ? <section className="mt-5 border-t border-border/35 pt-4"><button type="button" onClick={() => setManualOpen((open) => !open)} className="inline-flex items-center gap-2 text-xs font-semibold text-accent hover:text-text"><Plus className="h-3.5 w-3.5" />Cargar materia manual</button>{manualOpen ? <div className="mt-3 space-y-2"><input value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Nombre de la materia" aria-label="Nombre de materia manual" className="w-full rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2.5 text-sm text-text outline-none focus:border-accent" /><input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="Código (opcional)" aria-label="Código de materia manual" className="w-full rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2.5 text-sm text-text outline-none focus:border-accent" /><div className="grid grid-cols-3 gap-2"><select value={manualDay} onChange={(event) => setManualDay(event.target.value as PlanningBlock["day"])} aria-label="Día del bloque manual" className="rounded-xl border border-border/60 bg-surface-2/50 px-2 py-2.5 text-xs text-text outline-none focus:border-accent"><option value="lun">Lun</option><option value="mar">Mar</option><option value="mie">Mié</option><option value="jue">Jue</option><option value="vie">Vie</option><option value="sab">Sáb</option></select><input type="time" value={manualStart} onChange={(event) => setManualStart(event.target.value)} aria-label="Inicio del bloque manual" className="rounded-xl border border-border/60 bg-surface-2/50 px-2 py-2.5 text-xs text-text outline-none focus:border-accent" /><input type="time" value={manualEnd} onChange={(event) => setManualEnd(event.target.value)} aria-label="Fin del bloque manual" className="rounded-xl border border-border/60 bg-surface-2/50 px-2 py-2.5 text-xs text-text outline-none focus:border-accent" /></div><input value={manualLocation} onChange={(event) => setManualLocation(event.target.value)} placeholder="Aula o lugar (opcional)" aria-label="Lugar del bloque manual" className="w-full rounded-xl border border-border/60 bg-surface-2/50 px-3 py-2.5 text-sm text-text outline-none focus:border-accent" /><p className="text-[10px] text-muted">El bloque inicial queda editable en la grilla; podés sumar otras comisiones después.</p><button type="button" onClick={createManual} disabled={!manualName.trim() || manualEnd <= manualStart} className="w-full rounded-xl bg-accent px-3 py-2.5 text-xs font-semibold text-accent-content disabled:opacity-50">Añadir al escenario</button></div> : null}</section> : null}
      </> : <>
        <textarea value={props.importText} onChange={(event) => props.setImportText(event.target.value)} placeholder="Pegá aquí la oferta copiada de FIUBA…" aria-label="Texto de oferta FIUBA" className="mt-4 min-h-44 w-full rounded-xl border border-border/60 bg-surface-2/50 p-3 text-xs text-text outline-none focus:border-accent" />
        <section className="mt-3 border-t border-border/35 pt-3"><div className="flex justify-between text-xs"><span className="font-semibold text-text">Detectado</span><span className="text-muted">{preview?.rows.length ?? 0} comisiones</span></div><div className="context-scrollbar mt-2 max-h-60 divide-y divide-border/30 overflow-y-auto">{preview?.rows.slice(0, 20).map((row, index) => <div key={`${row.raw}-${index}`} className="py-2"><p className="truncate text-xs font-semibold text-text">{row.activity} · {row.commission}</p><p className="text-[10px] text-muted">{row.slots.length} bloques</p></div>)}</div><button type="button" onClick={() => preview && props.onImport(preview.rows)} disabled={!preview?.rows.length} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-xs font-semibold text-accent-content disabled:opacity-50"><FileUp className="h-3.5 w-3.5" />Guardar oferta</button></section>
      </>}
    </aside>
  </div>;
}
