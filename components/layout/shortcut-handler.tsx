"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { getProgressRect } from "@/components/layout/map-progress-transition";
import { buildPendingNavigationState, setMapTransitionState } from "@/components/layout/map-transition-store";

const isTypingTarget = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
};

export default function ShortcutHandler() {
  const router = useRouter();
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.shiftKey || isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();
      const destination =
        key === "d" ? "/" : key === "m" ? "/mapa" : key === "h" ? "/horario" : null;
      if (destination) {
        const pendingState = buildPendingNavigationState(pathname, destination);
        const progressSourceRect = pendingState.animateMapBar ? getProgressRect("summary") : null;
        setMapTransitionState({
          ...pendingState,
          animateMapBar: pendingState.animateMapBar && Boolean(progressSourceRect),
          transitioning: true,
          launcherMode: destination === "/mapa" ? "compact" : "default",
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
  }, [pathname, router]);

  return null;
}
