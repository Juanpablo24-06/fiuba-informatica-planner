"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getProgressRect } from "@/components/layout/map-progress-transition";
import {
  buildPendingNavigationStateFromCurrent,
  createTransitionId,
  getDisplaySection,
  getLauncherModeForSection,
  setMapTransitionState,
  useMapTransitionState
} from "@/components/layout/map-transition-store";

const isTypingTarget = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
};

export default function ShortcutHandler() {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const transitionState = useMapTransitionState();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey || isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const destination =
        key === "d" ? "/" : key === "m" ? "/mapa" : key === "h" ? "/horario" : null;
      if (destination) {
        const currentSection = getDisplaySection(pathname, transitionState.pendingSection);
        if (currentSection === destination) return;

        const startedAt = Date.now();
        const transitionId = createTransitionId();
        const pendingState = buildPendingNavigationStateFromCurrent({
          pathname,
          pendingSection: transitionState.pendingSection,
          toPathname: destination,
          startedAt,
          transitionId
        });
        const progressSourceRect = pendingState.animateMapBar ? getProgressRect("summary") : null;
        const shouldAnimateMapBar = pendingState.animateMapBar && Boolean(progressSourceRect);
        setMapTransitionState({
          ...pendingState,
          animateMapBar: shouldAnimateMapBar,
          mapEntryPhase: shouldAnimateMapBar ? pendingState.mapEntryPhase : "loader",
          loaderStartedAt: shouldAnimateMapBar ? pendingState.loaderStartedAt : startedAt,
          transitioning: true,
          launcherMode: getLauncherModeForSection(destination),
          progressSourceSlot: progressSourceRect ? "summary" : null,
          progressSourceRect,
          progressTargetSlot: pendingState.showMapBar ? "map-bottom" : null
        });
        router.push(destination);
      }
      if (key === "l") {
        router.push("/login");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pathname, router, transitionState.pendingSection]);

  return null;
}
