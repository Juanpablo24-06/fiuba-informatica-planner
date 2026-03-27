"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  getRemainingLoaderDuration,
  MAP_TRANSITION_DURATION_MS
} from "@/components/layout/map-progress-transition";
import {
  getDisplaySection,
  isPendingNavigationResolved,
  setMapTransitionState,
  useMapTransitionState
} from "@/components/layout/map-transition-store";

export { useMapTransitionState } from "@/components/layout/map-transition-store";

const PENDING_NAVIGATION_TIMEOUT_MS = 4500;
const getLauncherMode = (pathname: string) =>
  pathname.startsWith("/mapa") ? "compact" : "default";

export function MapTransitionCoordinator() {
  const pathname = usePathname() ?? "";
  const state = useMapTransitionState();

  useEffect(() => {
    const displaySection = getDisplaySection(pathname, state.pendingSection);
    const launcherMode = displaySection === "/mapa" ? "compact" : "default";

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

    const timeout = window.setTimeout(() => {
      setMapTransitionState({
        mapEntryPhase: "loader",
        loaderStartedAt: Date.now()
      });
    }, MAP_TRANSITION_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [state.animateMapBar, state.mapEntryPhase, state.transitioning]);

  useEffect(() => {
    if (
      !state.transitioning ||
      state.mapEntryPhase !== "loader" ||
      !isPendingNavigationResolved(pathname, state.pendingPath)
    ) {
      return;
    }

    const remainingLoaderMs = getRemainingLoaderDuration(
      state.loaderStartedAt,
      Date.now(),
      state.minimumLoaderMs
    );

    const timeout = window.setTimeout(() => {
      setMapTransitionState({
        pendingPath: null,
        pendingSection: null,
        loaderKind: null,
        startedFromSection: null,
        mapEntryPhase: "idle",
        transitionStartedAt: null,
        loaderStartedAt: null,
        minimumLoaderMs: 0,
        showMapBar: pathname.startsWith("/mapa"),
        animateMapBar: false,
        transitionSource: null,
        transitioning: false,
        launcherMode: getLauncherMode(pathname),
        progressSourceSlot: null,
        progressSourceRect: null,
        progressTargetSlot: null
      });
    }, remainingLoaderMs);

    return () => window.clearTimeout(timeout);
  }, [
    pathname,
    state.loaderStartedAt,
    state.mapEntryPhase,
    state.minimumLoaderMs,
    state.pendingPath,
    state.transitioning
  ]);

  useEffect(() => {
    if (!state.transitioning || !state.pendingPath) return;

    const timeout = window.setTimeout(() => {
      setMapTransitionState({
        pendingPath: null,
        pendingSection: null,
        loaderKind: null,
        startedFromSection: null,
        mapEntryPhase: "idle",
        transitionStartedAt: null,
        loaderStartedAt: null,
        minimumLoaderMs: 0,
        showMapBar: pathname.startsWith("/mapa"),
        animateMapBar: false,
        transitionSource: null,
        transitioning: false,
        launcherMode: getLauncherMode(pathname),
        progressSourceSlot: null,
        progressSourceRect: null,
        progressTargetSlot: null
      });
    }, PENDING_NAVIGATION_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [pathname, state.pendingPath, state.transitioning]);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.mapTransitionState = state.transitioning ? "active" : "idle";
    root.dataset.mapTransitionSource = state.transitionSource ?? "";
    root.dataset.mapLauncherMode = state.launcherMode;
    root.dataset.mapEntryPhase = state.mapEntryPhase;

    return () => {
      delete root.dataset.mapTransitionState;
      delete root.dataset.mapTransitionSource;
      delete root.dataset.mapLauncherMode;
      delete root.dataset.mapEntryPhase;
    };
  }, [state.launcherMode, state.mapEntryPhase, state.transitionSource, state.transitioning]);

  return null;
}
