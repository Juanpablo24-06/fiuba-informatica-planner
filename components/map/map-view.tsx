"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import MapDetailContent from "@/components/map/map-detail-content";
import { MapNodeCard } from "@/components/map/map-node-card";
import { Button } from "@/components/ui/button";
import {
  clamp,
  buildLinePaths,
  computeHorizontalLayout,
  getDisplayNodeMeta,
  getDisplayNodeName,
  isCbcClusterNode,
  isCbcLeafNode
} from "@/lib/map/map-layout";
import {
  computeFocusedNodeTransform,
  computePinchTransform,
  computeZoomTransform,
  findNearestSheetState,
  getClampedTransform,
  getDefaultFocusBounds,
  getSheetSizePreset,
  resolveInitialMapTransform
} from "@/lib/map/map-camera";
import {
  buildMapEdgeIndex,
  buildNodePreviewIndex,
  buildVisibleNodeIds
} from "@/lib/map/map-view-state";
import type {
  FinalProjectTrack,
  MapEdge,
  MapNode,
  Transform
} from "@/lib/map/types";
import {
  DRAG_THRESHOLD,
  MAP_CBC_COLLAPSED_STORAGE_KEY,
  MAP_FINAL_TRACK_STORAGE_KEY,
  MAP_VIEW_STORAGE_KEY,
  MAX_ZOOM,
  MIN_ZOOM,
  PAN_DRAG_MULTIPLIER,
  STATUS_LABELS,
  ZOOM_FACTOR
} from "@/lib/map/map-constants";

