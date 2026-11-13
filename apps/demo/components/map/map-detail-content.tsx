import { cn } from "@/lib/utils";
import { formatEvaluationTemplate } from "@/lib/templates";
import { Badge } from "@/components/ui/badge";
import { CYCLE_LABELS } from "@/lib/map/map-constants";
import {
  formatCbcProgress,
  formatFinalProjectProgress,
  formatList,
  getDisplayNodeMeta,
  isCbcClusterNode,
  isFinalProjectNode
} from "@/lib/map/map-layout";
import type { FinalProjectTrack, MapNode } from "@/lib/map/types";

export default function MapDetailContent({
  collapseCbc,
  finalProjectTrack,
  onFinalProjectTrackChange,
  selectedNode,
  selectedPrereqs,
  selectedStatusLabel,
  selectedUnlocks
}: {
  collapseCbc: boolean;
  finalProjectTrack: FinalProjectTrack;
  onFinalProjectTrackChange: (track: FinalProjectTrack) => void;
  selectedNode: MapNode;
  selectedPrereqs: string[];
  selectedStatusLabel: string | null;
  selectedUnlocks: string[];
}) {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {selectedNode.type ? (
          <Badge
            className={cn(
              "border-border/60 bg-surface/70 text-text",
              selectedNode.type === "electiva" &&
                "border-elective/40 bg-elective/10 text-elective"
            )}
          >
            {selectedNode.type === "electiva" ? "Electiva" : "Obligatoria"}
          </Badge>
        ) : null}
        {selectedNode.cycle ? (
          <Badge className="border-border/60 bg-surface/70 text-muted">
            {CYCLE_LABELS[selectedNode.cycle] ?? selectedNode.cycle}
          </Badge>
        ) : null}
        {selectedNode.credits ? (
          <Badge className="border-border/60 bg-surface/70 text-muted">
            {selectedNode.credits} créditos
          </Badge>
        ) : null}
        {isCbcClusterNode(selectedNode) ? (
          <Badge className="border-warning/35 bg-warning/10 text-warning">
            {collapseCbc ? "CBC compacto" : "CBC expandido"}
          </Badge>
        ) : null}
        {isFinalProjectNode(selectedNode) ? (
          <Badge className="border-accent/35 bg-accent/10 text-accent">
            {selectedNode.display_kind === "final_project"
              ? "Nodo final"
              : finalProjectTrack === "tesis"
                ? "Modalidad tesis"
                : "Modalidad trabajo profesional"}
          </Badge>
        ) : null}
      </div>
      <div className="grid gap-2 text-sm">
        {isCbcClusterNode(selectedNode) ? (
          <>
            <p>
              Ubicación: <span className="text-text">Tramo inicial del recorrido</span>
            </p>
            <p>
              Progreso CBC:{" "}
              <span className="text-text">
                {formatCbcProgress(selectedNode.progress_credits)}
              </span>
            </p>
          </>
        ) : isFinalProjectNode(selectedNode) ? (
          <>
            <p>
              Modalidad elegida:{" "}
              <span className="text-text">
                {finalProjectTrack === "tesis"
                  ? "Tesis de Ingeniería Informática"
                  : "Trabajo Profesional de Ingeniería Informática"}
              </span>
            </p>
            <p>
              Ubicación: <span className="text-text">Tramo final del recorrido</span>
            </p>
            <p>
              Progreso TIF:{" "}
              <span className="text-text">
                {formatFinalProjectProgress(selectedNode.progress_credits)}
              </span>
            </p>
          </>
        ) : (
          <p>
            Código:{" "}
            <span className="text-text">{getDisplayNodeMeta(selectedNode)}</span>
          </p>
        )}
        <p>
          Horas semanales:{" "}
          <span className="text-text">{selectedNode.weekly_hours ?? "-"}</span>
        </p>
        <p>
          Horas totales:{" "}
          <span className="text-text">{selectedNode.total_hours ?? "-"}</span>
        </p>
        <p>
          Estado: <span className="text-text">{selectedStatusLabel ?? "Sin estado"}</span>
        </p>
      </div>
      {isCbcClusterNode(selectedNode) ? (
        <div className="rounded-2xl border border-warning/25 bg-warning/5 p-3">
          <p className="text-xs font-semibold text-text">Bloque CBC</p>
          <p className="mt-1 text-xs text-muted">
            Podés compactarlo para ver el tronco principal o expandirlo para
            revisar cada materia del CBC y sus conexiones hacia el segundo
            ciclo.
          </p>
        </div>
      ) : null}
      {isFinalProjectNode(selectedNode) ? (
        <div className="rounded-2xl border border-accent/25 bg-accent/5 p-3">
          <p className="text-xs font-semibold text-text">Definición del TIF</p>
          <p className="mt-1 text-xs text-muted">
            El plan oficial lo ubica al final del recorrido y puede cursarse
            como tesis o trabajo profesional, por un total de 12 créditos.
          </p>
          <div className="mt-3 inline-flex rounded-full border border-border/60 bg-surface/80 p-1">
            <button
              type="button"
              onClick={() => onFinalProjectTrackChange("tesis")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                finalProjectTrack === "tesis"
                  ? "bg-accent text-accent-contrast"
                  : "text-muted hover:text-text"
              )}
            >
              Tesis
            </button>
            <button
              type="button"
              onClick={() =>
                onFinalProjectTrackChange("trabajo_profesional")
              }
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                finalProjectTrack === "trabajo_profesional"
                  ? "bg-accent text-accent-contrast"
                  : "text-muted hover:text-text"
              )}
            >
              Trabajo profesional
            </button>
          </div>
        </div>
      ) : null}
      <div className="rounded-2xl border border-border/60 bg-surface/80 p-3">
        <p className="text-xs font-semibold text-text">Prerrequisitos</p>
        <p className="text-xs text-muted">
          {selectedPrereqs.length ? selectedPrereqs.join(" · ") : "Sin correlativas"}
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-surface/80 p-3">
        <p className="text-xs font-semibold text-text">Desbloquea</p>
        <p className="text-xs text-muted">
          {selectedUnlocks.length ? selectedUnlocks.join(" · ") : "Sin dependientes"}
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-surface/80 p-3">
        <p className="text-xs font-semibold text-text">Requisitos</p>
        <p className="text-xs text-muted">{formatList(selectedNode.requirements)}</p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-surface/80 p-3">
        <p className="text-xs font-semibold text-text">Evaluación</p>
        <p className="text-xs text-muted">{formatEvaluationTemplate(selectedNode.template)}</p>
      </div>
    </>
  );
}
