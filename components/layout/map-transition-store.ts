"use client";

import { useSyncExternalStore } from "react";

export type MapTransitionSource = "summary-link" | "top-nav-map" | "top-nav-summary" | null;
export type LauncherMode = "default" | "compact";
export type ProgressSlot = "summary" | "map-bottom";
export type ProgressSourceRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type MapTransitionState = {
  pathname: string;
  transitionSource: MapTransitionSource;
  transitioning: boolean;
  launcherMode: LauncherMode;
  progressSourceSlot: ProgressSlot | null;
  progressSourceRect: ProgressSourceRect | null;
  progressTargetSlot: ProgressSlot | null;
};

export const DEFAULT_MAP_TRANSITION_STATE: MapTransitionState = {
  pathname: "",
  transitionSource: null,
  transitioning: false,
  launcherMode: "default",
  progressSourceSlot: null,
  progressSourceRect: null,
  progressTargetSlot: null
};

const subscribers = new Set<() => void>();
let currentState: MapTransitionState = DEFAULT_MAP_TRANSITION_STATE;

export const isMapTransitionStateEqual = (
  first: MapTransitionState,
  second: MapTransitionState
) =>
  first.pathname === second.pathname &&
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