export default function MapView({ nodes, edges }: { nodes: MapNode[]; edges: MapEdge[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cameraAnimationRef = useRef<number | null>(null);
  const initialCameraAppliedRef = useRef(false);
  const persistedTransformRef = useRef<Transform | null>(null);
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const panRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const dragDistanceRef = useRef(0);
  const pressedNodeIdRef = useRef<string | null>(null);
  const pinchRef = useRef<{
    distance: number;
    scale: number;
    centerX: number;
    centerY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const hasUserMovedRef = useRef(false);
  const sheetDragRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const [transform, setTransform] = useState<Transform>(transformRef.current);
  const [worldSize, setWorldSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showElectives, setShowElectives] = useState(true);
  const [collapseCbc, setCollapseCbc] = useState(false);
  const [panelState, setPanelState] = useState<"collapsed" | "half" | "full">("collapsed");
  const [sheetHeight, setSheetHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [isPanningViewport, setIsPanningViewport] = useState(false);
  const [finalProjectTrack, setFinalProjectTrack] = useState<FinalProjectTrack>("tesis");
  const desktopDockBottom = "calc(env(safe-area-inset-bottom,0px) + 0.95rem)";
  const desktopPanelBottomInset =
    "calc(var(--map-bottom-bar-height, var(--synapse-launcher-height, 72px)) + env(safe-area-inset-bottom,0px) + 1.2rem)";
  const desktopViewportBottomInset = "0px";
  const mobileBottomInset = "calc(var(--synapse-launcher-height, 72px) + 1rem)";

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setHoveredId(null);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPanelState("collapsed");
    } else {
      setPanelState((prev) => (prev === "collapsed" ? "half" : prev));
    }
  }, [selectedId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => setViewportHeight(viewport.clientHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    window.addEventListener("resize", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const query = window.matchMedia("(min-width: 1024px)");
    const handle = () => setIsDesktop(query.matches);
    handle();
    query.addEventListener("change", handle);
    return () => query.removeEventListener("change", handle);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(MAP_VIEW_STORAGE_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<Transform>;
      if (
        typeof parsed.x === "number" &&
        typeof parsed.y === "number" &&
        typeof parsed.scale === "number"
      ) {
        persistedTransformRef.current = {
          x: parsed.x,
          y: parsed.y,
          scale: clamp(parsed.scale, MIN_ZOOM, MAX_ZOOM)
        };
      }
    } catch {
      persistedTransformRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(MAP_FINAL_TRACK_STORAGE_KEY);
      if (stored === "tesis" || stored === "trabajo_profesional") {
        setFinalProjectTrack(stored);
      }
    } catch {
      // Ignore storage read issues.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(MAP_CBC_COLLAPSED_STORAGE_KEY);
      if (stored === "true") setCollapseCbc(true);
    } catch {
      // Ignore storage read issues.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(MAP_FINAL_TRACK_STORAGE_KEY, finalProjectTrack);
    } catch {
      // Ignore storage write issues.
    }
  }, [finalProjectTrack]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(MAP_CBC_COLLAPSED_STORAGE_KEY, String(collapseCbc));
    } catch {
      // Ignore storage write issues.
    }
  }, [collapseCbc]);

  const sheetSizes = useMemo(
    () => getSheetSizePreset(viewportHeight),
    [viewportHeight]
  );

  useEffect(() => {
    if (isDraggingSheet) return;
    setSheetHeight(sheetSizes[panelState]);
  }, [isDraggingSheet, panelState, sheetSizes]);

  useEffect(() => {
    if (showElectives) return;
    if (selectedId && nodes.find((node) => node.id === selectedId)?.type === "electiva") {
      setSelectedId(null);
    }
    if (hoveredId && nodes.find((node) => node.id === hoveredId)?.type === "electiva") {
      setHoveredId(null);
    }
  }, [hoveredId, nodes, selectedId, showElectives]);

  useEffect(() => {
    if (!collapseCbc) return;
    if (selectedId && isCbcLeafNode(nodes.find((node) => node.id === selectedId))) {
      setSelectedId(null);
    }
    if (hoveredId && isCbcLeafNode(nodes.find((node) => node.id === hoveredId))) {
      setHoveredId(null);
    }
  }, [collapseCbc, hoveredId, nodes, selectedId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (selectedId || hoveredId) {
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearSelection, hoveredId, selectedId]);

  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const visibleNodeIds = useMemo(
    () =>
      buildVisibleNodeIds({
        nodes,
        showElectives,
        collapseCbc
      }),
    [collapseCbc, nodes, showElectives]
  );

  const visibleNodes = useMemo(
    () => nodes.filter((node) => visibleNodeIds.has(node.id)),
    [nodes, visibleNodeIds]
  );

  const visibleEdges = useMemo(
    () => edges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)),
    [edges, visibleNodeIds]
  );

  const layout = useMemo(
    () => computeHorizontalLayout(visibleNodes, visibleEdges),
    [visibleEdges, visibleNodes]
  );
  const nodeLayouts = layout.nodeLayouts;
  const lines = useMemo(() => buildLinePaths(nodeLayouts, visibleEdges), [nodeLayouts, visibleEdges]);

  const defaultFocus = useMemo(
    () => getDefaultFocusBounds(visibleNodes, layout.nodeLayouts),
    [layout.nodeLayouts, visibleNodes]
  );

  const edgeIndex = useMemo(() => buildMapEdgeIndex(edges), [edges]);

  const activeId = selectedId ?? hoveredId;
  const selectedNode = selectedId ? nodesById.get(selectedId) : null;

  const getPrereqIds = useCallback(
    (id: string | null) => {
      if (!id) return new Set<string>();
      return new Set(edgeIndex.prereqMap.get(id) ?? []);
    },
    [edgeIndex]
  );

  const getUnlockIds = useCallback(
    (id: string | null) => {
      if (!id) return new Set<string>();
      return new Set(edgeIndex.unlockMap.get(id) ?? []);
    },
    [edgeIndex]
  );

  const prereqIds = useMemo(() => getPrereqIds(activeId), [activeId, getPrereqIds]);
  const unlockIds = useMemo(() => getUnlockIds(activeId), [activeId, getUnlockIds]);

  const nodePreviews = useMemo(
    () =>
      buildNodePreviewIndex({
        visibleNodes,
        edgeIndex,
        nodesById,
        showElectives,
        finalProjectTrack
      }),
    [edgeIndex, finalProjectTrack, nodesById, showElectives, visibleNodes]
  );

  const selectedPreview = selectedId ? nodePreviews.get(selectedId) ?? null : null;
  const selectedPrereqs = selectedPreview?.prereqNames ?? [];
  const selectedUnlocks = selectedPreview?.unlockNames ?? [];
  const selectedStatusLabel = selectedNode?.status ? STATUS_LABELS[selectedNode.status] : null;
  const selectedDisplayName = selectedNode
    ? getDisplayNodeName(selectedNode, finalProjectTrack)
    : null;

  const scheduleTransform = useCallback((next: Transform) => {
    transformRef.current = next;
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setTransform({ ...next });
  }, []);

  const stopCameraAnimation = useCallback(() => {
    if (cameraAnimationRef.current !== null) {
      window.cancelAnimationFrame(cameraAnimationRef.current);
      cameraAnimationRef.current = null;
    }
  }, []);

  const capturePointerSafely = useCallback((element: HTMLDivElement, pointerId: number) => {
    try {
      element.setPointerCapture(pointerId);
    } catch {
      // Keep drag working even if the browser rejects pointer capture here.
    }
  }, []);

  const releasePointerSafely = useCallback((element: HTMLDivElement, pointerId: number) => {
    try {
      element.releasePointerCapture(pointerId);
    } catch {
      // Ignore capture release mismatches.
    }
  }, []);

  const clampTransform = useCallback(
    (next: Transform) => {
      const viewport = viewportRef.current;
      if (!viewport || !worldSize.width || !worldSize.height) return next;
      return getClampedTransform({
        next,
        viewportWidth: viewport.clientWidth,
        viewportHeight: viewport.clientHeight,
        worldWidth: worldSize.width,
        worldHeight: worldSize.height
      });
    },
    [worldSize.height, worldSize.width]
  );

  const setTransformSafe = useCallback(
    (next: Transform) => {
      scheduleTransform(clampTransform(next));
    },
    [clampTransform, scheduleTransform]
  );

  useEffect(() => {
    setWorldSize({ width: layout.width, height: layout.height });
  }, [layout.height, layout.width]);

  useEffect(() => {
    if (!layout.width || !layout.height) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (!initialCameraAppliedRef.current) {
      const persisted = persistedTransformRef.current;
      if (persisted) {
        initialCameraAppliedRef.current = true;
        const next = resolveInitialMapTransform({
          layoutWidth: layout.width,
          layoutHeight: layout.height,
          viewportWidth: viewport.clientWidth,
          viewportHeight: viewport.clientHeight,
          currentTransform: transformRef.current,
          persistedTransform: persisted,
          defaultFocus,
          isDesktop
        });
        hasUserMovedRef.current = next.userMoved;
        setTransformSafe(next.transform);
        return;
      }

      initialCameraAppliedRef.current = true;
      const next = resolveInitialMapTransform({
        layoutWidth: layout.width,
        layoutHeight: layout.height,
        viewportWidth: viewport.clientWidth,
        viewportHeight: viewport.clientHeight,
        currentTransform: transformRef.current,
        persistedTransform: null,
        defaultFocus,
        isDesktop
      });
      hasUserMovedRef.current = next.userMoved;
      setTransformSafe(next.transform);
      return;
    }

    setTransformSafe({ ...transformRef.current });
  }, [defaultFocus, isDesktop, layout.height, layout.width, setTransformSafe]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!initialCameraAppliedRef.current) return;

    try {
      window.localStorage.setItem(MAP_VIEW_STORAGE_KEY, JSON.stringify(transform));
    } catch {
      // Ignore storage errors and keep map interactions responsive.
    }
  }, [transform]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      stopCameraAnimation();
    };
  }, [stopCameraAnimation]);

  const focusNode = useCallback(
    (id: string, zoom: boolean) => {
      const viewport = viewportRef.current;
      if (!viewport) return;

      const selectedLayout = nodeLayouts[id];
      if (!selectedLayout) return;
      const target = computeFocusedNodeTransform({
        selectedLayout,
        viewportWidth: viewport.clientWidth,
        viewportHeight: viewport.clientHeight,
        worldWidth: worldSize.width,
        worldHeight: worldSize.height,
        currentTransform: transformRef.current,
        isDesktop,
        zoom
      });

      stopCameraAnimation();
      const start = { ...transformRef.current };
      const startedAt = performance.now();
      const duration = 320;
      const ease = (value: number) =>
        value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;

      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        const eased = ease(progress);
        scheduleTransform({
        x: start.x + (target.x - start.x) * eased,
        y: start.y + (target.y - start.y) * eased,
        scale: start.scale + (target.scale - start.scale) * eased
        });

        if (progress < 1) {
          cameraAnimationRef.current = window.requestAnimationFrame(tick);
        } else {
          cameraAnimationRef.current = null;
        }
      };

      hasUserMovedRef.current = true;
      cameraAnimationRef.current = window.requestAnimationFrame(tick);
    },
    [isDesktop, nodeLayouts, scheduleTransform, stopCameraAnimation, worldSize.height, worldSize.width]
  );

  useEffect(() => {
    if (!selectedId) return;
    const frame = window.requestAnimationFrame(() => {
      focusNode(selectedId, true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [focusNode, selectedId]);

  const zoomAt = useCallback(
    (scale: number, centerX: number, centerY: number) => {
      stopCameraAnimation();
      hasUserMovedRef.current = true;
      setTransformSafe(
        computeZoomTransform({
          currentTransform: transformRef.current,
          nextScale: scale,
          centerX,
          centerY
        })
      );
    },
    [setTransformSafe, stopCameraAnimation]
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!viewportRef.current) return;
    stopCameraAnimation();
    capturePointerSafely(event.currentTarget, event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    dragDistanceRef.current = 0;
    pressedNodeIdRef.current =
      (event.target as HTMLElement | null)?.closest("[data-node-id]")?.getAttribute("data-node-id") ??
      null;

    if (pointersRef.current.size === 1) {
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: transformRef.current.x,
        originY: transformRef.current.y
      };
      setIsPanningViewport(true);
    }

    if (pointersRef.current.size === 2) {
      setIsPanningViewport(false);
      const points = Array.from(pointersRef.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const distance = Math.hypot(dx, dy);
      const viewportRect = viewportRef.current.getBoundingClientRect();
      const centerX = (points[0].x + points[1].x) / 2 - viewportRect.left;
      const centerY = (points[0].y + points[1].y) / 2 - viewportRect.top;
      pinchRef.current = {
        distance,
        scale: transformRef.current.scale,
        centerX,
        centerY,
        panX: transformRef.current.x,
        panY: transformRef.current.y
      };
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 2 && pinchRef.current) {
      const points = Array.from(pointersRef.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const distance = Math.hypot(dx, dy);
      hasUserMovedRef.current = true;
      setTransformSafe(
        computePinchTransform({
          initialDistance: pinchRef.current.distance,
          currentDistance: distance,
          initialScale: pinchRef.current.scale,
          centerX: pinchRef.current.centerX,
          centerY: pinchRef.current.centerY,
          panX: pinchRef.current.panX,
          panY: pinchRef.current.panY
        })
      );
      return;
    }

    if (panRef.current) {
      const deltaX = (event.clientX - panRef.current.startX) * PAN_DRAG_MULTIPLIER;
      const deltaY = (event.clientY - panRef.current.startY) * PAN_DRAG_MULTIPLIER;
      dragDistanceRef.current = Math.max(dragDistanceRef.current, Math.hypot(deltaX, deltaY));
      hasUserMovedRef.current = true;
      setTransformSafe({
        x: panRef.current.originX + deltaX,
        y: panRef.current.originY + deltaY,
        scale: transformRef.current.scale
      });
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    releasePointerSafely(event.currentTarget, event.pointerId);
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) {
      if (dragDistanceRef.current <= DRAG_THRESHOLD && pressedNodeIdRef.current) {
        const pressedNode = nodesById.get(pressedNodeIdRef.current);
        if (isCbcClusterNode(pressedNode)) {
          setCollapseCbc((value) => !value);
          setSelectedId(null);
          setHoveredId(null);
        } else {
          setSelectedId(pressedNodeIdRef.current);
          setHoveredId(null);
        }
      }
      panRef.current = null;
      pressedNodeIdRef.current = null;
      setIsPanningViewport(false);
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;
    stopCameraAnimation();
    const rect = viewport.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const direction = event.deltaY > 0 ? -1 : 1;
    const nextScale =
      transformRef.current.scale * (direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR);
    zoomAt(nextScale, cursorX, cursorY);
  };

  const handleSheetPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDraggingSheet(true);
    sheetDragRef.current = { startY: event.clientY, startHeight: sheetHeight };
  };

  const handleSheetPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSheet || !sheetDragRef.current) return;
    const delta = sheetDragRef.current.startY - event.clientY;
    const nextHeight = clamp(
      sheetDragRef.current.startHeight + delta,
      sheetSizes.collapsed,
      sheetSizes.full
    );
    setSheetHeight(nextHeight);
  };

  const handleSheetPointerUp = () => {
    if (!isDraggingSheet) return;
    setIsDraggingSheet(false);
    sheetDragRef.current = null;

    setPanelState(findNearestSheetState(sheetHeight, sheetSizes));
  };

  return (
    <section className="relative h-[100svh]">
      <div className="relative h-full overflow-hidden">
        <div className="relative h-full bg-transparent">
          <div className="map-canvas pointer-events-none absolute inset-0 opacity-0" />
          <div
            className="pointer-events-none absolute inset-0 subtle-grid opacity-[0.08]"
            style={{ backgroundPosition: "0 0, 0 0" }}
          />

          <div
            ref={viewportRef}
            className={cn(
              "absolute inset-x-0 overflow-hidden touch-none",
              "top-[calc(var(--app-header-height,96px)+0.5rem)]",
              isPanningViewport ? "cursor-grabbing" : "cursor-grab"
            )}
            style={{
              bottom: isDesktop ? desktopViewportBottomInset : mobileBottomInset
            }}
            onPointerDownCapture={handlePointerDown}
            onPointerMoveCapture={handlePointerMove}
            onPointerUpCapture={handlePointerUp}
            onPointerCancelCapture={handlePointerUp}
            onWheelCapture={handleWheel}
          >
            <div
              ref={worldRef}
              className="relative"
              style={{
                width: layout.width,
                height: layout.height,
                transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
                transformOrigin: "0 0"
              }}
              onPointerDown={(event) => {
                const target = event.target as HTMLElement | null;
                if (!target?.closest("[data-node-id]")) {
                  clearSelection();
                }
              }}
            >
              <svg
                className="pointer-events-none absolute inset-0 z-10"
                width={layout.width}
                height={layout.height}
              >
                {lines.map((line) => {
                  const isPrereq = activeId && line.to === activeId;
                  const isUnlock = activeId && line.from === activeId;
                  const isActiveLine = Boolean(isPrereq || isUnlock);
                  const isMuted = Boolean(activeId ? !isActiveLine : false);
                  const stroke = isPrereq
                    ? "rgb(var(--color-prereq))"
                    : isUnlock
                    ? "rgb(var(--color-unlock))"
                    : "rgb(var(--color-border))";

                  return (
                    <path
                      key={`${line.from}-${line.to}`}
                      d={line.d}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={isActiveLine ? 2.5 : 1.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={isActiveLine ? 0.94 : isMuted ? 0.16 : 0.7}
                      className="transition-all duration-200 ease-out"
                    />
                  );
                })}
              </svg>

              {visibleNodes.map((node) => {
                const layoutNode = layout.nodeLayouts[node.id];
                if (!layoutNode) return null;

                const isActive = activeId === node.id;
                const isPrereq = prereqIds.has(node.id);
                const isUnlock = unlockIds.has(node.id);
                const isDimmed = activeId ? !isActive && !isPrereq && !isUnlock : false;

                return (
                  <MapNodeCard
                    key={node.id}
                    node={node}
                    layout={layoutNode}
                    isActive={isActive}
                    isPrereq={isPrereq}
                    isUnlock={isUnlock}
                    isDimmed={isDimmed}
                    isDesktop={isDesktop}
                    hasSelection={Boolean(selectedId)}
                    isHovered={hoveredId === node.id}
                    finalProjectTrack={finalProjectTrack}
                    preview={nodePreviews.get(node.id) ?? null}
                    onHoverStart={(id) => {
                      if (!isDesktop || selectedId) return;
                      setHoveredId(id);
                    }}
                    onHoverEnd={() => {
                      if (!isDesktop || selectedId) return;
                      setHoveredId(null);
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-40">
            <div
              className="pointer-events-auto absolute left-4"
              style={{
                bottom: isDesktop ? desktopDockBottom : "1rem"
              }}
            >
              <button
                type="button"
                aria-pressed={showElectives}
                onClick={() => setShowElectives((value) => !value)}
                className={cn(
                  "inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm font-semibold shadow-glow backdrop-blur transition",
                  showElectives
                    ? "border-elective/60 bg-surface/92 text-elective"
                    : "border-border/60 bg-surface/88 text-muted hover:border-elective/40"
                )}
              >
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    showElectives ? "bg-elective" : "bg-border"
                  )}
                />
                {showElectives ? "Electivas visibles" : "Activar electivas"}
              </button>
            </div>

            {selectedNode && !isCbcClusterNode(selectedNode) ? (
              <aside
                className="pointer-events-auto absolute right-4 top-[calc(var(--app-header-height,96px)+1rem)] hidden w-[340px] flex-col overflow-hidden rounded-3xl border border-border/60 bg-surface/92 shadow-glow backdrop-blur lg:flex"
                style={{ bottom: desktopPanelBottomInset }}
              >
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Detalle</p>
                    <h3 className="text-lg font-semibold text-text font-display">
                      {selectedDisplayName}
                    </h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Cerrar
                  </Button>
                </div>
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm text-muted">
                  <MapDetailContent
                    collapseCbc={collapseCbc}
                    finalProjectTrack={finalProjectTrack}
                    onFinalProjectTrackChange={setFinalProjectTrack}
                    selectedNode={selectedNode}
                    selectedPrereqs={selectedPrereqs}
                    selectedStatusLabel={selectedStatusLabel}
                    selectedUnlocks={selectedUnlocks}
                  />
                </div>
              </aside>
            ) : null}

            {selectedNode && !isCbcClusterNode(selectedNode) ? (
              <div
                className="pointer-events-auto absolute bottom-0 left-0 right-0 lg:hidden"
                onPointerMove={handleSheetPointerMove}
                onPointerUp={handleSheetPointerUp}
                onPointerCancel={handleSheetPointerUp}
              >
                <div
                  className="rounded-t-3xl border border-border/60 bg-surface/92 shadow-glow backdrop-blur"
                  style={{ height: sheetHeight }}
                >
                  <div className="flex items-center justify-center pt-3">
                    <button
                      type="button"
                      onPointerDown={handleSheetPointerDown}
                      className="flex h-6 w-16 items-center justify-center"
                      aria-label="Deslizar panel"
                    >
                      <span className="h-1.5 w-10 rounded-full bg-border/60" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-4 pb-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.25em] text-muted">Detalle</p>
                      <h3 className="text-base font-semibold text-text font-display">
                        {selectedDisplayName}
                      </h3>
                      <p className="text-[11px] text-muted">{getDisplayNodeMeta(selectedNode)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={clearSelection}>
                        Cerrar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPanelState((prev) =>
                            prev === "collapsed" ? "half" : prev === "half" ? "full" : "collapsed"
                          )
                        }
                      >
                        {panelState === "full" ? "Bajar" : "Expandir"}
                      </Button>
                    </div>
                  </div>
                  <div className="h-[calc(100%-74px)] overflow-y-auto px-4 pb-4 text-sm text-muted">
                    <MapDetailContent
                      collapseCbc={collapseCbc}
                      finalProjectTrack={finalProjectTrack}
                      onFinalProjectTrackChange={setFinalProjectTrack}
                      selectedNode={selectedNode}
                      selectedPrereqs={selectedPrereqs}
                      selectedStatusLabel={selectedStatusLabel}
                      selectedUnlocks={selectedUnlocks}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
