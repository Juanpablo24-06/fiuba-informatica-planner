import { ChevronDown, PanelRightClose, PanelRightOpen, Plus, Trash2 } from "lucide-react";
import type { ParsedCommission } from "@/lib/planner/offer-parser";
import { cn } from "@/lib/utils";
import type { PlanningSelection } from "@/components/planner/planning-types";

type Props = {
  readOnly?: boolean;
  selections: PlanningSelection[];
  offers: ParsedCommission[];
  collapsed: boolean;
  onToggle: () => void;
  onChooseCommission: (selection: PlanningSelection, offer: ParsedCommission) => void;
  onRemove: (selection: PlanningSelection) => void;
  onColorChange: (selection: PlanningSelection, color: string) => void;
  onAdd: () => void;
};

const minutes = (start: string, end: string) => {
  const parse = (value: string) => { const [hour, minute] = value.split(":").map(Number); return hour * 60 + minute; };
  return Math.max(0, parse(end) - parse(start));
};

export default function PlanningRail({ readOnly = false, selections, offers, collapsed, onToggle, onChooseCommission, onRemove, onColorChange, onAdd }: Props) {
  const weeklyHours = selections.reduce((sum, selection) => sum + selection.blocks.reduce((subtotal, block) => subtotal + minutes(block.start_time, block.end_time) / 60, 0), 0);
  return <aside data-planner-rail="true" data-collapsed={collapsed ? "true" : "false"} className={cn("context-scrollbar rounded-[1.6rem] border border-border/45 bg-surface/75 p-3 xl:sticky xl:top-[calc(var(--app-header-height,96px)+4.5rem)] xl:max-h-[calc(100svh-var(--app-header-height,96px)-5.5rem)] xl:self-start xl:overflow-y-auto", collapsed && "flex min-h-[240px] items-start justify-center") } aria-label="Selecciones del escenario">
    <button type="button" onClick={onToggle} aria-label={collapsed ? "Abrir plan actual" : "Contraer plan actual"} className="mb-2 ml-auto flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-surface-2 hover:text-accent">{collapsed ? <PanelRightOpen className="h-4 w-4" /> : <PanelRightClose className="h-4 w-4" />}</button>
    {collapsed ? null : <>
      <div className="flex items-baseline justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-accent">Escenario actual</p><h2 className="mt-1 text-sm font-semibold text-text">{selections.length} materias</h2></div><span className="text-xs text-muted">{weeklyHours} h/sem</span></div>
      <div className="mt-3 divide-y divide-border/30">
        {selections.map((selection) => <SelectionRow key={selection.id} selection={selection} readOnly={readOnly} offers={offers} onChooseCommission={onChooseCommission} onRemove={onRemove} onColorChange={onColorChange} />)}
        {selections.length === 0 ? <div className="py-8 text-center text-xs text-muted">Todavía no agregaste materias.</div> : null}
      </div>
      <button type="button" disabled={readOnly} onClick={onAdd} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-accent/60 px-3 py-2.5 text-xs font-semibold text-accent transition hover:bg-accent/10"><Plus className="h-4 w-4" />Añadir materia</button>
    </>}
  </aside>;
}

function SelectionRow({ readOnly = false, selection, offers, onChooseCommission, onRemove, onColorChange }: Omit<Props, "selections" | "collapsed" | "onToggle" | "onAdd"> & { selection: PlanningSelection }) {
  const matchingOffers = offers.filter((offer) => selection.subjectCode ? offer.code === selection.subjectCode : offer.activity === selection.subjectName);
  const selectedCommission = selection.commissionNames?.[0] ?? selection.commissionName;
  return <div className="group py-3">
    <div className="flex items-start gap-2">
      <label className="mt-1.5 shrink-0 cursor-pointer" title={`Cambiar color de ${selection.subjectName}`}><span className="sr-only">Color de {selection.subjectName}</span><input type="color" disabled={readOnly} value={selection.color} onChange={(event) => onColorChange(selection, event.target.value)} className="h-3.5 w-3.5 cursor-pointer appearance-none rounded-full border-0 bg-transparent p-0" /></label>
      <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-text">{selection.subjectName}</p>{selection.status && selection.status !== "planned" ? <p className="mt-0.5 text-[9px] text-muted">{selection.status === "available" ? "Disponible" : selection.status === "blocked" ? (selection.reason ?? "Bloqueada") : selection.status.replaceAll("_", " ")}</p> : null}
        <details className="mt-1"><summary className={cn("flex max-w-full cursor-pointer list-none items-center gap-1.5 rounded-lg px-2 py-1 text-left text-[10px] font-semibold [&::-webkit-details-marker]:hidden", selectedCommission ? "bg-surface-2 text-text hover:bg-accent/10" : "bg-accent/10 text-accent hover:bg-accent/15")}><span className="truncate">{selectedCommission ?? "Elegir comisión"}</span><ChevronDown className="h-3 w-3 shrink-0" /></summary><div className="context-scrollbar mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl bg-surface-2/55 p-1.5">{matchingOffers.map((offer, index) => <button key={`${offer.commission}-${index}`} type="button" disabled={readOnly} onClick={() => onChooseCommission(selection, offer)} className={cn("w-full rounded-lg px-2.5 py-2 text-left hover:bg-surface", offer.commission === selectedCommission && "bg-surface")}><p className="truncate text-[11px] font-semibold text-text">{offer.commission}</p><p className="mt-0.5 truncate text-[9px] text-muted">{offer.teachers[0] ?? "Docente sin informar"}</p><p className="mt-1 text-[10px] text-muted">{offer.slots.map((slot) => `${slot.day ?? ""} ${slot.startTime ?? ""}–${slot.endTime ?? ""}`).join(" · ")}</p></button>)}{matchingOffers.length === 0 ? <p className="px-2 py-3 text-[10px] text-muted">Sin comisiones cargadas.</p> : null}</div></details>
      </div>
      <button type="button" disabled={readOnly} onClick={() => onRemove(selection)} aria-label={`Quitar ${selection.subjectName}`} className="rounded-full p-1.5 text-muted opacity-70 transition hover:bg-accent/10 hover:text-accent group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  </div>;
}
