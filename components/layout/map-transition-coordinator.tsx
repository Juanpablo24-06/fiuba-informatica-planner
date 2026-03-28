"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  getRemainingLoaderDuration,
  MAP_BAR_DROP_SETTLE_MS,
  MAP_TRANSITION_DURATION_MS
} from "@/components/layout/map-progress-transition";
import {
  buildTransitionResetPatch,
  getCurrentMapTransitionState,
  getDisplaySection,
  getLauncherModeForSection,
  isCurrentTransition,
  isPendingNavigationResolved,
  setMapTransitionState,
  useMapTransitionState
} from "@/components/layout/map-transition-store";

export { useMapTransitionState } from "@/components/layout/map-transition-store";
export function MapTransitionCoordinator() {
  const pathname = usePathname() ?? "";
  const state = useMapTransitionState();

  useEffect(() => {
    const displaySection = getDisplaySection(pathname, state.pendingSection);
    const launcherMode = getLauncherModeForSection(displaySection);

    const patch: Parameters<typeof setMapTransitionState>[0] = {};

    if (state.pathname !== pathname) {
      patch.pathname = pathname;
    }

    if (state.launcherMode !== launcherMode) {
      patch.launcherMode = launcherMode;
    }

    if (!state.transitioning) {
      if (state.showMapBar !== pathname.startsWith("/mapa")) {
        patch.showMapBar = pathname.startsWith("/mapa");
      }
    }

    if (Object.keys(patch).length > 0) {
      setMapTransitionState(patch);
    }
  }, [
    pathname,
    state.pendingSection,
    state.showMapBar,
    state.transitioning,
    state.pathname,
    state.launcherMode
  ]);

  useEffect(() => {
    if (
      !state.transitioning ||
      state.mapEntryPhase !== "bar-drop" ||
      !state.animateMapBar
    ) {
      return;
    }

    const transitionId = state.transitionId;
    const timeout = window.setTimeout(() => {
      if (!isCurrentTransition(getCurrentMapTransitionState(), transitionId)) return;
      setMapTransitionState({
        mapEntryPhase: "loader",
        loaderStartedAt: Date.now()
      });
    }, MAP_TRANSITION_DURATION_MS + MAP_BAR_DROP_SETTLE_MS);

    return () => window.clearTimeout(timeout);
  }, [state.animateMapBar, state.mapEntryPhase, state.transitionId, state.transitioning]);

  useEffect(() => {
    if (
      !state.transitioning ||
      state.mapEntryPhase !== "loader" ||
      !isPendingNavigationResolved(pathname, state.pendingPath) ||
      (state.loaderKind === "map" && !state.mapContentReady)
    ) {
      return;
    }

    const remainingLoaderMs = getRemainingLoaderDuration(
      state.loaderStartedAt,
      Date.now(),
      state.minimumLoaderMs
    );
    const transitionId = state.transitionId;

    const timeout = window.setTimeout(() => {
      const currentState = getCurrentMapTransitionState();
      if (!isCurrentTransition(currentState, transitionId)) return;

      const currentPathname = currentState.pathname || pathname;
      setMapTransitionState(buildTransitionResetPatch(currentPathname));
    }, remainingLoaderMs);

    return () => window.clearTimeout(timeout);
  }, [
    pathname,
    state.loaderStartedAt,
    state.loaderKind,
    state.mapContentReady,
    state.mapEntryPhase,
    state.minimumLoaderMs,
    state.pendingPath,
    state.transitionId,
    state.transitioning
  ]);

  useEffect(() => {
    const root = document.documentElement;
    const displaySection = getDisplaySection(pathname, state.pendingSection);
    const appSection =
      displaySection === "/" ? "summary" : displaySection.slice(1).replace("/", "-");
    root.dataset.mapTransitionState = state.transitioning ? "active" : "idle";
    root.dataset.mapTransitionSource = state.transitionSource ?? "";
    root.dataset.mapLauncherMode = state.launcherMode;
    root.dataset.mapEntryPhase = state.mapEntryPhase;
    root.dataset.appSection = appSection;

    return () => {
      delete root.dataset.mapTransitionState;
      delete root.dataset.mapTransitionSource;
      delete root.dataset.mapLauncherMode;
      delete root.dataset.mapEntryPhase;
      delete root.dataset.appSection;
    };
  }, [
    pathname,
    state.launcherMode,
    state.mapEntryPhase,
    state.pendingSection,
    state.transitionSource,
    state.transitioning
  ]);

  return null;
}
