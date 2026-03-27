"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMapTransitionState } from "@/components/layout/map-transition-coordinator";
import { armMapEntryLoader } from "@/lib/map/map-entry-transition";
import {
  buildSummaryProgressSegments,
  isTrailingSummarySegment,
  type FinalProjectTrack,
  type SummaryProgressSegment
} from "@/lib/dashboard/summary-progress";
import { cn } from "@/lib/utils";

const MAP_FINAL_TRACK_STORAGE_KEY = "fiuba-map-final-track-v1";
const MAP_BOTTOM_BAR_HEIGHT_CSS_VAR = "--map-bottom-bar-height";

type SummaryProgressBarProps = {
  approvedTotalCredits: number;
  totalCredits: number;
  progressPct: number;
  approvedCbcCredits: number;
  totalCbcCredits: number;
  approvedCbcCourses: number;
  totalCbcCourses: number;
  approvedObligatoryCredits: number;
  totalObligatoryCredits: number;
  approvedObligatoryCourses: number;
  totalObligatoryCourses: number;
  approvedElectiveCredits: number;
  totalElectiveCredits: number;
  approvedTifCredits: number;
  totalTifCredits: number;
  englishApproved?: boolean;
  mode?: "summary" | "map-bottom";
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const SHARED_BAR_GRID = "md:grid-cols-[19fr_46fr_13fr_10fr_8fr]";

export default function SummaryProgressBar({
  approvedTotalCredits,
  totalCredits,
  progressPct: _progressPct,
  approvedCbcCredits,
  totalCbcCredits,
  approvedCbcCourses,
  totalCbcCourses,
  approvedObligatoryCredits,
  totalObligatoryCredits,
  approvedObligatoryCourses,
  totalObligatoryCourses,
  approvedElectiveCredits,
  totalElectiveCredits,
  approvedTifCredits,
  totalTifCredits,
  englishApproved = false,
  mode = "summary"
}: SummaryProgressBarProps) {
  const [finalTrack, setFinalTrack] = useState<FinalProjectTrack>("tesis");
  const sharedBarRef = useRef<HTMLDivElement | null>(null);
  const mapTransitionState = useMapTransitionState();
  const isMapBottom = mode === "map-bottom";
  const showSummaryStats = mode === "summary";
  const tooltipsDisabled = mapTransitionState.transitioning;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MAP_FINAL_TRACK_STORAGE_KEY);
      if (stored === "tesis" || stored === "trabajo_profesional") {
        setFinalTrack(stored);
      }
    } catch {
      // Ignore storage issues and keep the default mode.
    }
  }, []);

  useEffect(() => {
    if (!isMapBottom || !sharedBarRef.current) return;
    const element = sharedBarRef.current;
    const update = () => {
      document.documentElement.style.setProperty(
        MAP_BOTTOM_BAR_HEIGHT_CSS_VAR,
        `${element.offsetHeight + 18}px`
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty(MAP_BOTTOM_BAR_HEIGHT_CSS_VAR);
    };
  }, [isMapBottom]);

  const segments = useMemo<SummaryProgressSegment[]>(
    () =>
      buildSummaryProgressSegments({
        approvedCbcCredits,
        totalCbcCredits,
        approvedCbcCourses,
        totalCbcCourses,
        approvedObligatoryCredits,
        totalObligatoryCredits,
        approvedObligatoryCourses,
        totalObligatoryCourses,
        approvedElectiveCredits,
        totalElectiveCredits,
        approvedTifCredits,
        totalTifCredits,
        englishApproved,
        finalTrack
      }),
    [
      approvedCbcCourses,
      approvedCbcCredits,
      approvedElectiveCredits,
      approvedObligatoryCredits,
      approvedObligatoryCourses,
      approvedTifCredits,
      englishApproved,
      finalTrack,
      totalCbcCredits,
      totalCbcCourses,
      totalElectiveCredits,
      totalObligatoryCredits,
      totalObligatoryCourses,
      totalTifCredits
    ]
  );

  return (
    <div className={cn("w-full", showSummaryStats && "relative z-20")}>
      {showSummaryStats ? (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted">Créditos aprobados</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[1.95rem] font-semibold leading-none text-text">
                {approvedTotalCredits}
              </span>
              <span className="text-sm text-muted">de {totalCredits}</span>
            </div>
          </div>
        <div className="flex items-end gap-4">
            <Link
              href="/mapa"
              onClick={() => armMapEntryLoader()}
              data-map-transition-source="summary-link"
              className="text-sm font-semibold text-accent transition hover:text-accent/80"
            >
              Ver mapa
            </Link>
          </div>
        </div>
      ) : null}

      <div
        ref={sharedBarRef}
        data-progress-slot={mode}
        className={cn(
          "relative transition-opacity duration-200",
          showSummaryStats ? "mt-5" : "w-full"
        )}
      >
        <div className={cn("grid gap-x-4 gap-y-3 md:items-start", SHARED_BAR_GRID)}>
          {segments.map((segment) => {
            const fillPct = clamp(
              segment.total > 0 ? (segment.approved / segment.total) * 100 : 0,
              0,
              100
            );
            const percentLabel =
              segment.key === "ingles"
                ? englishApproved
                  ? "OK"
                  : null
                : fillPct > 0
                ? `${Math.round(fillPct)}%`
                : null;

            return (
              <div key={segment.key} className="group/segment relative min-w-0 outline-none">
                <div className="mb-2 flex min-h-5 items-center gap-2 px-0.5">
                  {percentLabel ? (
                    <span
                      className={cn(
                        "rounded-md px-1.5 py-[2px] text-[10px] font-semibold leading-none",
                        segment.percentBadgeClass
                      )}
                    >
                      {percentLabel}
                    </span>
                  ) : null}
                  <span className={cn("h-3 w-1.5 rounded-full", segment.markerClass)} />
                  <span
                    className={cn(
                      "whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.14em] md:text-[11px] md:tracking-[0.16em]",
                      segment.labelClass
                    )}
                  >
                    {segment.label}
                  </span>
                </div>

                <div
                  className={cn(
                    "relative h-[21px] overflow-hidden rounded-[9px] border bg-surface-2",
                    segment.trackClass
                  )}
                  style={{
                    backgroundColor: `color-mix(in srgb, ${segment.accentColor} 30%, rgb(var(--color-surface)) 70%)`
                  }}
                >
                  <div
                    className="relative h-full rounded-[7px] transition-[width] duration-300"
                    style={{
                      width: `${fillPct}%`,
                      backgroundColor: segment.accentColor
                    }}
                  />
                  {fillPct > 0 ? (
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 rounded-[7px] mix-blend-screen"
                      style={{
                        width: `${fillPct}%`,
                        backgroundImage: `repeating-linear-gradient(-45deg, ${segment.stripeColor} 0 8px, transparent 8px 16px)`
                      }}
                    />
                  ) : null}
                </div>

                <div
                  data-progress-tooltip="true"
                  className={cn(
                    "pointer-events-none absolute bottom-full z-[70] mb-3 w-[220px] -translate-y-2 rounded-2xl border border-border/85 bg-surface px-4 py-3 text-left shadow-lg opacity-0 transition-all duration-200",
                    isTrailingSummarySegment(segment.key) ? "right-0" : "left-0",
                    !tooltipsDisabled && "group-hover/segment:translate-y-0 group-hover/segment:opacity-100"
                  )}
                >
                  <p className="text-sm font-semibold text-text">{segment.tooltipTitle}</p>
                  <p className="mt-1 text-sm text-text">{segment.tooltipBody}</p>
                  {segment.helperText ? (
                    <p className="mt-1 text-xs text-muted">{segment.helperText}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
