"use client";

import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { EvaluationTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatEvaluationTemplate } from "@/lib/templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type MapNode = {
  id: string;
  name: string;
  code: string | null;
  term: number | null;
  type: string | null;
  cycle?: string | null;
  status?: string | null;
  color?: string | null;
  requirements?: string[] | null;
  credits?: number | null;
  weekly_hours?: number | null;
  total_hours?: number | null;
  template?: EvaluationTemplate | null;
};

export type MapEdge = {
  from: string;
  to: string;
};

type LinePath = {
  from: string;
  to: string;
  d: string;
};

type Transform = {
  x: number;
  y: number;
  scale: number;
};

type NodeLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const STATUS_STYLES: Record<string, string> = {
  cursando: "bg-accent/10 text-accent border-accent/40",
  final_pendiente: "bg-warning/10 text-warning border-warning/40",
  aprobado: "bg-success/10 text-success border-success/40",
  recursar: "bg-danger/10 text-danger border-danger/40"
};

const STATUS_LABELS: Record<string, string> = {
  cursando: "Cursando",
  final_pendiente: "Final pendiente",
  aprobado: "Aprobado",
  recursar: "Recursar"
};

const CYCLE_LABELS: Record<string, string> = {
  cbc: "CBC",
  segundo: "Ciclo profesional"
};

const TERMS = Array.from({ length: 10 }, (_, index) => index + 1);
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.7;
const ZOOM_FACTOR = 1.12;
const DESKTOP_PANEL_WIDTH = 320;

const getNodeTerm = (node?: MapNode) => node?.term ?? 0;

const buildOrderByTerm = (nodes: MapNode[], edges: MapEdge[]) => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const order = new Map<number, string[]>();
  const incomingByNode = new Map<string, string[]>();
  const outgoingByNode = new Map<string, string[]>();

  TERMS.forEach((term) => order.set(term, []));

  for (const node of nodes) {
    const term = getNodeTerm(node);
    if (!order.has(term)) order.set(term, []);
    order.get(term)?.push(node.id);
  }

  for (const [term, ids] of order.entries()) {
    ids.sort((firstId, secondId) => {
      const first = nodesById.get(firstId);
      const second = nodesById.get(secondId);
      if (!first || !second) return 0;
      return first.name.localeCompare(second.name);
    });
    order.set(term, ids);
  }

  for (const edge of edges) {
    const fromTerm = getNodeTerm(nodesById.get(edge.from));
    const toTerm = getNodeTerm(nodesById.get(edge.to));
    if (fromTerm === toTerm) continue;

    if (!incomingByNode.has(edge.to)) incomingByNode.set(edge.to, []);
    incomingByNode.get(edge.to)?.push(edge.from);

    if (!outgoingByNode.has(edge.from)) outgoingByNode.set(edge.from, []);
    outgoingByNode.get(edge.from)?.push(edge.to);
  }

  const sortedTerms = Array.from(order.keys()).sort((a, b) => a - b);

  const buildIndexMap = () => {
    const map = new Map<string, number>();
    for (const term of sortedTerms) {
      const list = order.get(term) ?? [];
      list.forEach((id, index) => map.set(id, index));
    }
    return map;
  };

  const reorderTerm = (
    term: number,
    neighborMap: Map<string, string[]>,
    compareTerm: (nodeTerm: number, currentTerm: number) => boolean
  ) => {
    const list = order.get(term);
    if (!list || list.length < 2) return;
    const indexById = buildIndexMap();
    const currentOrder = new Map(list.map((id, index) => [id, index]));
    const next = [...list].sort((first, second) => {
      const firstNeighbors = (neighborMap.get(first) ?? []).filter((neighborId) => {
        const neighborTerm = getNodeTerm(nodesById.get(neighborId));
        return compareTerm(neighborTerm, term);
      });
      const secondNeighbors = (neighborMap.get(second) ?? []).filter((neighborId) => {
        const neighborTerm = getNodeTerm(nodesById.get(neighborId));
        return compareTerm(neighborTerm, term);
      });

      const average = (items: string[]) => {
        if (items.length === 0) return Number.NaN;
        const total = items.reduce((sum, id) => sum + (indexById.get(id) ?? 0), 0);
        return total / items.length;
      };

      const firstScore = average(firstNeighbors);
      const secondScore = average(secondNeighbors);
      const firstHasScore = Number.isFinite(firstScore);
      const secondHasScore = Number.isFinite(secondScore);

      if (firstHasScore && secondHasScore && firstScore !== secondScore) {
        return firstScore - secondScore;
      }
      if (firstHasScore !== secondHasScore) return firstHasScore ? -1 : 1;

      return (currentOrder.get(first) ?? 0) - (currentOrder.get(second) ?? 0);
    });

    order.set(term, next);
  };

  for (let iteration = 0; iteration < 7; iteration += 1) {
    for (const term of sortedTerms) {
      reorderTerm(term, incomingByNode, (neighborTerm, currentTerm) => neighborTerm < currentTerm);
    }
    for (const term of [...sortedTerms].reverse()) {
      reorderTerm(term, outgoingByNode, (neighborTerm, currentTerm) => neighborTerm > currentTerm);
    }
  }

  return order;
};

