"use client";

import {
  MAP_LOADING_FLOW_NODES,
  MAP_LOADING_FLOW_PATHS,
  getMapLoadingNodeTint
} from "@/lib/map/map-loading";

export default function MapLoadingStage() {
  return (
    <div className="pointer-events-none flex min-h-[100svh] items-center justify-center px-6 pb-[calc(var(--synapse-launcher-height,56px)+2rem)] pt-[calc(var(--app-header-height,96px)+1.75rem)]">
      <div className="relative w-full max-w-[900px]" data-testid="map-loader-diagram">
        <svg
          viewBox="0 0 1000 380"
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {MAP_LOADING_FLOW_PATHS.map((path) => (
            <path
              key={path}
              d={path}
              fill="none"
              stroke="rgb(var(--color-border) / 0.28)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          ))}
          {MAP_LOADING_FLOW_PATHS.map((path, index) => (
            <path
              key={`${path}-glow`}
              d={path}
              fill="none"
              stroke={
                index % 2 === 0
                  ? "rgb(var(--color-accent) / 0.82)"
                  : "rgb(var(--color-accent-2) / 0.74)"
              }
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="12 18"
              className="animate-map-loader-line"
              style={{ animationDelay: `${index * 0.12}s` }}
            />
          ))}
        </svg>

        <div className="relative min-h-[320px]">
          {MAP_LOADING_FLOW_NODES.map((node, index) => (
            <div
              key={node.id}
              data-testid="map-loader-node"
              className="absolute rounded-[1.35rem] border border-border/45 bg-transparent animate-map-loader-node"
              style={{
                left: `${(node.x / 1000) * 100}%`,
                top: `${(node.y / 380) * 100}%`,
                width: `${node.width}px`,
                height: `${node.height}px`,
                animationDelay: node.delay
              }}
            >
              <div className="pointer-events-none absolute inset-[1px] rounded-[calc(1.35rem-1px)] border border-white/5" />
              <div className="relative flex h-full flex-col justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full animate-map-loader-pulse"
                    style={{
                      backgroundColor: getMapLoadingNodeTint(index),
                      animationDelay: `${index * 0.11}s`
                    }}
                  />
                  <span className="h-2 w-14 rounded-full bg-border/35" />
                </div>
                <div className="space-y-2">
                  <div className="h-2.5 rounded-full bg-border/35" />
                  <div className="h-2.5 w-[72%] rounded-full bg-border/22" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
