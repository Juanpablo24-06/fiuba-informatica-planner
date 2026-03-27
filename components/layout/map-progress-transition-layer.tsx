"use client";

import { useEffect, useRef } from "react";
import SummaryProgressBar from "@/components/dashboard/summary-progress-bar";
import {
  getProgressGhostRect,
  getProgressRect,
  MAP_TRANSITION_DURATION_MS
} from "@/components/layout/map-progress-transition";
import { useMapTransitionState } from "@/components/layout/map-transition-coordinator";
import { OFFICIAL_TOTAL_CREDITS, type ProgressSnapshot } from "@/lib/progress";

type MapProgressTransitionLayerProps = {
  progress: ProgressSnapshot;
};

export default function MapProgressTransitionLayer({
  progress
}: MapProgressTransitionLayerProps) {
  const state = useMapTransitionState();
  const cloneRef = useRef<HTMLDivElement | null>(null);

  const shouldRender =
    state.transitioning &&
    state.showMapBar &&
    state.animateMapBar &&
    state.mapEntryPhase === "bar-drop" &&
    Boolean(state.progressSourceRect);

  useEffect(() => {
    if (!shouldRender || !cloneRef.current || !state.progressSourceRect) return;

    const clone = cloneRef.current;
    const fromRect = state.progressSourceRect;
    let firstFrame: number | null = null;
    let secondFrame: number | null = null;
    let animation: Animation | null = null;

    Object.assign(clone.style, {
      left: `${fromRect.left}px`,
      top: `${fromRect.top}px`,
      width: `${fromRect.width}px`,
      height: `${fromRect.height}px`,
      transform: "translate3d(0, 0, 0) scale(1, 1)",
      opacity: "1"
    });

    clone.getBoundingClientRect();

    firstFrame = window.requestAnimationFrame(() => {
      const targetRect =
        getProgressRect("map-bottom") ?? getProgressGhostRect("map-bottom");
      if (!targetRect) return;

      secondFrame = window.requestAnimationFrame(() => {
        animation = clone.animate(
          [
            {
              transform: "translate3d(0, 0, 0) scale(1, 1)",
              opacity: 1
            },
            {
              transform: `translate3d(${targetRect.left - fromRect.left}px, ${targetRect.top - fromRect.top}px, 0) scale(${targetRect.width / fromRect.width}, ${targetRect.height / fromRect.height})`,
              opacity: 1
            }
          ],
          {
            duration: MAP_TRANSITION_DURATION_MS,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "forwards"
          }
        );
      });
    });

    return () => {
      if (firstFrame !== null) window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== null) window.cancelAnimationFrame(secondFrame);
      animation?.cancel();
    };
  }, [shouldRender, state.progressSourceRect]);

  if (!shouldRender || !state.progressSourceRect) return null;

  return (
    <div
      ref={cloneRef}
      aria-hidden="true"
      data-progress-transition-clone="true"
      className="pointer-events-none fixed z-[70] m-0 will-change-transform"
      style={{
        left: state.progressSourceRect.left,
        top: state.progressSourceRect.top,
        width: state.progressSourceRect.width,
        height: state.progressSourceRect.height,
        transformOrigin: "top left"
      }}
    >
      <SummaryProgressBar
        approvedTotalCredits={progress.approvedTotalCredits}
        totalCredits={OFFICIAL_TOTAL_CREDITS}
        progressPct={progress.progressPct}
        approvedCbcCredits={progress.approvedCbcCredits}
        totalCbcCredits={progress.totalCbcCredits}
        approvedCbcCourses={progress.approvedCbcCourses}
        totalCbcCourses={progress.totalCbcCourses}
        approvedObligatoryCredits={progress.approvedObligatoryCredits}
        totalObligatoryCredits={progress.totalObligatoryCredits}
        approvedObligatoryCourses={progress.approvedObligatoryCourses}
        totalObligatoryCourses={progress.totalObligatoryCourses}
        approvedElectiveCredits={progress.approvedElectiveCredits}
        totalElectiveCredits={progress.totalElectiveCredits}
        approvedTifCredits={progress.approvedTifCredits}
        totalTifCredits={progress.totalTifCredits}
        mode="map-bottom"
        disableBottomMeasurement
        disableSlotRegistration
      />
    </div>
  );
}
