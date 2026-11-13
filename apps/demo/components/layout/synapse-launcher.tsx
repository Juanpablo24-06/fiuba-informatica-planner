"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import ChatPanel from "@/components/dashboard/chat-panel";
import { cn } from "@/lib/utils";
import { useMapTransitionState } from "@/components/layout/map-transition-coordinator";

export default function SynapseLauncher({ role }: { role?: "admin" | "viewer" }) {
  const launcherRef = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname() ?? "";
  const mapTransitionState = useMapTransitionState();
  const isCompact = mapTransitionState.launcherMode === "compact" || pathname.startsWith("/mapa");

  useEffect(() => {
    if (!launcherRef.current) return;
    const element = launcherRef.current;
    const update = () => {
      document.documentElement.style.setProperty("--synapse-launcher-height", `${element.offsetHeight}px`);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      ref={launcherRef}
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] z-50 px-4"
      data-scrollbar-compensate="true"
      style={{ "--scrollbar-compensation-base-padding": "16px" } as CSSProperties}
    >
      <div className="mx-auto flex h-14 w-full max-w-[1320px] items-end">
        <ChatPanel
          role={role}
          trigger={
            <button
              type="button"
              aria-label="Consultá a Synapse"
              title="Consultá a Synapse"
              className={cn(
                "pointer-events-auto inline-flex h-12 items-center overflow-hidden border border-border/70 bg-surface text-left shadow-[0_10px_24px_-18px_rgb(var(--shadow-color)/0.34)] transition-[width,transform,opacity,border-color,background-color,padding] duration-[360ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[width,transform]",
                isCompact
                  ? "ml-auto w-12 justify-center rounded-full px-0"
                  : "ml-auto w-12 justify-center rounded-full px-0 sm:mx-auto sm:w-[14.5rem] sm:justify-between sm:gap-1.5 sm:rounded-2xl sm:px-2.5 sm:hover:-translate-y-0.5 sm:hover:border-accent/45"
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/18 text-accent text-xs transition-[opacity,transform,background-color] duration-[240ms]",
                  isCompact && "h-7 w-7 bg-accent/22"
                )}
              >
                ✦
              </span>
              <span
                className={cn(
                  "flex-1 truncate text-[12px] font-medium text-muted transition-[opacity,max-width] duration-[200ms]",
                  isCompact
                    ? "pointer-events-none max-w-0 opacity-0"
                    : "pointer-events-none max-w-0 opacity-0 sm:pointer-events-auto sm:max-w-none sm:opacity-100"
                )}
              >
                Consultá a Synapse
              </span>
              <span
                className={cn(
                  "shrink-0 rounded-full border border-accent/40 px-1.5 py-0.5 text-[10px] font-semibold text-accent transition-[opacity,max-width,border-color,padding] duration-[200ms]",
                  isCompact
                    ? "pointer-events-none max-w-0 overflow-hidden border-transparent px-0 opacity-0"
                    : "pointer-events-none max-w-0 overflow-hidden border-transparent px-0 opacity-0 sm:pointer-events-auto sm:max-w-none sm:border-accent/40 sm:px-1.5 sm:opacity-100"
                )}
              >
                →
              </span>
            </button>
          }
        />
      </div>
    </div>
  );
}