const formatList = (items?: string[] | null) => {
  if (!items || items.length === 0) return "Sin datos";
  return items.join(" · ");
};

const formatPreviewList = (items: string[]) => {
  if (!items.length) return "Ninguna";
  const slice = items.slice(0, 2);
  const extra = items.length - slice.length;
  return extra > 0 ? `${slice.join(" · ")} +${extra}` : slice.join(" · ");
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function MapView({ nodes, edges }: { nodes: MapNode[]; edges: MapEdge[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<HTMLDivElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 });
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const panRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
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
  const [lines, setLines] = useState<LinePath[]>([]);
  const [nodeLayouts, setNodeLayouts] = useState<Record<string, NodeLayout>>({});
  const [worldSize, setWorldSize] = useState({ width: 0, height: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [showElectives, setShowElectives] = useState(true);
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [orderByTerm, setOrderByTerm] = useState(() => buildOrderByTerm(nodes, edges));
  const [panelState, setPanelState] = useState<"collapsed" | "half" | "full">("collapsed");
  const [sheetHeight, setSheetHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);

  useEffect(() => {
    setOrderByTerm(buildOrderByTerm(nodes, edges));
  }, [edges, nodes]);

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

  const sheetSizes = useMemo(() => {
    const collapsed = 120;
    const half = Math.max(240, Math.min(420, viewportHeight * 0.5));
    const full = Math.max(360, Math.min(680, viewportHeight * 0.8));
    return { collapsed, half, full };
  }, [viewportHeight]);

  useEffect(() => {
    if (isDraggingSheet) return;
    setSheetHeight(sheetSizes[panelState]);
  }, [panelState, sheetSizes, isDraggingSheet]);

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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (selectedId || hoveredId) {
        clearSelection();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hoveredId, selectedId]);

  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  const terms = useMemo(() => {
    const extraTerms = Array.from(orderByTerm.keys())
      .filter((term) => term !== 0 && !TERMS.includes(term))
      .sort((a, b) => a - b);
    const withZero = orderByTerm.has(0) ? [0] : [];
    return [...TERMS, ...extraTerms, ...withZero];
  }, [orderByTerm]);

  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    nodes.forEach((node) => {
      if (showElectives || node.type !== "electiva") {
        ids.add(node.id);
      }
    });
    return ids;
  }, [nodes, showElectives]);

  const visibleEdges = useMemo(
    () => edges.filter((edge) => visibleNodeIds.has(edge.from) && visibleNodeIds.has(edge.to)),
    [edges, visibleNodeIds]
  );

  const edgeIndex = useMemo(() => {
    const prereqMap = new Map<string, string[]>();
    const unlockMap = new Map<string, string[]>();
    edges.forEach((edge) => {
      if (!prereqMap.has(edge.to)) prereqMap.set(edge.to, []);
      prereqMap.get(edge.to)?.push(edge.from);
      if (!unlockMap.has(edge.from)) unlockMap.set(edge.from, []);
      unlockMap.get(edge.from)?.push(edge.to);
    });
    return { prereqMap, unlockMap };
  }, [edges]);

  const nodesByTerm = useMemo(() => {
    const map = new Map<number, MapNode[]>();
    terms.forEach((term) => map.set(term, []));
    orderByTerm.forEach((ids, term) => {
      const list = ids
        .map((id) => nodesById.get(id))
        .filter(Boolean) as MapNode[];
      const filtered = showElectives ? list : list.filter((node) => node.type !== "electiva");
      map.set(term, filtered);
    });
    return map;
  }, [nodesById, orderByTerm, showElectives, terms]);

  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const { searchMatches, searchResults } = useMemo(() => {
    if (!deferredSearch) {
      return {
        searchMatches: new Set<string>(),
        searchResults: [] as MapNode[]
      };
    }

    const matchedNodes = nodes
      .filter((node) => {
        const nameMatch = node.name.toLowerCase().includes(deferredSearch);
        const codeMatch = node.code?.toLowerCase().includes(deferredSearch);
        const electiveMatch = showElectives || node.type !== "electiva";
        return electiveMatch && (nameMatch || codeMatch);
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      searchMatches: new Set(matchedNodes.map((node) => node.id)),
      searchResults: matchedNodes.slice(0, 8)
    };
  }, [deferredSearch, nodes, showElectives]);

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
  const selectedPrereqIds = useMemo(
    () => getPrereqIds(selectedId),
    [selectedId, getPrereqIds]
  );
  const selectedUnlockIds = useMemo(
    () => getUnlockIds(selectedId),
    [selectedId, getUnlockIds]
  );

  const resolveNodeNames = useCallback(
    (ids: Iterable<string>) => {
      const names = Array.from(ids)
        .map((id) => nodesById.get(id))
        .filter((node): node is MapNode => Boolean(node))
        .filter((node) => showElectives || node.type !== "electiva")
        .map((node) => node.name);
      names.sort((a, b) => a.localeCompare(b));
      return names;
    },
    [nodesById, showElectives]
  );

  const selectedPrereqs = useMemo(
    () => resolveNodeNames(selectedPrereqIds),
    [resolveNodeNames, selectedPrereqIds]
  );

  const selectedUnlocks = useMemo(
    () => resolveNodeNames(selectedUnlockIds),
    [resolveNodeNames, selectedUnlockIds]
  );

  const selectedStatusLabel = selectedNode?.status ? STATUS_LABELS[selectedNode.status] : null;

  const scheduleTransform = useCallback((next: Transform) => {
    transformRef.current = next;
    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      setTransform({ ...transformRef.current });
    });
  }, []);

  const clampTransform = useCallback(
    (next: Transform) => {
      const viewport = viewportRef.current;
      if (!viewport || !worldSize.width || !worldSize.height) return next;
      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const scaledWidth = worldSize.width * next.scale;
      const scaledHeight = worldSize.height * next.scale;

      let minX = Math.min(0, width - scaledWidth);
      let maxX = Math.max(0, width - scaledWidth);
      let minY = Math.min(0, height - scaledHeight);
      let maxY = Math.max(0, height - scaledHeight);

      if (scaledWidth <= width) {
        minX = maxX = (width - scaledWidth) / 2;
      }
      if (scaledHeight <= height) {
        minY = maxY = (height - scaledHeight) / 2;
      }

      return {
        ...next,
        x: clamp(next.x, minX, maxX),
        y: clamp(next.y, minY, maxY)
      };
    },
    [worldSize.height, worldSize.width]
  );

  const setTransformSafe = useCallback(
    (next: Transform) => {
      scheduleTransform(clampTransform(next));
    },
    [clampTransform, scheduleTransform]
  );

  useLayoutEffect(() => {
    const container = worldRef.current;
    if (!container) return;

    const compute = () => {
      const nodeEls = Array.from(container.querySelectorAll<HTMLElement>("[data-node-id]"));
      const positions: Record<string, NodeLayout> = {};
      const containerRect = container.getBoundingClientRect();
      const scale = transformRef.current.scale;

      nodeEls.forEach((el) => {
        const id = el.dataset.nodeId ?? "";
        const rect = el.getBoundingClientRect();
        positions[id] = {
          x: (rect.left - containerRect.left) / scale,
          y: (rect.top - containerRect.top) / scale,
          width: rect.width / scale,
          height: rect.height / scale
        };
      });

      const outgoingTotal = new Map<string, number>();
      const incomingTotal = new Map<string, number>();
      visibleEdges.forEach((edge) => {
        outgoingTotal.set(edge.from, (outgoingTotal.get(edge.from) ?? 0) + 1);
        incomingTotal.set(edge.to, (incomingTotal.get(edge.to) ?? 0) + 1);
      });

      const outgoingSeen = new Map<string, number>();
      const incomingSeen = new Map<string, number>();

      const nextLines = visibleEdges
        .map((edge) => {
          const from = positions[edge.from];
          const to = positions[edge.to];
          if (!from || !to) return null;

          const fromTotal = outgoingTotal.get(edge.from) ?? 1;
          const toTotal = incomingTotal.get(edge.to) ?? 1;
          const fromOrder = outgoingSeen.get(edge.from) ?? 0;
          const toOrder = incomingSeen.get(edge.to) ?? 0;
          outgoingSeen.set(edge.from, fromOrder + 1);
          incomingSeen.set(edge.to, toOrder + 1);

          const fromLane = ((fromOrder + 1) / (fromTotal + 1) - 0.5) * Math.max(16, from.height * 0.6);
          const toLane = ((toOrder + 1) / (toTotal + 1) - 0.5) * Math.max(16, to.height * 0.6);

          const inset = 8;
          const x1 = from.x + from.width - inset;
          const y1 = from.y + from.height / 2 + fromLane;
          const x2 = to.x + inset;
          const y2 = to.y + to.height / 2 + toLane;
          const delta = x2 - x1;

          if (delta >= 24) {
            const curve = Math.max(46, Math.min(180, delta * 0.38));
            const c1x = x1 + curve;
            const c2x = x2 - curve;
            const d = `M ${x1} ${y1} C ${c1x} ${y1} ${c2x} ${y2} ${x2} ${y2}`;
            return { from: edge.from, to: edge.to, d };
          }

          const backCurve = Math.max(72, Math.min(180, Math.abs(delta) * 0.45 + 70));
          const midX = x1 + backCurve;
          const midY = y1 + (y2 - y1) * 0.5;
          const d = `M ${x1} ${y1} C ${midX} ${y1} ${midX} ${midY} ${midX} ${midY} C ${midX} ${midY} ${x2 - 18} ${y2} ${x2} ${y2}`;
          return { from: edge.from, to: edge.to, d };
        })
        .filter(Boolean) as LinePath[];

      setNodeLayouts(positions);
      setLines(nextLines);
      setWorldSize({
        width: container.scrollWidth,
        height: container.scrollHeight
      });
    };

    compute();
    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(compute);
    });

    observer.observe(container);
    window.addEventListener("resize", compute);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", compute);
    };
  }, [orderByTerm, visibleEdges]);

  useEffect(() => {
    if (!worldSize.width || !worldSize.height) return;
    setTransformSafe({ ...transformRef.current });
    if (!hasUserMovedRef.current) {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const scaledWidth = worldSize.width * transformRef.current.scale;
      const scaledHeight = worldSize.height * transformRef.current.scale;
      const x = scaledWidth < viewport.clientWidth
        ? (viewport.clientWidth - scaledWidth) / 2
        : transformRef.current.x;
      const y = scaledHeight < viewport.clientHeight
        ? (viewport.clientHeight - scaledHeight) / 2
        : transformRef.current.y;
      setTransformSafe({
        x,
        y,
        scale: transformRef.current.scale
      });
    }
  }, [setTransformSafe, worldSize]);

  const clearSelection = () => {
    setSelectedId(null);
    setHoveredId(null);
  };

  const focusNode = (id: string, zoom: boolean) => {
    const layout = nodeLayouts[id];
    const viewport = viewportRef.current;
    if (!layout || !viewport) return;

    const scale = clamp(
      zoom ? Math.max(transformRef.current.scale, 1.1) : transformRef.current.scale,
      MIN_ZOOM,
      MAX_ZOOM
    );
    const offsetX = isDesktop ? DESKTOP_PANEL_WIDTH / 2 : 0;
    const targetX = (viewport.clientWidth - offsetX) / 2;
    const targetY = viewport.clientHeight / 2;
    const centerX = layout.x + layout.width / 2;
    const centerY = layout.y + layout.height / 2;

    hasUserMovedRef.current = true;
    setTransformSafe({
      x: targetX - centerX * scale,
      y: targetY - centerY * scale,
      scale
    });
  };

  const zoomAt = (scale: number, centerX: number, centerY: number) => {
    const clamped = clamp(scale, MIN_ZOOM, MAX_ZOOM);
    const { x, y, scale: currentScale } = transformRef.current;
    const worldX = (centerX - x) / currentScale;
    const worldY = (centerY - y) / currentScale;
    const nextX = centerX - worldX * clamped;
    const nextY = centerY - worldY * clamped;
    hasUserMovedRef.current = true;
    setTransformSafe({ x: nextX, y: nextY, scale: clamped });
  };

  const handleZoomIn = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    zoomAt(transformRef.current.scale * ZOOM_FACTOR, viewport.clientWidth / 2, viewport.clientHeight / 2);
  };

  const handleZoomOut = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    zoomAt(transformRef.current.scale / ZOOM_FACTOR, viewport.clientWidth / 2, viewport.clientHeight / 2);
  };

  const handleReset = () => {
    hasUserMovedRef.current = false;
    setTransformSafe({ x: 0, y: 0, scale: 1 });
  };

  const handleCenter = () => {
    if (selectedId) {
      focusNode(selectedId, false);
      return;
    }
    handleReset();
  };

  const handleSearchSelect = (node: MapNode) => {
    setSelectedId(node.id);
    setHoveredId(null);
    setSearch(node.name);
    setIsSearchOpen(false);
    focusNode(node.id, true);
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    if (searchResults.length) {
      handleSearchSelect(searchResults[0]);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("[data-node-id]") && event.pointerType === "mouse") return;
    if (!viewportRef.current) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size === 1) {
      panRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        originX: transformRef.current.x,
        originY: transformRef.current.y
      };
    }

    if (pointersRef.current.size === 2) {
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
      const scale = clamp(
        pinchRef.current.scale * (distance / pinchRef.current.distance),
        MIN_ZOOM,
        MAX_ZOOM
      );
      const worldX = (pinchRef.current.centerX - pinchRef.current.panX) / pinchRef.current.scale;
      const worldY = (pinchRef.current.centerY - pinchRef.current.panY) / pinchRef.current.scale;
      hasUserMovedRef.current = true;
      setTransformSafe({
        x: pinchRef.current.centerX - worldX * scale,
        y: pinchRef.current.centerY - worldY * scale,
        scale
      });
      return;
    }

    if (panRef.current) {
      const deltaX = event.clientX - panRef.current.startX;
      const deltaY = event.clientY - panRef.current.startY;
      hasUserMovedRef.current = true;
      setTransformSafe({
        x: panRef.current.originX + deltaX,
        y: panRef.current.originY + deltaY,
        scale: transformRef.current.scale
      });
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    if (pointersRef.current.size === 0) {
      panRef.current = null;
    }
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const direction = event.deltaY > 0 ? -1 : 1;
    const nextScale = transformRef.current.scale * (direction > 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR);
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
    const distances = {
      collapsed: Math.abs(sheetHeight - sheetSizes.collapsed),
      half: Math.abs(sheetHeight - sheetSizes.half),
      full: Math.abs(sheetHeight - sheetSizes.full)
    };
    const next = (Object.keys(distances) as Array<keyof typeof distances>).sort(
      (a, b) => distances[a] - distances[b]
    )[0];
    setPanelState(next);
  };

  const detailBody = selectedNode ? (
    <>
      <div className="flex flex-wrap gap-2">
        {selectedNode.type ? (
          <Badge
            className={cn(
              "border-border/60 bg-surface/70 text-text",
              selectedNode.type === "electiva" &&
                "border-elective/40 bg-elective/10 text-elective"
            )}
          >
            {selectedNode.type === "electiva" ? "Electiva" : "Obligatoria"}
          </Badge>
        ) : null}
        {selectedNode.cycle ? (
          <Badge className="border-border/60 bg-surface/70 text-muted">
            {CYCLE_LABELS[selectedNode.cycle] ?? selectedNode.cycle}
          </Badge>
        ) : null}
        {selectedNode.credits ? (
          <Badge className="border-border/60 bg-surface/70 text-muted">
            {selectedNode.credits} créditos
          </Badge>
        ) : null}
      </div>
      <div className="grid gap-2 text-sm">
        <p>
          Código: <span className="text-text">{selectedNode.code ?? "Sin código"}</span>
        </p>
        <p>
          Horas semanales: <span className="text-text">{selectedNode.weekly_hours ?? "-"}</span>
        </p>
        <p>
          Horas totales: <span className="text-text">{selectedNode.total_hours ?? "-"}</span>
        </p>
        <p>
          Estado: <span className="text-text">{selectedStatusLabel ?? "Sin estado"}</span>
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-surface/80 p-3">
        <p className="text-xs font-semibold text-text">Prerrequisitos</p>
        <p className="text-xs text-muted">
          {selectedPrereqs.length ? selectedPrereqs.join(" · ") : "Sin correlativas"}
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-surface/80 p-3">
        <p className="text-xs font-semibold text-text">Desbloquea</p>
        <p className="text-xs text-muted">
          {selectedUnlocks.length ? selectedUnlocks.join(" · ") : "Sin dependientes"}
        </p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-surface/80 p-3">
        <p className="text-xs font-semibold text-text">Requisitos</p>
        <p className="text-xs text-muted">{formatList(selectedNode.requirements)}</p>
      </div>
      <div className="rounded-2xl border border-border/60 bg-surface/80 p-3">
        <p className="text-xs font-semibold text-text">Evaluación</p>
        <p className="text-xs text-muted">
          {formatEvaluationTemplate(selectedNode.template)}
        </p>
      </div>
    </>
  ) : null;

  return (
    <section className="relative h-[calc(100svh-var(--app-header-height,96px))]">
      <div className="panel relative h-full overflow-hidden rounded-none border-x-0 border-t-0">
        <div className="relative h-full">
          <div className="map-canvas pointer-events-none absolute inset-0 opacity-60" />
          <div className="pointer-events-none absolute inset-0 subtle-grid opacity-20" />

          <div
            ref={viewportRef}
            className="relative h-full w-full overflow-hidden touch-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          >
            <div
              ref={worldRef}
              className="relative flex w-fit gap-6 px-6 py-6"
              style={{
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
              <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full">
                {lines.map((line) => {
                  const isPrereq = activeId && line.to === activeId;
                  const isUnlock = activeId && line.from === activeId;
                  const isActiveLine = Boolean(isPrereq || isUnlock);
                  const isMuted = Boolean(
                    activeId
                      ? !isActiveLine
                      : deferredSearch &&
                          !searchMatches.has(line.from) &&
                          !searchMatches.has(line.to)
                  );
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
                      strokeWidth={isActiveLine ? 2.2 : 1.2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={isActiveLine ? 0.9 : isMuted ? 0.14 : 0.5}
                      className="transition-all duration-200 ease-out"
                    />
                  );
                })}
              </svg>

              {terms.map((term) => (
                <div key={term} className="relative z-10 flex w-[220px] flex-col gap-3 pt-2">
                  <div className="h-1 w-10 rounded-full bg-border/40" aria-hidden="true" />
                  <div className="flex flex-col gap-3">
                    {(nodesByTerm.get(term) ?? []).map((node) => {
                      const isActive = activeId === node.id;
                      const isHovered = hoveredId === node.id;
                      const isPrereq = prereqIds.has(node.id);
                      const isUnlock = unlockIds.has(node.id);
                      const isElective = node.type === "electiva";
                      const canPreview = isDesktop && !selectedId && isHovered;
                      const showMeta = isDesktop && (isActive || canPreview);
                      const isDimmed = activeId
                        ? !isActive && !isPrereq && !isUnlock
                        : deferredSearch
                        ? !searchMatches.has(node.id)
                        : false;
                      const statusLabel = node.status ? STATUS_LABELS[node.status] : null;
                      const prereqNames = resolveNodeNames(edgeIndex.prereqMap.get(node.id) ?? []);
                      const unlockNames = resolveNodeNames(edgeIndex.unlockMap.get(node.id) ?? []);
                      const prereqSummary = formatPreviewList(prereqNames);
                      const unlockSummary = formatPreviewList(unlockNames);
                      const markerClass = isActive
                        ? "bg-accent"
                        : isPrereq
                        ? "bg-prereq"
                        : isUnlock
                        ? "bg-unlock"
                        : isElective
                        ? "bg-elective"
                        : "bg-border/60";

                      return (
                        <button
                          key={node.id}
                          type="button"
                          data-node-id={node.id}
                          aria-pressed={selectedId === node.id}
                          onPointerDown={(event) => event.stopPropagation()}
                          onMouseEnter={() => {
                            if (!isDesktop || selectedId) return;
                            setHoveredId(node.id);
                          }}
                          onMouseLeave={() => {
                            if (!isDesktop || selectedId) return;
                            setHoveredId(null);
                          }}
                          onFocus={() => !selectedId && setHoveredId(node.id)}
                          onBlur={() => !selectedId && setHoveredId(null)}
                          onClick={() => {
                            setSelectedId(node.id);
                            setHoveredId(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key !== "Enter" && event.key !== " ") return;
                            event.preventDefault();
                            setSelectedId(node.id);
                            setHoveredId(null);
                          }}
                          className={cn(
                            "group relative w-full rounded-2xl border px-3 py-2.5 text-left text-xs font-semibold text-text shadow-tile transition-all duration-200 ease-out",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                            (isActive || canPreview) && "scale-[1.02]",
                            isActive && "border-accent/70 bg-surface/95 shadow-glow",
                            !isActive && isPrereq && "border-prereq/70 bg-prereq/10",
                            !isActive && isUnlock && "border-unlock/70 bg-unlock/10",
                            !isActive && !isPrereq && !isUnlock && isElective &&
                              "border-elective/50 bg-elective/10",
                            !isActive && !isPrereq && !isUnlock && !isElective &&
                              "border-border/60 bg-surface/80",
                            isDimmed && "opacity-35"
                          )}
                        >
                          <span
                            className={cn(
                              "absolute left-0 top-0 h-full w-1 rounded-l-2xl transition",
                              markerClass
                            )}
                          />
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold leading-tight text-text">
                                {node.name}
                              </p>
                              <p className="text-[11px] text-muted">
                                {node.code ?? "Sin código"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {statusLabel ? (
                                <span
                                  className={cn(
                                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                                    STATUS_STYLES[node.status ?? ""]
                                  )}
                                >
                                  {statusLabel}
                                </span>
                              ) : null}
                              {node.color ? (
                                <span
                                  className="h-2.5 w-2.5 rounded-full border border-border/40"
                                  style={{ backgroundColor: node.color }}
                                />
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-semibold">
                            {node.credits ? (
                              <span className="rounded-full border border-border/60 bg-surface/80 px-2 py-0.5 text-muted">
                                {node.credits} créditos
                              </span>
                            ) : null}
                            {node.cycle ? (
                              <span className="rounded-full border border-border/60 bg-surface/80 px-2 py-0.5 text-muted">
                                {CYCLE_LABELS[node.cycle] ?? node.cycle}
                              </span>
                            ) : null}
                            {isElective ? (
                              <span className="rounded-full border border-elective/40 bg-elective/10 px-2 py-0.5 text-elective">
                                Electiva
                              </span>
                            ) : null}
                          </div>
                          <div
                            className={cn(
                              "mt-2 overflow-hidden text-[10px] text-muted transition-all duration-200",
                              showMeta ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span>Correlativas</span>
                              <span className="text-text">{prereqSummary}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2">
                              <span>Habilita</span>
                              <span className="text-text">{unlockSummary}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

          </div>

          <div className="pointer-events-none absolute inset-0 z-20">
            <div className="pointer-events-auto absolute left-4 top-4 flex w-[min(360px,calc(100%-2rem))] flex-col gap-3 rounded-3xl border border-border/60 bg-surface/85 p-4 shadow-glow backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.35em] text-muted">Mapa</span>
                <span className="text-xs font-semibold text-text">Correlativas</span>
                <span className="text-[10px] text-muted">Pasar cursor expande · Clic fija</span>
              </div>
              <div className="relative">
                <Input
                  placeholder="Buscar materia o código"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onFocus={() => setIsSearchOpen(true)}
                  onBlur={() => setTimeout(() => setIsSearchOpen(false), 160)}
                  onKeyDown={handleSearchKeyDown}
                />
                {isSearchOpen && deferredSearch ? (
                  <div
                    className="absolute z-30 mt-2 w-full rounded-2xl border border-border/60 bg-surface/95 p-2 shadow-lg"
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    {searchResults.length ? (
                      <div className="max-h-52 overflow-auto">
                        {searchResults.map((node) => (
                          <button
                            key={node.id}
                            type="button"
                            onClick={() => handleSearchSelect(node)}
                            className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-xs text-text hover:bg-surface-2/70"
                          >
                            <span className="font-semibold">{node.name}</span>
                            <span className="text-[10px] text-muted">{node.code ?? ""}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="px-2 py-2 text-xs text-muted">Sin coincidencias.</p>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-pressed={showElectives}
                  onClick={() => setShowElectives((value) => !value)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    showElectives
                      ? "border-elective/60 bg-elective/10 text-elective"
                      : "border-border/60 text-muted hover:border-elective/40"
                  )}
                >
                  <span className="h-2 w-2 rounded-full bg-elective" />
                  Electivas
                </button>
                <Button variant="outline" size="sm" onClick={clearSelection} disabled={!selectedId}>
                  Limpiar selección
                </Button>
              </div>
              <p className="text-[10px] text-muted">Modo navegación activo: pan, zoom y selección de detalle.</p>
              <details className="hidden rounded-2xl border border-border/60 bg-surface/80 p-3 text-xs text-muted sm:block">
                <summary className="cursor-pointer select-none text-[11px] uppercase tracking-[0.3em] text-muted">
                  Leyenda
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-prereq/10 text-prereq border-prereq/40">Prerrequisito</Badge>
                  <Badge className="bg-unlock/10 text-unlock border-unlock/40">Habilita</Badge>
                  <Badge className="bg-elective/10 text-elective border-elective/40">Electiva</Badge>
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <Badge key={key} className={STATUS_STYLES[key]}>
                      {label}
                    </Badge>
                  ))}
                </div>
              </details>
              {deferredSearch ? (
                <p className="text-[10px] text-muted">
                  {searchMatches.size} coincidencia{searchMatches.size === 1 ? "" : "s"}
                </p>
              ) : null}
              {!selectedNode ? (
                <p className="text-[10px] text-muted">
                  Seleccioná una materia para abrir el detalle.
                </p>
              ) : null}
            </div>

            <div className="pointer-events-auto absolute right-4 bottom-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleZoomIn}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-surface/80 text-sm font-semibold text-text shadow-glow"
                aria-label="Acercar"
              >
                +
              </button>
              <button
                type="button"
                onClick={handleZoomOut}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-surface/80 text-sm font-semibold text-text shadow-glow"
                aria-label="Alejar"
              >
                -
              </button>
              <button
                type="button"
                onClick={handleCenter}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-surface/80 text-[11px] font-semibold text-text shadow-glow"
                aria-label="Centrar"
              >
                C
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-surface/80 text-[11px] font-semibold text-text shadow-glow"
                aria-label="Reiniciar vista"
              >
                R
              </button>
            </div>

            {selectedNode ? (
              <aside className="pointer-events-auto absolute right-4 top-4 hidden w-[320px] flex-col rounded-3xl border border-border/60 bg-surface/90 shadow-glow backdrop-blur lg:flex">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-muted">Detalle</p>
                    <h3 className="text-lg font-semibold text-text font-display">
                      {selectedNode.name}
                    </h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearSelection}>
                    Cerrar
                  </Button>
                </div>
                <div className="max-h-[calc(100vh-220px)] space-y-4 overflow-y-auto px-5 py-4 text-sm text-muted">
                  {detailBody}
                </div>
              </aside>
            ) : null}

            {selectedNode ? (
              <div
                className="pointer-events-auto absolute bottom-0 left-0 right-0 lg:hidden"
                onPointerMove={handleSheetPointerMove}
                onPointerUp={handleSheetPointerUp}
                onPointerCancel={handleSheetPointerUp}
              >
                <div
                  className="rounded-t-3xl border border-border/60 bg-surface/90 shadow-glow backdrop-blur"
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
                        {selectedNode.name}
                      </h3>
                      {selectedNode.code ? (
                        <p className="text-[11px] text-muted">{selectedNode.code}</p>
                      ) : null}
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
                    {detailBody}
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
