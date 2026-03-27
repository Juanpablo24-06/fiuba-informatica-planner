"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  getDisplaySection,
  isPendingNavigationResolved,
  setMapTransitionState,
  useMapTransitionState
} from "@/components/layout/map-transition-store";

export { useMapTransitionState } from "@/components/layout/map-transition-store";

const PENDING_NAVIGATION_TIMEOUT_MS = 4500;

export function MapTransitionCoordinator() {
  const pathname = usePathname() ?? "";
  const state = useMapTransitionState();

  useEffect(() => {
    const resolved = isPendingNavigationResolved(pathname, state.pendingPath);
    const displaySection = getDisplaySection(pathname, resolved ? null : state.pendingSection);

    setMapTransitionState({
      pathname,
      pendingPath: resolved ? null : state.pendingPath,
      pendingSection: resolved ? null : state.pendingSection,
      loaderKind: resolved ? null : state.loaderKind,
      startedFromSection: resolved ? null : state.startedFromSection,
      showMapBar: resolved ? pathname.startsWith("/mapa") : state.showMapBar,
      animateMapBar: resolved ? false : state.animateMapBar,
      transitionSource: resolved ? null : state.transitionSource,
      transitioning: resolved ? false : state.transitioning,
      launcherMode: displaySection === "/mapa" ? "compact" : "default",
      progressSourceSlot: resolved ? null : state.progressSourceSlot,
      progressSourceRect: resolved ? null : state.progressSourceRect,
      progressTargetSlot: resolved ? null : state.progressTargetSlot
    });
  }, [
    pathname,
    state.animateMapBar,
    state.loaderKind,
    state.pendingPath,
    state.pendingSection,
    state.progressSourceRect,
    state.progressSourceSlot,
    state.progressTargetSlot,
    state.showMapBar,
    state.startedFromSection,
    state.transitionSource,
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
        showMapBar: pathname.startsWith("/mapa"),
        animateMapBar: false,
        transitionSource: null,
        transitioning: false,
        launcherMode: pathname.startsWith("/mapa") ? "compact" : "default",
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

    return () => {
      delete root.dataset.mapTransitionState;
      delete root.dataset.mapTransitionSource;
      delete root.dataset.mapLauncherMode;
    };
  }, [state.launcherMode, state.transitionSource, state.transitioning]);

  return null;
}
