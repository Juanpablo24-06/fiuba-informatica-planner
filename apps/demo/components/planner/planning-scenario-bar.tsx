import { Check, Copy, Ellipsis, FileUp, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { Term } from "@/lib/types";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PlanningScenario } from "@/components/planner/planning-types";

type Props = {
  readOnly?: boolean;
  term: Term | null;
  terms: Term[];
  scenarios: PlanningScenario[];
  activeScenarioId: string | null;
  subjectCount: number;
  weeklyHours: number;
  conflicts: number;
  canImport: boolean;
  onSelectTerm: (termId: string) => void;
  onSelectScenario: (id: string) => void;
  onCreateScenario: () => void;
  onRenameScenario: (scenario: PlanningScenario) => void;
  onDuplicateScenario: (scenario: PlanningScenario) => void;
  onClearScenario: (scenario: PlanningScenario) => void;
  onDeleteScenario: (scenario: PlanningScenario) => void;
  onImport: () => void;
  onConfirm: () => void;
};

export default function PlanningScenarioBar({
  readOnly = false,
  term,
  terms,
  scenarios,
  activeScenarioId,
  subjectCount,
  weeklyHours,
  conflicts,
  canImport,
  onSelectTerm,
  onSelectScenario,
  onCreateScenario,
  onRenameScenario,
  onDuplicateScenario,
  onClearScenario,
  onDeleteScenario,
  onImport,
  onConfirm
}: Props) {
  return (
    <header className="sticky top-[calc(var(--app-header-height,96px)+0.35rem)] z-30 rounded-[1.25rem] border border-border/45 bg-surface/90 px-2 py-2 backdrop-blur-xl sm:px-3">
      <div className="grid items-center gap-2 lg:grid-cols-[minmax(11rem,15rem)_minmax(0,1fr)_auto]">
        <Select aria-label="Cuatrimestre" value={term?.id ?? ""} onChange={(event) => onSelectTerm(event.target.value)} className="rounded-full py-2 text-xs">
          {terms.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </Select>

        <div className="context-scrollbar flex min-w-0 items-center gap-1 overflow-x-auto pb-0.5" role="tablist" aria-label="Escenarios de cursada">
          {scenarios.map((scenario) => {
            const active = scenario.id === activeScenarioId;
            return (
              <div key={scenario.id} className="group relative flex shrink-0 items-center">
                <button type="button" role="tab" aria-selected={active} onClick={() => onSelectScenario(scenario.id)} className={cn("rounded-full px-3 py-2 text-xs font-semibold transition", active ? "bg-accent/14 text-accent" : "text-muted hover:bg-surface-2 hover:text-text")}>
                  {scenario.name}
                  {scenario.confirmedAt ? <Check aria-label="Confirmado" className="ml-1 inline h-3 w-3" /> : null}
                </button>
                <details hidden={readOnly} className="relative">
                  <summary className="grid h-7 w-7 cursor-pointer list-none place-items-center rounded-full text-muted opacity-0 transition hover:bg-surface-2 hover:text-text group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden" aria-label={`Acciones de ${scenario.name}`}>
                    <Ellipsis className="h-3.5 w-3.5" />
                  </summary>
                  <div className="absolute right-0 top-9 z-50 min-w-44 rounded-xl border border-border/70 bg-surface p-1.5 shadow-2xl">
                    <button type="button" onClick={() => onRenameScenario(scenario)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-text hover:bg-surface-2"><Pencil className="h-3.5 w-3.5 text-muted" />Renombrar</button>
                    <button type="button" onClick={() => onDuplicateScenario(scenario)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-text hover:bg-surface-2"><Copy className="h-3.5 w-3.5 text-muted" />Duplicar</button>
                    <button type="button" onClick={() => onClearScenario(scenario)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-text hover:bg-surface-2"><RotateCcw className="h-3.5 w-3.5 text-muted" />Vaciar</button>
                    {scenarios.length > 1 ? <button type="button" onClick={() => onDeleteScenario(scenario)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-danger hover:bg-danger/10"><Trash2 className="h-3.5 w-3.5" />Eliminar</button> : null}
                  </div>
                </details>
              </div>
            );
          })}
          <button type="button" disabled={readOnly} onClick={onCreateScenario} className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-accent/10 hover:text-accent" aria-label="Crear escenario"><Plus className="h-4 w-4" /></button>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-3 px-2 text-[11px] text-muted xl:flex"><span>{subjectCount} materias</span><span>{weeklyHours} h/sem</span><span className={conflicts > 0 ? "text-accent" : "text-emerald-400"}>{conflicts > 0 ? `${conflicts} cruces` : "Sin cruces"}</span></div>
          {canImport ? <button type="button" onClick={onImport} className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-2 text-xs font-semibold text-text hover:bg-accent/10 hover:text-accent"><FileUp className="h-3.5 w-3.5" /><span className="hidden sm:inline">Importar oferta</span><span className="sm:hidden">Importar</span></button> : null}
          <button type="button" disabled={readOnly} onClick={onConfirm} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-xs font-semibold text-accent-content shadow-sm hover:brightness-95"><Check className="h-3.5 w-3.5" /><span>Confirmar plan</span></button>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-3 px-2 text-[10px] text-muted xl:hidden"><span>{subjectCount} materias</span><span>{weeklyHours} h/sem</span><span className={conflicts > 0 ? "text-accent" : "text-emerald-400"}>{conflicts > 0 ? `${conflicts} cruces` : "Sin cruces"}</span></div>
    </header>
  );
}
