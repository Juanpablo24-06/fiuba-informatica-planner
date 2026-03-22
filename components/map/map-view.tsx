"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { EvaluationTemplate } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatEvaluationTemplate } from "@/lib/templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
  lane: number;
};

type SectionLayout = {
  term: number;
  left: number;
  width: number;
};

type LayoutResult = {
  nodeLayouts: Record<string, NodeLayout>;
  sections: SectionLayout[];
  width: number;
  height: number;
};

type FinalProjectTrack = "tesis" | "trabajo_profesional";

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
const MIN_ZOOM = 0.12;
const MAX_ZOOM = 1.7;
const ZOOM_FACTOR = 1.12;
const DESKTOP_PANEL_WIDTH = 340;

const WORLD_PADDING_X = 72;
const WORLD_PADDING_Y = 52;
const SECTION_GAP = 84;
const SECTION_SIDE_PADDING = 16;
const ROW_GAP = 18;
const LANE_COUNT = 7;
const NODE_WIDTH = 208;
const NODE_MIN_HEIGHT = 108;
const SLOT_GAP = 58;
const GENERIC_ELECTIVE_NAMES = new Set(["Electivas/Optativas I", "Electivas/Optativas II"]);
const DRAG_THRESHOLD = 8;
const MAP_VIEW_STORAGE_KEY = "fiuba-map-view-v2";
const MAP_FINAL_TRACK_STORAGE_KEY = "fiuba-map-final-track-v1";
const PAN_DRAG_MULTIPLIER = 1.18;
const OFFICIAL_ELECTIVE_ORDER = [
  "Lenguajes y Compiladores I",
  "Fundamentos Matemáticos de la Criptografía",
  "Criptografía I",
  "Criptografía II",
  "Sistemas Distribuidos II",
  "Técnicas de Ingeniería Inversa",
  "Criptoanálisis",
  "Ingeniería de Datos",
  "Optimización Convexa",
  "Aprendizaje Automático",
  "Aprendizaje Profundo",
  "Aprendizaje por Refuerzo",
  "Simulación",
  "Sistemas Complejos",
  "Redes Complejas",
  "Teoría Algorítmica de Juegos",
  "Teoría de Computabilidad",
  "Teoría de la Información",
  "Computación Cuántica",
  "Lenguajes y Compiladores II",
  "Análisis Matemático III",
  "Arquitectura de Software"
] as const;
const ELECTIVE_ORDER_INDEX = new Map<string, number>(
  OFFICIAL_ELECTIVE_ORDER.map((name, index) => [name, index])
);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const chunk = <T,>(items: T[], size: number) => {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
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

const getNodeTerm = (node?: MapNode) => node?.term ?? 0;

const isGenericElectiveNode = (node: MapNode) => GENERIC_ELECTIVE_NAMES.has(node.name);

const isFinalProjectNode = (node?: MapNode | null) =>
  Boolean(node?.name && /Trabajo Integrador Final|Tesis\/Trabajo Profesional/i.test(node.name));

const getFinalProjectStage = (node?: MapNode | null) =>
  node?.term === 10 || /II$/i.test(node?.name ?? "") ? "II" : "I";

const getDisplayNodeName = (node: MapNode, track: FinalProjectTrack) => {
  if (!isFinalProjectNode(node)) return node.name;
  const base =
    track === "tesis"
      ? "Tesis de Ingeniería Informática"
      : "Trabajo Profesional de Ingeniería Informática";
  return `${base} ${getFinalProjectStage(node)}`;
};

const getDisplayNodeMeta = (node: MapNode) => {
  if (!isFinalProjectNode(node)) return node.code ?? "Sin código";
  return `TIF · ${getNodeTerm(node)}° cuatrimestre`;
};

const buildEdgeMaps = (edges: MapEdge[]) => {
  const incomingByNode = new Map<string, string[]>();
  const outgoingByNode = new Map<string, string[]>();

  edges.forEach((edge) => {
    if (!incomingByNode.has(edge.to)) incomingByNode.set(edge.to, []);
    incomingByNode.get(edge.to)?.push(edge.from);

    if (!outgoingByNode.has(edge.from)) outgoingByNode.set(edge.from, []);
    outgoingByNode.get(edge.from)?.push(edge.to);
  });

  return { incomingByNode, outgoingByNode };
};

const sortByAnchor = (
  items: MapNode[],
  incomingByNode: Map<string, string[]>,
  placements: Record<string, NodeLayout>,
  nodesById: Map<string, MapNode>
) => {
  const centerLane = (LANE_COUNT - 1) / 2;

  const getAnchorLane = (node: MapNode) => {
    const parentIds = incomingByNode.get(node.id) ?? [];
    const weights = parentIds
      .map((parentId) => {
        const layout = placements[parentId];
        const parent = nodesById.get(parentId);
        if (!layout || !parent) return null;
        const weight = parent.type === "electiva" ? 1.35 : 1;
        return { lane: layout.lane, weight };
      })
      .filter(Boolean) as Array<{ lane: number; weight: number }>;

    if (!weights.length) return centerLane;

    const weightedTotal = weights.reduce((sum, item) => sum + item.lane * item.weight, 0);
    const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
    return weightedTotal / totalWeight;
  };

  return [...items].sort((first, second) => {
    if (first.type === "electiva" && second.type === "electiva") {
      const firstIndex = ELECTIVE_ORDER_INDEX.get(first.name);
      const secondIndex = ELECTIVE_ORDER_INDEX.get(second.name);
      if (typeof firstIndex === "number" && typeof secondIndex === "number" && firstIndex !== secondIndex) {
        return firstIndex - secondIndex;
      }
    }
    const firstAnchor = getAnchorLane(first);
    const secondAnchor = getAnchorLane(second);
    if (firstAnchor !== secondAnchor) return firstAnchor - secondAnchor;
    return first.name.localeCompare(second.name);
  });
};

const assignLanes = (
  items: MapNode[],
  incomingByNode: Map<string, string[]>,
  placements: Record<string, NodeLayout>,
  nodesById: Map<string, MapNode>
) => {
  if (items.length >= LANE_COUNT) {
    return items.map((_, index) => index);
  }

  const centerLane = (LANE_COUNT - 1) / 2;
  const anchors = items.map((node) => {
    const parentIds = incomingByNode.get(node.id) ?? [];
    const parentLanes = parentIds
      .map((parentId) => {
        const layout = placements[parentId];
        const parent = nodesById.get(parentId);
        if (!layout || !parent) return null;
        const weight = parent.type === "electiva" ? 1.35 : 1;
        return { lane: layout.lane, weight };
      })
      .filter(Boolean) as Array<{ lane: number; weight: number }>;

    if (!parentLanes.length) return centerLane;

    const weightedTotal = parentLanes.reduce((sum, item) => sum + item.lane * item.weight, 0);
    const totalWeight = parentLanes.reduce((sum, item) => sum + item.weight, 0);
    return weightedTotal / totalWeight;
  });

  const averageAnchor =
    anchors.reduce((sum, value) => sum + value, 0) / Math.max(anchors.length, 1);

  if (items.length === 1) {
    return [clamp(averageAnchor, 1.1, LANE_COUNT - 2.1)];
  }

  const edgeInset = 0.7;
  const desiredSpan = clamp((items.length - 1) * 1.85, 2.9, LANE_COUNT - 1 - edgeInset * 2);
  const halfSpan = desiredSpan / 2;
  const center = clamp(
    averageAnchor,
    edgeInset + halfSpan,
    LANE_COUNT - 1 - edgeInset - halfSpan
  );
  const step = desiredSpan / (items.length - 1);

  return items.map((_, index) => center - halfSpan + step * index);
};

const computeHorizontalLayout = (nodes: MapNode[], edges: MapEdge[]): LayoutResult => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const { incomingByNode } = buildEdgeMaps(edges);
  const placements: Record<string, NodeLayout> = {};
  const sections: SectionLayout[] = [];
  const slotHeight = NODE_MIN_HEIGHT + ROW_GAP;
  const laneToY = (lane: number) => WORLD_PADDING_Y + lane * slotHeight;

  let currentLeft = WORLD_PADDING_X;

  for (const term of TERMS) {
    const termNodes = nodes.filter((node) => getNodeTerm(node) === term);
    if (!termNodes.length) continue;

    const sectionLeft = currentLeft;
    let cursorX = sectionLeft + SECTION_SIDE_PADDING;

    const genericElectives = termNodes
      .filter((node) => isGenericElectiveNode(node))
      .sort((a, b) => a.name.localeCompare(b.name));

    const mainNodes = sortByAnchor(
      termNodes.filter((node) => node.type !== "electiva"),
      incomingByNode,
      placements,
      nodesById
    );

    const electiveNodes = termNodes.filter(
      (node) => node.type === "electiva" && !isGenericElectiveNode(node)
    );

    const placeColumn = (columnNodes: MapNode[]) => {
      const sorted = sortByAnchor(columnNodes, incomingByNode, placements, nodesById);
      const columns = chunk(sorted, LANE_COUNT);

      columns.forEach((column) => {
        const lanes = assignLanes(column, incomingByNode, placements, nodesById);
        column.forEach((node, index) => {
          placements[node.id] = {
            x: cursorX,
            y: laneToY(lanes[index]),
            width: NODE_WIDTH,
            height: NODE_MIN_HEIGHT,
            lane: lanes[index]
          };
        });
        cursorX += NODE_WIDTH + SLOT_GAP;
      });
    };

    if (mainNodes.length) {
      placeColumn(mainNodes);
    }

    if (electiveNodes.length) {
      const sameTermElectiveIds = new Set(electiveNodes.map((node) => node.id));
      const levelMemo = new Map<string, number>();

      const getElectiveLevel = (nodeId: string): number => {
        const cached = levelMemo.get(nodeId);
        if (typeof cached === "number") return cached;

        const parents = (incomingByNode.get(nodeId) ?? []).filter((parentId) =>
          sameTermElectiveIds.has(parentId)
        );

        const nextLevel = parents.length
          ? Math.max(...parents.map((parentId) => getElectiveLevel(parentId))) + 1
          : 0;

        levelMemo.set(nodeId, nextLevel);
        return nextLevel;
      };

      const levels = new Map<number, MapNode[]>();

      electiveNodes.forEach((node) => {
        const level = getElectiveLevel(node.id);
        if (!levels.has(level)) levels.set(level, []);
        levels.get(level)?.push(node);
      });

      Array.from(levels.keys())
        .sort((a, b) => a - b)
        .forEach((level) => {
          placeColumn(levels.get(level) ?? []);
        });
    }

    if (genericElectives.length) {
      placeColumn(genericElectives);
    }

    const contentWidth = Math.max(NODE_WIDTH, cursorX - sectionLeft - SLOT_GAP);
    const sectionWidth = contentWidth + SECTION_SIDE_PADDING * 2;
    sections.push({
      term,
      left: sectionLeft,
      width: sectionWidth
    });

    currentLeft += sectionWidth + SECTION_GAP;
  }

  const width = Math.max(
    WORLD_PADDING_X * 2 + NODE_WIDTH,
    currentLeft - SECTION_GAP + WORLD_PADDING_X
  );
  const height =
    WORLD_PADDING_Y * 2 + NODE_MIN_HEIGHT + (LANE_COUNT - 1) * (NODE_MIN_HEIGHT + ROW_GAP);

  return {
    nodeLayouts: placements,
    sections,
    width,
    height
  };
};

