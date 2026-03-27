"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  MAP_LOADING_FLOW_NODES,
  MAP_LOADING_FLOW_PATHS,
  getMapLoadingNodeTint
} from "@/lib/map/map-loading";

type MapSceneBackgroundProps = {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function MapSceneBackground({
  children,
  className,
  contentClassName
}: MapSceneBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      data-map-scene-background="true"
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className="absolute inset-0 subtle-grid opacity-[0.08]"
        style={{ backgroundPosition: "0 0, 0 0" }}
      />
      <div className="absolute inset-x-0 top-0 h-[28vh] bg-[radial-gradient(circle_at_top,_rgb(var(--color-accent)_/_0.12),_transparent_72%)] opacity-80" />

      <div className="absolute inset-0 flex items-start justify-center px-6">
        <div className="relative mt-[calc(var(--app-header-height,96px)*0.18)] h-[min(50vw,380px)] w-full max-w-[1100px] opacity-[0.32]">
          <svg
            viewBox="0 0 1000 380"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {MAP_LOADING_FLOW_PATHS.map((path) => (
              <path
                key={path}
                d={path}
                fill="none"
                stroke="rgb(var(--color-border) / 0.18)"
                strokeWidth="1.35"
                strokeLinecap="round"
              />
            ))}
          </svg>

          {MAP_LOADING_FLOW_NODES.map((node, index) => (
            <div
              key={node.id}
              className="absolute rounded-[1.35rem] border border-border/25 bg-transparent"
              style={{
                left: `${(node.x / 1000) * 100}%`,
                top: `${(node.y / 380) * 100}%`,
                width: `${node.width}px`,
                height: `${node.height}px`
              }}
            >
              <div className="pointer-events-none absolute inset-[1px] rounded-[calc(1.35rem-1px)] border border-white/5" />
              <div className="relative flex h-full items-center gap-2 px-4">
                <span
                  className="h-2.5 w-2.5 rounded-full opacity-70"
                  style={{ backgroundColor: getMapLoadingNodeTint(index) }}
                />
                <span className="h-2 w-14 rounded-full bg-border/25" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {children ? (
        <div className={cn("relative flex min-h-[100svh] items-center justify-center", contentClassName)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
