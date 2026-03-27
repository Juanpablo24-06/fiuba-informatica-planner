"use client";

import { usePathname } from "next/navigation";
import SummaryProgressBar from "@/components/dashboard/summary-progress-bar";
import AppLoadingSurface from "@/components/layout/app-loading-surface";
import MapLoadingStage from "@/components/map/map-loading-stage";
import MapSceneBackground from "@/components/map/map-scene-background";
import MapProgressTransitionLayer from "@/components/layout/map-progress-transition-layer";
import { OFFICIAL_TOTAL_CREDITS, type ProgressSnapshot } from "@/lib/progress";
import { cn } from "@/lib/utils";
import {
  MapTransitionCoordinator,
  useMapTransitionState
} from "@/components/layout/map-transition-coordinator";
import {
  getDisplaySection,
  isPendingNavigationResolved
} from "@/components/layout/map-transition-store";

type AppShellProps = {
  children: React.ReactNode;
  progress: ProgressSnapshot;
};

export default function AppShell({ children, progress }: AppShellProps) {
  const pathname = usePathname() ?? "";
  const mapTransitionState = useMapTransitionState();
  const displaySection = getDisplaySection(pathname, mapTransitionState.pendingSection);
  const isMapa = displaySection === "/mapa";
  const pendingNavigationResolved = isPendingNavigationResolved(
    pathname,
    mapTransitionState.pendingPath
  );
  const pendingNavigationActive = mapTransitionState.transitioning;
  const showMapBottomBar = displaySection === "/mapa";
  const hideActualMapBar =
    pendingNavigationActive &&
    mapTransitionState.showMapBar &&
    mapTransitionState.animateMapBar &&
    mapTransitionState.mapEntryPhase === "bar-drop";
  const resolvedMapChildren =
    pendingNavigationResolved && pathname.startsWith("/mapa") ? (
      <div
        aria-hidden="true"
        className="invisible pointer-events-none absolute inset-0 z-10"
      >
        {children}
      </div>
    ) : null;

  let shellContent = children;

  if (pendingNavigationActive) {
    if (mapTransitionState.loaderKind === "map") {
      shellContent =
        mapTransitionState.mapEntryPhase === "bar-drop"
          ? (
            <div className="relative min-h-[100svh]">
              <MapSceneBackground position="fixed" />
            </div>
          )
          : (
            <div className="relative min-h-[100svh]">
              {resolvedMapChildren}
              <div className="relative z-20">
                <MapLoadingStage backgroundPosition="fixed" />
              </div>
            </div>
          );
    } else {
      shellContent = <AppLoadingSurface />;
    }
  }

  return (
    <>
      <main
        className={cn(
          "mx-auto w-full px-6 pb-28",
          pendingNavigationActive && "pointer-events-none",
          isMapa
            ? "max-w-none px-0 pb-0 pt-0"
            : "max-w-7xl pt-[calc(var(--app-header-height,96px)+0.75rem)]"
        )}
        data-pending-navigation={pendingNavigationActive ? "true" : "false"}
        data-pending-resolved={pendingNavigationResolved ? "true" : "false"}
      >
        {shellContent}
      </main>
      <MapProgressTransitionLayer progress={progress} />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] z-20 hidden px-4 lg:block"
      >
        <div className="mx-auto w-full max-w-[1320px] pl-[12.75rem] pr-[4.75rem]">
          {showMapBottomBar ? (
            <div
              className={cn(
                "pointer-events-auto w-full transition-opacity duration-200",
                hideActualMapBar ? "opacity-0" : "opacity-100"
              )}
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
              />
            </div>
          ) : (
            <div data-progress-ghost-slot="map-bottom" className="h-[53px] w-full opacity-0" />
          )}
        </div>
      </div>
      <MapTransitionCoordinator />
    </>
  );
}
