"use client";

import { useSyncExternalStore } from "react";
import { MINIMUM_SECTION_LOADER_MS } from "@/components/layout/map-progress-transition";

export type MapTransitionSource = "summary-link" | "top-nav-map" | "top-nav-summary" | null;
export type LauncherMode = "default" | "compact";
export type ProgressSlot = "summary" | "map-bottom";
export type AppSection = "/" | "/mapa" | "/horario" | "/admin";
export type LoaderKind = "app" | "map" | null;
export type MapEntryPhase = "idle" | "bar-drop" | "loader";
export type ProgressSourceRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type MapTransitionState = {
  pathname: string;
  pendingPath: AppSection | null;
  pendingSection: AppSection | null;
  loaderKind: LoaderKind;
  startedFromSection: AppSection | null;
  mapEntryPhase: MapEntryPhase;
  transitionStartedAt: number | null;
  loaderStartedAt: number | null;
  minimumLoaderMs: number;
  showMapBar: boolean;
  animateMapBar: boolean;
  transitionSource: MapTransitionSource;
  transitioning: boolean;
  launcherMode: LauncherMode;
  progressSourceSlot: ProgressSlot | null;
  progressSourceRect: ProgressSourceRect | null;
  progressTargetSlot: ProgressSlot | null;
};

export const DEFAULT_MAP_TRANSITION_STATE: MapTransitionState = {
  pathname: "",
  pendingPath: null,
  pendingSection: null,
  loaderKind: null,
  startedFromSection: null,
  mapEntryPhase: "idle",
  transitionStartedAt: null,
  loaderStartedAt: null,
  minimumLoaderMs: 0,
  showMapBar: false,
  animateMapBar: false,
  transitionSource: null,
  transitioning: false,
  launcherMode: "default",
  progressSourceSlot: null,
  progressSourceRect: null,
  progressTargetSlot: null
};

export const getSectionForPathname = (pathname: string): AppSection => {
  if (pathname.startsWith("/mapa")) return "/mapa";
  if (pathname.startsWith("/horario")) return "/horario";
  if (pathname.startsWith("/admin")) return "/admin";
  return "/";
};

export const getDisplaySection = (
  pathname: string,
  pendingSection: AppSection | null
): AppSection => pendingSection ?? getSectionForPathname(pathname);

export const isPendingNavigationResolved = (
  pathname: string,
  pendingPath: AppSection | null
) => !pendingPath || getSectionForPathname(pathname) === pendingPath;

export const buildPendingNavigationState = (
  fromPathname: string,
  toPathname: string,
  startedAt = Date.now()
) => {
  const startedFromSection = getSectionForPathname(fromPathname);
  const pendingSection = getSectionForPathname(toPathname);
  const isMapDestination = pendingSection === "/mapa";
  const isSummaryToMap = startedFromSection === "/" && isMapDestination;

  return {
    pendingPath: pendingSection,
    pendingSection,
    loaderKind: isMapDestination ? ("map" as const) : ("app" as const),
    startedFromSection,
    mapEntryPhase: isSummaryToMap ? ("bar-drop" as const) : ("loader" as const),
    transitionStartedAt: startedAt,
    loaderStartedAt: isSummaryToMap ? null : startedAt,
    minimumLoaderMs: MINIMUM_SECTION_LOADER_MS,
    showMapBar: isMapDestination,
    animateMapBar: isSummaryToMap
  };
};

const subscribers = new Set<() => void>();
let currentState: MapTransitionState = DEFAULT_MAP_TRANSITION_STATE;

export const isMapTransitionStateEqual = (
  first: MapTransitionState,
  second: MapTransitionState
) =>
  first.pathname === second.pathname &&
  first.pendingPath === second.pendingPath &&
  first.pendingSection === second.pendingSection &&
  first.loaderKind === second.loaderKind &&
  first.startedFromSection === second.startedFromSection &&
  first.mapEntryPhase === second.mapEntryPhase &&
  first.transitionStartedAt === second.transitionStartedAt &&
  first.loaderStartedAt === second.loaderStartedAt &&
  first.minimumLoaderMs === second.minimumLoaderMs &&
  first.showMapBar === second.showMapBar &&
  first.animateMapBar === second.animateMapBar &&
  first.transitionSource === second.transitionSource &&
  first.transitioning === second.transitioning &&
  first.launcherMode === second.launcherMode &&
  first.progressSourceSlot === second.progressSourceSlot &&
  first.progressSourceRect?.left === second.progressSourceRect?.left &&
  first.progressSourceRect?.top === second.progressSourceRect?.top &&
  first.progressSourceRect?.width === second.progressSourceRect?.width &&
  first.progressSourceRect?.height === second.progressSourceRect?.height &&
  first.progressTargetSlot === second.progressTargetSlot;

export const subscribeMapTransition = (listener: () => void) => {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
};

export const getCurrentMapTransitionState = () => currentState;

const getServerSnapshot = () => DEFAULT_MAP_TRANSITION_STATE;

export const setMapTransitionState = (patch: Partial<MapTransitionState>) => {
  const nextState = { ...currentState, ...patch };
  if (isMapTransitionStateEqual(nextState, currentState)) return;

  currentState = nextState;
  subscribers.forEach((listener) => listener());
};

export const useMapTransitionState = () =>
  useSyncExternalStore(
    subscribeMapTransition,
    getCurrentMapTransitionState,
    getServerSnapshot
  );
