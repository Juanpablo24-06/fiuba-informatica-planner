"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";

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

const knownSlotRects: Partial<Record<ProgressSlot, ProgressSourceRect>> = {};

const DEFAULT_STATE: MapTransitionState = {
  pathname: "",
  transitionSource: null,
  transitioning: false,
  launcherMode: "default",
  progressSourceSlot: null,
  progressSourceRect: null,
  progressTargetSlot: null
};

const MAP_TRANSITION_DURATION_MS = 480;
const NAVIGATION_HANDOFF_DELAY_MS = 110;
const MIN_DESTINATION_SETTLE_MS = 300;

const subscribers = new Set<() => void>();
let currentState: MapTransitionState = DEFAULT_STATE;

const notify = (patch: Partial<MapTransitionState>) => {
  const nextState = { ...currentState, ...patch };
  const isSame =
    nextState.pathname === currentState.pathname &&
    nextState.transitionSource === currentState.transitionSource &&
    nextState.transitioning === currentState.transitioning &&
    nextState.launcherMode === currentState.launcherMode &&
    nextState.progressSourceSlot === currentState.progressSourceSlot &&
    nextState.progressSourceRect?.left === currentState.progressSourceRect?.left &&
    nextState.progressSourceRect?.top === currentState.progressSourceRect?.top &&
    nextState.progressSourceRect?.width === currentState.progressSourceRect?.width &&
    nextState.progressSourceRect?.height === currentState.progressSourceRect?.height &&
    nextState.progressTargetSlot === currentState.progressTargetSlot;

  if (isSame) return;

  currentState = nextState;
  subscribers.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
};

const getSnapshot = () => currentState;
const getServerSnapshot = () => DEFAULT_STATE;

export const useMapTransitionState = () =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

const isRouteHref = (href: string, routePath: string) => {
  if (typeof window === "undefined") return href === routePath;

  try {
    return new URL(href, window.location.href).pathname === routePath;
  } catch {
    return href === routePath;
  }
};

const getAnchorElement = (target: EventTarget | null) => {
  if (target instanceof Element) {
    return target.closest("a[href]") as HTMLAnchorElement | null;
  }
  if (target instanceof Node) {
    return target.parentElement?.closest("a[href]") as HTMLAnchorElement | null;
  }
  return null;
};

const hasModifiedClick = (event: MouseEvent) =>
  event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;

const getProgressRect = (slot: ProgressSlot): ProgressSourceRect | null => {
  const element = document.querySelector<HTMLElement>(`[data-progress-slot='${slot}']`);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
};

const getProgressGhostRect = (slot: ProgressSlot): ProgressSourceRect | null => {
  const element = document.querySelector<HTMLElement>(`[data-progress-ghost-slot='${slot}']`);
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  };
};

const setProgressSlotHidden = (slot: ProgressSlot | null, hidden: boolean) => {
  if (!slot) return;
  const element = document.querySelector<HTMLElement>(`[data-progress-slot='${slot}']`);
  if (!element) return;

  if (hidden) {
    element.style.opacity = "0";
  } else {
    element.style.opacity = "";
  }
};

const rectDistance = (fromRect: ProgressSourceRect, toRect: ProgressSourceRect) =>
  Math.max(
    Math.abs(fromRect.left - toRect.left),
    Math.abs(fromRect.top - toRect.top),
    Math.abs(fromRect.width - toRect.width),
    Math.abs(fromRect.height - toRect.height)
  );

