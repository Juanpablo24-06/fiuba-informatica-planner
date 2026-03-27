"use client";

import { cn } from "@/lib/utils";
import {
  getDisplayNodeMeta,
  getDisplayNodeName,
  isCbcClusterNode,
  isFinalProjectNode,
  formatFinalProjectProgress
} from "@/lib/map/map-layout";
import type { MapNodePreview } from "@/lib/map/map-view-state";
import type {
  FinalProjectTrack,
  MapNode,
  NodeLayout
} from "@/lib/map/types";
import {
  CYCLE_LABELS,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  STATUS_LABELS,
  STATUS_STYLES
} from "@/lib/map/map-constants";

export function MapNodeCard({
  node,
  layout,
  isActive,
  isPrereq,
  isUnlock,
  isDimmed,
  isDesktop,
  hasSelection,
  isHovered,
  finalProjectTrack,
  preview,
  onHoverStart,
  onHoverEnd
}: {
  node: MapNode;
  layout: NodeLayout;
  isActive: boolean;
  isPrereq: boolean;
  isUnlock: boolean;
  isDimmed: boolean;
  isDesktop: boolean;
  hasSelection: boolean;
  isHovered: boolean;
  finalProjectTrack: FinalProjectTrack;
  preview: MapNodePreview | null;
  onHoverStart: (id: string) => void;
  onHoverEnd: () => void;
}) {
  const isElective = node.type === "electiva";
  const isFinalProject = isFinalProjectNode(node);
  const isCbcCluster = isCbcClusterNode(node);
  const showMeta = isActive || (isDesktop && !hasSelection && isHovered);
  const statusLabel = node.status ? STATUS_LABELS[node.status] : null;
  const displayName = getDisplayNodeName(node, finalProjectTrack);
  const displayMeta = getDisplayNodeMeta(node);
  const markerClass = isActive
    ? "bg-accent"
    : isPrereq
      ? "bg-prereq"
      : isUnlock
        ? "bg-unlock"
        : isElective
          ? "bg-elective"
          : "bg-border/60";

  return (
    <button
      type="button"
      data-node-id={node.id}
      aria-pressed={isActive}
      onMouseEnter={() => onHoverStart(node.id)}
      onMouseLeave={onHoverEnd}
      onFocus={() => onHoverStart(node.id)}
      onBlur={onHoverEnd}
      className={cn(
        "group absolute rounded-2xl border px-3 py-3 text-left text-xs font-semibold text-text shadow-tile transition-all duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        isCbcCluster && "cursor-pointer",
        (isActive || showMeta) && "z-30 scale-[1.02] shadow-glow",
        !isActive && !showMeta && "z-20",
        isActive && "border-accent/70 bg-surface shadow-glow",
        !isActive && isPrereq && "border-prereq/70 bg-surface",
        !isActive && isUnlock && "border-unlock/70 bg-surface",
        !isActive && !isPrereq && !isUnlock && isCbcCluster &&
          "border-warning/55 bg-surface",
        !isActive && !isPrereq && !isUnlock && isElective &&
          "border-elective/55 bg-surface",
        !isActive && !isPrereq && !isUnlock && !isElective &&
          "border-border/60 bg-surface",
        isFinalProject && !isActive && "border-accent/45 bg-surface/96",
        isDimmed && "opacity-55"
      )}
      style={{
        left: layout.x,
        top: layout.y,
        width: NODE_WIDTH,
        minHeight: isCbcCluster ? 96 : NODE_MIN_HEIGHT
      }}
    >
      <span
        className={cn(
          "absolute left-0 top-0 h-full w-1 rounded-l-2xl transition",
          markerClass
        )}
      />
      {isCbcCluster ? (
        <div className="flex min-h-[72px] items-center justify-center px-3 text-center">
          <p className="text-base font-semibold leading-tight text-text">
            {displayName}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-sm font-semibold leading-tight text-text">
                {displayName}
              </p>
              <p className="text-[11px] text-muted">{displayMeta}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {statusLabel ? (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    STATUS_STYLES[node.status ?? ""]
                  )}
                >
                  {statusLabel}
                </span>
              ) : null}
              {node.color ? (
                <span
                  className="h-2.5 w-2.5 rounded-full border border-border/40"
                  style={{ backgroundColor: node.color }}
                />
              ) : null}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
            {node.credits ? (
              <span className="rounded-full border border-border/60 bg-surface/80 px-2 py-0.5 text-muted">
                {node.credits} créditos
              </span>
            ) : null}
            {isFinalProject ? (
              <span className="rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 text-accent">
                {finalProjectTrack === "tesis"
                  ? "Modalidad tesis"
                  : "Trabajo profesional"}
              </span>
            ) : null}
            {node.cycle ? (
              <span className="rounded-full border border-border/60 bg-surface/80 px-2 py-0.5 text-muted">
                {CYCLE_LABELS[node.cycle] ?? node.cycle}
              </span>
            ) : null}
            {isElective ? (
              <span className="rounded-full border border-elective/40 bg-elective/10 px-2 py-0.5 text-elective">
                Electiva
              </span>
            ) : null}
            {isFinalProject ? (
              <span className="rounded-full border border-accent/30 bg-accent/5 px-2 py-0.5 text-accent">
                {formatFinalProjectProgress(node.progress_credits)}
              </span>
            ) : null}
          </div>
          <div
            className={cn(
              "mt-2 overflow-hidden text-[10px] text-muted transition-all duration-200",
              showMeta ? "max-h-28 opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span>Correlativas</span>
              <span className="text-right text-text">
                {preview?.prereqSummary ?? "Ninguna"}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span>Habilita</span>
              <span className="text-right text-text">
                {preview?.unlockSummary ?? "Ninguna"}
              </span>
            </div>
          </div>
        </>
      )}
    </button>
  );
}
