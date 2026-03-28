"use client";

import { usePathname } from "next/navigation";
import SummaryProgressBar from "@/components/dashboard/summary-progress-bar";
import AdminLoadingSurface from "@/components/layout/admin-loading-surface";
import AppLoadingSurface from "@/components/layout/app-loading-surface";
import HorarioLoadingSurface from "@/components/layout/horario-loading-surface";
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
  getDisplaySection
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
  const pendingNavigationActive = mapTransitionState.transitioning;
  const mapSceneActive =
    isMapa || (pendingNavigationActive && mapTransitionState.loaderKind === "map");
  const showMapBottomBar = mapTransitionState.showMapBar;
  const hideActualMapBar =
    pendingNavigationActive &&
    mapTransitionState.showMapBar &&
    mapTransitionState.animateMapBar;
  const hideRouteContent = pendingNavigationActive;

  let loadingContent: React.ReactNode = null;

  if (pendingNavigationActive) {
    if (mapTransitionState.loaderKind === "map") {
      loadingContent =
        mapTransitionState.mapEntryPhase === "bar-drop"
          ? (
            <div className="relative min-h-[100svh]">
              <MapSceneBackground position="fixed" />
            </div>
          )
          : (
            <div className="relative min-h-[100svh]">
              <div className="relative z-20">
                <MapLoadingStage backgroundPosition="fixed" />
              </div>
            </div>
          );
    } else if (mapTransitionState.pendingSection === "/agenda") {
      loadingContent = <HorarioLoadingSurface />;
    } else if (mapTransitionState.pendingSection === "/admin") {
      loadingContent = <AdminLoadingSurface />;
    } else {
      loadingContent = <AppLoadingSurface />;
    }
  }

  return (
    <>
      <main
        className={cn(
          "mx-auto w-full px-6 pb-28",
          pendingNavigationActive && "pointer-events-none",
          mapSceneActive
            ? "max-w-none px-0 pb-0 pt-0"
            : "max-w-7xl pt-[calc(var(--app-header-height,96px)+0.75rem)]"
        )}
        data-pending-navigation={pendingNavigationActive ? "true" : "false"}
        data-pending-resolved={pendingNavigationActive ? "false" : "true"}
      >
        <div className={cn("relative", mapSceneActive && "min-h-[100svh]")}>
          <div
            aria-hidden={hideRouteContent}
            className={cn(
              hideRouteContent
                ? "pointer-events-none hidden absolute inset-0 z-10"
                : "relative z-10"
            )}
          >
            {children}
          </div>

          {pendingNavigationActive ? <div className="relative z-20">{loadingContent}</div> : null}
        </div>
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
                "pointer-events-auto w-full",
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