export function MapTransitionCoordinator() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const reducedMotionRef = useRef(false);
  const transitionStartedAtRef = useRef(0);
  const resetTimerRef = useRef<number | null>(null);
  const navigationTimerRef = useRef<number | null>(null);
  const waitForTargetFrameRef = useRef<number | null>(null);
  const cloneAnimationRef = useRef<Animation | null>(null);
  const progressCloneRef = useRef<HTMLElement | null>(null);
  const state = useMapTransitionState();

  const pinCloneToRect = useCallback((rect: ProgressSourceRect) => {
    const clone = progressCloneRef.current;
    if (!clone) return;

    Object.assign(clone.style, {
      left: `${rect.left}px`,
      top: `${rect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      transform: "translate3d(0, 0, 0) scale(1, 1)",
      opacity: "1"
    });
  }, []);

  const stopCloneAnimation = useCallback(
    (preserveCurrentFrame = false) => {
      const clone = progressCloneRef.current;
      if (!clone) return null;

      const rect = clone.getBoundingClientRect();
      if (cloneAnimationRef.current) {
        cloneAnimationRef.current.oncancel = null;
        cloneAnimationRef.current.onfinish = null;
        cloneAnimationRef.current.cancel();
        cloneAnimationRef.current = null;
      }

      const pinnedRect = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };

      if (preserveCurrentFrame) {
        pinCloneToRect(pinnedRect);
      }

      return pinnedRect;
    },
    [pinCloneToRect]
  );

  const clearTransitionClone = useCallback(() => {
    if (waitForTargetFrameRef.current !== null) {
      window.cancelAnimationFrame(waitForTargetFrameRef.current);
      waitForTargetFrameRef.current = null;
    }

    setProgressSlotHidden(currentState.progressSourceSlot, false);
    setProgressSlotHidden(currentState.progressTargetSlot, false);
    stopCloneAnimation();

    progressCloneRef.current?.remove();
    progressCloneRef.current = null;
  }, [stopCloneAnimation]);

  const animateCloneBetweenRects = useCallback(
    (
      fromRect: ProgressSourceRect,
      toRect: ProgressSourceRect,
      onFinish?: () => void,
      duration = MAP_TRANSITION_DURATION_MS
    ) => {
      const clone = progressCloneRef.current;
      if (!clone) return false;

      stopCloneAnimation();
      pinCloneToRect(fromRect);

      cloneAnimationRef.current = clone.animate(
        [
          {
            transform: "translate3d(0, 0, 0) scale(1, 1)",
            opacity: 1
          },
          {
            transform: `translate3d(${toRect.left - fromRect.left}px, ${toRect.top - fromRect.top}px, 0) scale(${toRect.width / fromRect.width}, ${toRect.height / fromRect.height})`,
            opacity: 1
          }
        ],
        {
          duration,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "forwards"
        }
      );

      cloneAnimationRef.current.onfinish = () => {
        cloneAnimationRef.current = null;
        pinCloneToRect(toRect);
        onFinish?.();
      };
      cloneAnimationRef.current.oncancel = () => {
        cloneAnimationRef.current = null;
      };
      return true;
    },
    [pinCloneToRect, stopCloneAnimation]
  );

  const finishTransition = useCallback(
    (immediate = false) => {
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }

      resetTimerRef.current = window.setTimeout(() => {
        clearTransitionClone();
        notify({
          transitionSource: null,
          transitioning: false,
          launcherMode: currentState.pathname.startsWith("/mapa") ? "compact" : "default",
          progressSourceSlot: null,
          progressSourceRect: null,
          progressTargetSlot: null
        });
        resetTimerRef.current = null;
      }, immediate || reducedMotionRef.current ? 0 : MAP_TRANSITION_DURATION_MS);
    },
    [clearTransitionClone]
  );

  const spawnProgressClone = useCallback((sourceSlot: ProgressSlot, sourceRect: ProgressSourceRect | null) => {
    if (!sourceRect) return false;

    const sourceElement = document.querySelector<HTMLElement>(`[data-progress-slot='${sourceSlot}']`);
    if (!sourceElement) return false;

    clearTransitionClone();

    const clone = sourceElement.cloneNode(true) as HTMLElement;
    clone.querySelectorAll<HTMLElement>("[data-progress-tooltip='true']").forEach((node) => {
      node.remove();
    });
    clone.querySelectorAll<HTMLElement>("*").forEach((node) => {
      node.style.transition = "none";
      node.style.animation = "none";
      node.style.willChange = "auto";
    });
    clone.dataset.progressTransitionClone = "true";
    clone.setAttribute("aria-hidden", "true");
    Object.assign(clone.style, {
      position: "fixed",
      left: `${sourceRect.left}px`,
      top: `${sourceRect.top}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`,
      margin: "0",
      zIndex: "90",
      pointerEvents: "none",
      transformOrigin: "top left",
      transition: "none",
      willChange: "transform, opacity",
      contain: "layout paint style",
      backfaceVisibility: "hidden",
      filter: "none",
      backdropFilter: "none",
      opacity: "1",
      viewTransitionName: "none"
    });

    document.body.appendChild(clone);
    setProgressSlotHidden(sourceSlot, true);
    progressCloneRef.current = clone;
    return true;
  }, [clearTransitionClone]);

  const getTargetRect = useCallback(
    (slot: ProgressSlot, sourceRect: ProgressSourceRect) => {
      const liveRect = getProgressRect(slot);
      if (liveRect) {
        knownSlotRects[slot] = liveRect;
        return liveRect;
      }

      const ghostRect = getProgressGhostRect(slot);
      if (ghostRect) {
        knownSlotRects[slot] = ghostRect;
        return ghostRect;
      }

      if (knownSlotRects[slot]) return knownSlotRects[slot]!;
      return null;
    },
    []
  );

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedMotionRef.current = query.matches;
    };

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/mapa");
  }, [router]);

  useEffect(() => {
    const updateKnownRects = () => {
      (["summary", "map-bottom"] as const).forEach((slot) => {
        const rect = getProgressRect(slot);
        if (rect) {
          knownSlotRects[slot] = rect;
        }
      });
    };

    updateKnownRects();
    const frame = window.requestAnimationFrame(updateKnownRects);
    window.addEventListener("resize", updateKnownRects);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateKnownRects);
    };
  }, [pathname]);

  useEffect(() => {
    notify(
      currentState.transitioning
        ? { pathname }
        : {
            pathname,
            launcherMode: pathname.startsWith("/mapa") ? "compact" : "default"
          }
    );

    if (!pathname.startsWith("/mapa") && !currentState.transitioning) {
      clearTransitionClone();
      notify({
        transitionSource: null,
        transitioning: false,
        progressSourceSlot: null,
        progressSourceRect: null,
        progressTargetSlot: null
      });
    }
  }, [clearTransitionClone, pathname]);

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

  useEffect(() => {
    const handleClickCapture = (event: MouseEvent) => {
      if (hasModifiedClick(event)) return;
      if (currentState.transitioning) return;

      const anchor = getAnchorElement(event.target);
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      const goingToMap = isRouteHref(href, "/mapa");
      const goingToSummary = isRouteHref(href, "/");
      if (!goingToMap && !goingToSummary) return;
      if (goingToMap && pathname.startsWith("/mapa")) return;
      if (goingToSummary && pathname === "/") return;

      event.preventDefault();

      const source: MapTransitionSource = goingToMap
        ? anchor.dataset.mapTransitionSource === "top-nav-map"
          ? "top-nav-map"
          : "summary-link"
        : "top-nav-summary";
      const sourceSlot: ProgressSlot = pathname.startsWith("/mapa") ? "map-bottom" : "summary";
      const targetSlot: ProgressSlot = goingToMap ? "map-bottom" : "summary";
      const sourceRect = getProgressRect(sourceSlot);
      const hasClone = !reducedMotionRef.current && spawnProgressClone(sourceSlot, sourceRect);

      notify({
        transitionSource: source,
        transitioning: true,
        launcherMode: goingToMap ? "compact" : currentState.launcherMode,
        progressSourceSlot: sourceSlot,
        progressSourceRect: sourceRect,
        progressTargetSlot: targetSlot
      });
      transitionStartedAtRef.current = performance.now();

      const destinationHref = goingToMap ? "/mapa" : "/";
      if (hasClone && sourceRect) {
        const targetRect = getTargetRect(targetSlot, sourceRect);
        if (targetRect) {
          animateCloneBetweenRects(sourceRect, targetRect);
        }
      }
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
      }
      navigationTimerRef.current = window.setTimeout(
        () => {
      router.push(destinationHref, { scroll: false });
          navigationTimerRef.current = null;
        },
        reducedMotionRef.current ? 0 : NAVIGATION_HANDOFF_DELAY_MS
      );

      if (!hasClone) {
        finishTransition();
      }
    };

    document.addEventListener("click", handleClickCapture, true);
    return () => document.removeEventListener("click", handleClickCapture, true);
  }, [animateCloneBetweenRects, finishTransition, getTargetRect, pathname, router, spawnProgressClone]);

  useEffect(() => {
    const targetSlot = state.progressTargetSlot;
    const onTargetPage =
      (targetSlot === "map-bottom" && pathname.startsWith("/mapa")) ||
      (targetSlot === "summary" && pathname === "/");

    if (!onTargetPage) return;
    if (!state.transitioning || !state.progressSourceRect || !progressCloneRef.current) return;
    if (reducedMotionRef.current) {
      finishTransition(true);
      return;
    }
    const animateCloneToMapBar = () => {
      const target = document.querySelector<HTMLElement>(`[data-progress-slot='${targetSlot}']`);
      const clone = progressCloneRef.current;

      if (!target || !clone) {
        waitForTargetFrameRef.current = window.requestAnimationFrame(animateCloneToMapBar);
        return;
      }

      const elapsed = performance.now() - transitionStartedAtRef.current;
      if (elapsed < MIN_DESTINATION_SETTLE_MS) {
        waitForTargetFrameRef.current = window.requestAnimationFrame(animateCloneToMapBar);
        return;
      }

      const currentRect =
        stopCloneAnimation(true) ??
        ({
          left: clone.getBoundingClientRect().left,
          top: clone.getBoundingClientRect().top,
          width: clone.getBoundingClientRect().width,
          height: clone.getBoundingClientRect().height
        } satisfies ProgressSourceRect);
      const targetRect = target.getBoundingClientRect();
      setProgressSlotHidden(targetSlot, true);
      if (targetSlot === "map-bottom") {
        notify({
          launcherMode: "compact"
        });
      }

      const nextRect = {
        left: targetRect.left,
        top: targetRect.top,
        width: targetRect.width,
        height: targetRect.height
      } satisfies ProgressSourceRect;

      if (rectDistance(currentRect, nextRect) <= 10) {
        pinCloneToRect(nextRect);
        finishTransition(true);
        return;
      }
      pinCloneToRect(nextRect);
      finishTransition(true);
    };

    animateCloneToMapBar();

    return () => {
      if (waitForTargetFrameRef.current !== null) {
        window.cancelAnimationFrame(waitForTargetFrameRef.current);
        waitForTargetFrameRef.current = null;
      }
    };
  }, [
    animateCloneBetweenRects,
    pinCloneToRect,
    finishTransition,
    pathname,
    state.progressSourceRect,
    state.progressTargetSlot,
    state.transitioning,
    stopCloneAnimation
  ]);

  useEffect(
    () => () => {
      clearTransitionClone();
      if (navigationTimerRef.current !== null) {
        window.clearTimeout(navigationTimerRef.current);
      }
      if (resetTimerRef.current !== null) {
        window.clearTimeout(resetTimerRef.current);
      }
    },
    [clearTransitionClone]
  );

  return null;
}
