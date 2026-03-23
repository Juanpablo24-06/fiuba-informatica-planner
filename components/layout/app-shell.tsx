"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import AppLoadingSurface from "@/components/layout/app-loading-surface";
import {
  MapTransitionCoordinator,
  useMapTransitionState
} from "@/components/layout/map-transition-coordinator";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const isMapa = pathname.startsWith("/mapa");
  const mapTransitionState = useMapTransitionState();

  return (
    <>
      <main
        className={cn(
          "mx-auto w-full px-6 pb-28 transition-opacity duration-[220ms]",
          mapTransitionState.transitioning && "pointer-events-none opacity-0",
          isMapa
            ? "max-w-none px-0 pb-0 pt-0"
            : "max-w-7xl pt-[calc(var(--app-header-height,96px)+0.75rem)]"
        )}
      >
        {children}
      </main>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-0 z-30 overflow-hidden transition-opacity duration-[220ms]",
          mapTransitionState.transitioning ? "opacity-100" : "opacity-0"
        )}
      >
        <div className="absolute inset-0 overflow-hidden pt-[calc(var(--app-header-height,96px)+0.75rem)]">
          <AppLoadingSurface className="px-6" />
        </div>
      </div>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] z-20 hidden px-4 lg:block"
      >
        <div className="mx-auto w-full max-w-[1320px] pl-[12.75rem] pr-[4.75rem]">
          <div data-progress-ghost-slot="map-bottom" className="h-[53px] w-full opacity-0" />
        </div>
      </div>
      <MapTransitionCoordinator />
    </>
  );
}
