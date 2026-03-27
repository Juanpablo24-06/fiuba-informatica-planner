"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  setMapTransitionState,
  useMapTransitionState
} from "@/components/layout/map-transition-store";

export { useMapTransitionState } from "@/components/layout/map-transition-store";

export function MapTransitionCoordinator() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const state = useMapTransitionState();

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/mapa");
  }, [router]);

  useEffect(() => {
    setMapTransitionState({
      pathname,
      transitionSource: null,
      transitioning: false,
      launcherMode: pathname.startsWith("/mapa") ? "compact" : "default",
      progressSourceSlot: null,
      progressSourceRect: null,
      progressTargetSlot: null
    });
  }, [pathname]);

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