const buildLinePaths = (positions: Record<string, NodeLayout>, edges: MapEdge[]): LinePath[] => {
  const outgoingTotal = new Map<string, number>();
  const incomingTotal = new Map<string, number>();

  edges.forEach((edge) => {
    outgoingTotal.set(edge.from, (outgoingTotal.get(edge.from) ?? 0) + 1);
    incomingTotal.set(edge.to, (incomingTotal.get(edge.to) ?? 0) + 1);
  });

  const outgoingSeen = new Map<string, number>();
  const incomingSeen = new Map<string, number>();

  return edges
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

      const fromLaneOffset =
        ((fromOrder + 1) / (fromTotal + 1) - 0.5) * Math.max(20, from.height * 0.54);
      const toLaneOffset =
        ((toOrder + 1) / (toTotal + 1) - 0.5) * Math.max(20, to.height * 0.54);

      const inset = 18;
      const x1 = from.x + from.width + 1;
      const y1 = clamp(
        from.y + from.height / 2 + fromLaneOffset,
        from.y + inset,
        from.y + from.height - inset
      );
      const x2 = to.x - 1;
      const y2 = clamp(
        to.y + to.height / 2 + toLaneOffset,
        to.y + inset,
        to.y + to.height - inset
      );
      const deltaX = x2 - x1;
      const travelX = Math.max(56, Math.abs(deltaX));
      const curveX = Math.max(52, Math.min(220, travelX * 0.42));
      const verticalDrift = Math.min(28, Math.abs(y2 - y1) * 0.18);
      const horizontalDirection = x2 >= x1 ? 1 : -1;
      const verticalDirection = y2 >= y1 ? 1 : -1;
      const c1x = x1 + curveX * horizontalDirection;
      const c2x = x2 - curveX * horizontalDirection;
      const c1y = y1 + verticalDrift * verticalDirection;
      const c2y = y2 - verticalDrift * verticalDirection;
      const d = `M ${x1} ${y1} C ${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`;

      return { from: edge.from, to: edge.to, d };
    })
    .filter(Boolean) as LinePath[];
};

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
  const [panelState, setPanelState] = useState<"collapsed" | "half" | "full">("collapsed");
  const [sheetHeight, setSheetHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const [isPanningViewport, setIsPanningViewport] = useState(false);
  const [finalProjectTrack, setFinalProjectTrack] = useState<FinalProjectTrack>("tesis");

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
      window.localStorage.setItem(MAP_FINAL_TRACK_STORAGE_KEY, finalProjectTrack);
    } catch {
      // Ignore storage write issues.
    }
  }, [finalProjectTrack]);

  const sheetSizes = useMemo(() => {
    const collapsed = 126;
    const half = Math.max(256, Math.min(430, viewportHeight * 0.54));
    const full = Math.max(360, Math.min(700, viewportHeight * 0.84));
    return { collapsed, half, full };
  }, [viewportHeight]);

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

  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    nodes.forEach((node) => {
      if (showElectives || node.type !== "electiva") {
        ids.add(node.id);
      }
    });
    return ids;
  }, [nodes, showElectives]);

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

  const defaultFocus = useMemo(() => {
    const currentCandidates = visibleNodes.filter((node) => node.status === "cursando");
    const pendingCandidates = visibleNodes.filter(
      (node) => node.status === "final_pendiente" || node.status === "recursar"
    );
    const incompleteCandidates = visibleNodes.filter((node) => node.status !== "aprobado");
    const source = currentCandidates.length
      ? currentCandidates
      : pendingCandidates.length
      ? pendingCandidates
      : incompleteCandidates.length
      ? incompleteCandidates
      : visibleNodes;
    const layouts = source
      .map((node) => layout.nodeLayouts[node.id])
      .filter(Boolean) as NodeLayout[];

    if (!layouts.length) return null;

    const mode = currentCandidates.length
      ? "current"
      : pendingCandidates.length
      ? "pending"
      : incompleteCandidates.length
      ? "incomplete"
      : "all";

    return {
      mode,
      minX: Math.min(...layouts.map((item) => item.x)),
      maxX: Math.max(...layouts.map((item) => item.x + item.width)),
      minY: Math.min(...layouts.map((item) => item.y)),
      maxY: Math.max(...layouts.map((item) => item.y + item.height))
    };
  }, [layout.nodeLayouts, visibleNodes]);

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
  const selectedPrereqIds = useMemo(() => getPrereqIds(selectedId), [getPrereqIds, selectedId]);
  const selectedUnlockIds = useMemo(() => getUnlockIds(selectedId), [getUnlockIds, selectedId]);

  const resolveNodeNames = useCallback(
    (ids: Iterable<string>) => {
      const names = Array.from(ids)
        .map((id) => nodesById.get(id))
        .filter((node): node is MapNode => Boolean(node))
        .filter((node) => showElectives || node.type !== "electiva")
        .map((node) => getDisplayNodeName(node, finalProjectTrack));
      names.sort((a, b) => a.localeCompare(b));
      return names;
    },
    [finalProjectTrack, nodesById, showElectives]
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

      const width = viewport.clientWidth;
      const height = viewport.clientHeight;
      const scaledWidth = worldSize.width * next.scale;
      const scaledHeight = worldSize.height * next.scale;
      const extraX = Math.max(220, width * 0.38);
      const extraY = Math.max(220, height * 0.34);

      let minX = Math.min(0, width - scaledWidth) - extraX;
      let maxX = Math.max(0, width - scaledWidth) + extraX;
      let minY = Math.min(0, height - scaledHeight) - extraY;
      let maxY = Math.max(0, height - scaledHeight) + extraY;

      if (scaledWidth <= width) {
        const centered = (width - scaledWidth) / 2;
        minX = centered - extraX;
        maxX = centered + extraX;
      }
      if (scaledHeight <= height) {
        const centered = (height - scaledHeight) / 2;
        minY = centered - extraY;
        maxY = centered + extraY;
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
        hasUserMovedRef.current = true;
        initialCameraAppliedRef.current = true;
        setTransformSafe(persisted);
        return;
      }

      if (defaultFocus) {
        const isCurrent = defaultFocus.mode === "current";
        const paddingX = isDesktop
          ? isCurrent
            ? 164
            : 92
          : isCurrent
          ? 34
          : 24;
        const paddingY = isDesktop
          ? isCurrent
            ? 148
            : 92
          : isCurrent
          ? 44
          : 28;
        const groupWidth = defaultFocus.maxX - defaultFocus.minX;
        const groupHeight = defaultFocus.maxY - defaultFocus.minY;
        const scale = clamp(
          Math.min(
            (viewport.clientWidth - paddingX * 2) / Math.max(groupWidth, NODE_WIDTH),
            (viewport.clientHeight - paddingY * 2) / Math.max(groupHeight, NODE_MIN_HEIGHT)
          ),
          MIN_ZOOM,
          isDesktop
            ? isCurrent
              ? 1.04
              : 0.98
            : isCurrent
            ? 1.28
            : 1.16
        );
        const centerX = (defaultFocus.minX + defaultFocus.maxX) / 2;
        const centerY = (defaultFocus.minY + defaultFocus.maxY) / 2;

        initialCameraAppliedRef.current = true;
        setTransformSafe({
          x: viewport.clientWidth / 2 - centerX * scale,
          y: viewport.clientHeight * (isDesktop ? (isCurrent ? 0.5 : 0.43) : isCurrent ? 0.44 : 0.4) - centerY * scale,
          scale
        });
        return;
      }

      const scaledWidth = layout.width * transformRef.current.scale;
      const scaledHeight = layout.height * transformRef.current.scale;
      const x =
        scaledWidth < viewport.clientWidth
          ? (viewport.clientWidth - scaledWidth) / 2
          : transformRef.current.x;
      const y =
        scaledHeight < viewport.clientHeight
          ? (viewport.clientHeight - scaledHeight) / 2
          : Math.min(24, transformRef.current.y);

      initialCameraAppliedRef.current = true;
      setTransformSafe({
        x,
        y,
        scale: transformRef.current.scale
      });
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

      const desiredCardWidth = isDesktop ? viewport.clientWidth * 0.22 : viewport.clientWidth * 0.68;
      const fittedScale = desiredCardWidth / selectedLayout.width;
      const scale = clamp(zoom ? fittedScale : transformRef.current.scale, 0.68, 1.24);

      const centerX = selectedLayout.x + selectedLayout.width / 2;
      const centerY = selectedLayout.y + selectedLayout.height / 2;
      const targetX = (viewport.clientWidth - (isDesktop ? DESKTOP_PANEL_WIDTH : 0)) / 2;
      const targetY = isDesktop ? viewport.clientHeight / 2 : viewport.clientHeight * 0.34;
      const target = clampTransform({
        x: targetX - centerX * scale,
        y: targetY - centerY * scale,
        scale
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
    [clampTransform, isDesktop, nodeLayouts, scheduleTransform, stopCameraAnimation]
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
      const clamped = clamp(scale, MIN_ZOOM, MAX_ZOOM);
      const { x, y, scale: currentScale } = transformRef.current;
      const worldX = (centerX - x) / currentScale;
      const worldY = (centerY - y) / currentScale;
      const nextX = centerX - worldX * clamped;
      const nextY = centerY - worldY * clamped;
      hasUserMovedRef.current = true;
      setTransformSafe({ x: nextX, y: nextY, scale: clamped });
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
        setSelectedId(pressedNodeIdRef.current);
        setHoveredId(null);
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
        {isFinalProjectNode(selectedNode) ? (
          <Badge className="border-accent/35 bg-accent/10 text-accent">
            {finalProjectTrack === "tesis" ? "Modalidad tesis" : "Modalidad trabajo profesional"}
          </Badge>
        ) : null}
      </div>
      <div className="grid gap-2 text-sm">
        <p>
          {isFinalProjectNode(selectedNode) ? "Tramo" : "Código"}:{" "}
          <span className="text-text">{getDisplayNodeMeta(selectedNode)}</span>
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
      {isFinalProjectNode(selectedNode) ? (
        <div className="rounded-2xl border border-accent/25 bg-accent/5 p-3">
          <p className="text-xs font-semibold text-text">Definición del TIF</p>
          <p className="mt-1 text-xs text-muted">
            El plan oficial lo ubica al final del recorrido, entre 9° y 10° cuatrimestre, y puede cursarse como tesis o trabajo profesional.
          </p>
          <div className="mt-3 inline-flex rounded-full border border-border/60 bg-surface/80 p-1">
            <button
              type="button"
              onClick={() => setFinalProjectTrack("tesis")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                finalProjectTrack === "tesis"
                  ? "bg-accent text-accent-contrast"
                  : "text-muted hover:text-text"
              )}
            >
              Tesis
            </button>
            <button
              type="button"
              onClick={() => setFinalProjectTrack("trabajo_profesional")}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition",
                finalProjectTrack === "trabajo_profesional"
                  ? "bg-accent text-accent-contrast"
                  : "text-muted hover:text-text"
              )}
            >
              Trabajo profesional
            </button>
          </div>
        </div>
      ) : null}
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
        <p className="text-xs text-muted">{formatEvaluationTemplate(selectedNode.template)}</p>
      </div>
    </>
  ) : null;

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
              "top-[calc(var(--app-header-height,96px)+0.5rem)] bottom-[calc(var(--synapse-launcher-height,72px)+1rem)]",
              isPanningViewport ? "cursor-grabbing" : "cursor-grab"
            )}
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
                const isElective = node.type === "electiva";
                const isDimmed = activeId ? !isActive && !isPrereq && !isUnlock : false;
                const showMeta = isActive || (isDesktop && !selectedId && hoveredId === node.id);
                const statusLabel = node.status ? STATUS_LABELS[node.status] : null;
                const displayName = getDisplayNodeName(node, finalProjectTrack);
                const displayMeta = getDisplayNodeMeta(node);
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
                    className={cn(
                      "group absolute rounded-2xl border px-3 py-3 text-left text-xs font-semibold text-text shadow-tile transition-all duration-200 ease-out",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                      (isActive || showMeta) && "z-30 scale-[1.02] shadow-glow",
                      !isActive && !showMeta && "z-20",
                      isActive && "border-accent/70 bg-surface shadow-glow",
                      !isActive && isPrereq && "border-prereq/70 bg-surface",
                      !isActive && isUnlock && "border-unlock/70 bg-surface",
                      !isActive && !isPrereq && !isUnlock && isElective &&
                        "border-elective/55 bg-surface",
                      !isActive && !isPrereq && !isUnlock && !isElective &&
                        "border-border/60 bg-surface",
                      isDimmed && "opacity-55"
                    )}
                    style={{
                      left: layoutNode.x,
                      top: layoutNode.y,
                      width: NODE_WIDTH,
                      minHeight: NODE_MIN_HEIGHT
                    }}
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
                          {displayName}
                        </p>
                        <p className="text-[11px] text-muted">{displayMeta}</p>
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
                      {isFinalProjectNode(node) ? (
                        <span className="rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 text-accent">
                          {finalProjectTrack === "tesis" ? "Tesis" : "Trabajo profesional"}
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
                        showMeta ? "max-h-28 opacity-100" : "max-h-0 opacity-0"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>Correlativas</span>
                        <span className="text-right text-text">{prereqSummary}</span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <span>Habilita</span>
                        <span className="text-right text-text">{unlockSummary}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pointer-events-none absolute inset-0 z-30">
            <div className="pointer-events-auto absolute bottom-[calc(var(--synapse-launcher-height,72px)+1rem)] left-4 md:bottom-4">
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

            {selectedNode ? (
              <aside className="pointer-events-auto absolute bottom-[calc(var(--synapse-launcher-height,72px)+1rem)] right-4 top-[calc(var(--app-header-height,96px)+1rem)] hidden w-[340px] flex-col overflow-hidden rounded-3xl border border-border/60 bg-surface/92 shadow-glow backdrop-blur lg:flex">
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
