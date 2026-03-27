"use client";

import {
  MAP_LOADING_FLOW_NODES,
  MAP_LOADING_FLOW_PATHS,
  MAP_LOADING_FOOTER_SEGMENTS,
  getMapLoadingNodeTint
} from "@/lib/map/map-loading";

export default function MapLoadingStage() {
  return (
    <div className="relative min-h-[100svh] overflow-hidden map-canvas">
      <div className="absolute inset-0 subtle-grid opacity-20" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(520px 280px at 14% 20%, rgb(var(--color-accent) / 0.12), transparent 70%), radial-gradient(520px 280px at 88% 18%, rgb(var(--color-accent-3) / 0.1), transparent 72%), radial-gradient(420px 260px at 62% 86%, rgb(var(--color-accent-4) / 0.08), transparent 74%)"
        }}
      />

      <div className="mx-auto flex min-h-[100svh] w-full max-w-[1440px] items-center justify-center px-6 pb-[calc(var(--map-bottom-bar-height,92px)+2rem)] pt-[calc(var(--app-header-height,96px)+1.75rem)]">
        <section className="relative w-full max-w-[1080px] overflow-hidden rounded-[2.25rem] border border-border/70 bg-surface/72 px-6 py-8 shadow-[0_34px_90px_-52px_rgb(var(--shadow-color)/0.38)] backdrop-blur-[10px] sm:px-8 lg:px-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted">
                Transición de mapa
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-text sm:text-[2.4rem]">
                Preparando mapa
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted sm:text-[15px]">
                Cargando nodos y conexiones del plan.
              </p>
            </div>

            <div className="grid gap-2 text-right text-[11px] uppercase tracking-[0.24em] text-muted">
              <span className="inline-flex items-center justify-end gap-2">
                <span className="h-2 w-2 rounded-full bg-accent animate-map-loader-pulse" />
                Modo mapa
              </span>
              <span className="inline-flex items-center justify-end gap-2">
                <span
                  className="h-2 w-2 rounded-full bg-accent-2 animate-map-loader-pulse"
                  style={{ animationDelay: "0.18s" }}
                />
                Diagrama en carga
              </span>
            </div>
          </div>

          <div
            className="relative mt-8 overflow-hidden rounded-[2rem] border border-border/65 bg-[rgb(var(--color-surface-2)/0.55)] px-4 py-5 sm:px-6 sm:py-6"
            data-testid="map-loader-diagram"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgb(var(--color-accent)/0.08),transparent_58%)]" />

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
                  stroke="rgb(var(--color-border) / 0.34)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              ))}
              {MAP_LOADING_FLOW_PATHS.map((path, index) => (
                <path
                  key={`${path}-glow`}
                  d={path}
                  fill="none"
                  stroke={index % 2 === 0 ? "rgb(var(--color-accent) / 0.78)" : "rgb(var(--color-accent-3) / 0.72)"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray="12 18"
                  className="animate-map-loader-line"
                  style={{ animationDelay: `${index * 0.12}s` }}
                />
              ))}
            </svg>

            <div className="relative grid min-h-[320px] grid-cols-1">
              {MAP_LOADING_FLOW_NODES.map((node, index) => (
                <div
                  key={node.id}
                  data-testid="map-loader-node"
                  className="absolute overflow-hidden rounded-[1.35rem] border border-border/65 bg-surface/82 shadow-[0_22px_44px_-34px_rgb(var(--shadow-color)/0.45)] backdrop-blur-[8px] animate-map-loader-node"
                  style={{
                    left: `${(node.x / 1000) * 100}%`,
                    top: `${(node.y / 380) * 100}%`,
                    width: `${node.width}px`,
                    height: `${node.height}px`,
                    animationDelay: node.delay
                  }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgb(var(--color-accent)/0.08),transparent_45%,rgb(var(--color-accent-3)/0.08))]" />
                  <div className="relative flex h-full flex-col justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full animate-map-loader-pulse"
                        style={{
                          backgroundColor: getMapLoadingNodeTint(index),
                          animationDelay: `${index * 0.11}s`
                        }}
                      />
                      <span className="h-2 w-14 rounded-full bg-border/55" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 rounded-full bg-border/55" />
                      <div className="h-2.5 w-[72%] rounded-full bg-border/35" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-[11px] uppercase tracking-[0.24em] text-muted">
            <p>Sincronizando tramos del plan</p>
            <p>Mostrando fondo y estructura antes de los nodos</p>
          </div>
        </section>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] z-20 hidden px-4 lg:block"
      >
        <div className="mx-auto w-full max-w-[1320px] pl-[12.75rem] pr-[4.75rem]">
          <div className="overflow-hidden rounded-[1.2rem] border border-border/70 bg-surface/70 px-4 py-3 shadow-[0_18px_42px_-30px_rgb(var(--shadow-color)/0.3)] backdrop-blur-[8px]">
            <div className="grid gap-x-4 gap-y-3 md:grid-cols-[19fr_46fr_13fr_10fr_8fr]">
              {MAP_LOADING_FOOTER_SEGMENTS.map((segment, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-2.5 w-16 rounded-full bg-border/40" />
                  <div className="h-[19px] overflow-hidden rounded-[8px] border border-border/50 bg-surface-2/80">
                    <div
                      className="h-full rounded-[7px] animate-map-loader-footer"
                      style={{
                        width: segment.width,
                        backgroundColor: segment.tint,
                        animationDelay: `${index * 0.12}s`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
