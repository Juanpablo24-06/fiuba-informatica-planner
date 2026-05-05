import type { MapEdge, MapNode, FinalProjectTrack, LayoutResult, NodeLayout } from "@/lib/map/types";
import {
  CBC_SUBJECT_NAMES,
  ELECTIVE_ORDER_INDEX,
  FIXED_NODE_POSITIONS,
  GENERIC_ELECTIVE_NAMES,
  LANE_COUNT,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  REQUIRED_ORDER_INDEX,
  ROW_GAP,
  SECTION_GAP,
  SECTION_SIDE_PADDING,
  SLOT_GAP,
  ELECTIVE_COLUMN_GAP,
  ELECTIVE_GROUP_GAP,
  WORLD_PADDING_X,
  WORLD_PADDING_Y
} from "@/lib/map/map-constants";

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const chunk = <T,>(items: T[], size: number) => {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
};

export const formatList = (items?: string[] | null) => {
  if (!items || items.length === 0) return "Sin datos";
  return items.join(" · ");
};

export const formatPreviewList = (items: string[]) => {
  if (!items.length) return "Ninguna";
  const slice = items.slice(0, 2);
  const extra = items.length - slice.length;
  return extra > 0 ? `${slice.join(" · ")} +${extra}` : slice.join(" · ");
};

export const formatFinalProjectProgress = (credits?: number | null) =>
  `${Math.min(12, credits ?? 0)}/12 créditos`;

export const formatCbcProgress = (credits?: number | null) => `${Math.min(38, credits ?? 0)}/38 créditos`;

export const getNodeTerm = (node?: MapNode) => node?.term ?? 0;

export const getOrderedTerms = (nodes: MapNode[]) =>
  Array.from(new Set(nodes.map((node) => getNodeTerm(node)).filter((term) => term > 0))).sort(
    (a, b) => a - b
  );

export const isGenericElectiveNode = (node: MapNode) => GENERIC_ELECTIVE_NAMES.has(node.name);
export const isCbcClusterNode = (node?: MapNode | null) => node?.display_kind === "cbc_cluster";
export const isCbcLeafNode = (node?: MapNode | null) =>
  Boolean(node && !isCbcClusterNode(node) && CBC_SUBJECT_NAMES.has(node.name));

export const isFinalProjectNode = (node?: MapNode | null) =>
  Boolean(
    node &&
      (node.display_kind === "final_project" ||
        /Trabajo Integrador Final|Tesis\/Trabajo Profesional/i.test(node.name))
  );

export const getFinalProjectStage = (node?: MapNode | null) =>
  node?.term === 10 || /II$/i.test(node?.name ?? "") ? "II" : "I";

export const getDisplayNodeName = (node: MapNode, track: FinalProjectTrack) => {
  if (isCbcClusterNode(node)) return "Ciclo Básico Común";
  if (!isFinalProjectNode(node)) return node.name;
  if (node.display_kind === "final_project") {
    return "Trabajo Integrador Final";
  }
  const base =
    track === "tesis"
      ? "Tesis de Ingeniería Informática"
      : "Trabajo Profesional de Ingeniería Informática";
  return `${base} ${getFinalProjectStage(node)}`;
};

export const getDisplayNodeMeta = (node: MapNode) => {
  if (isCbcClusterNode(node)) return "CBC · tramo inicial";
  if (!isFinalProjectNode(node)) return node.code ?? "Sin código";
  if (node.display_kind === "final_project") return "TIF · tramo final";
  return `TIF · ${getNodeTerm(node)}° cuatrimestre`;
};

export const getFixedNodePosition = (node: MapNode) => FIXED_NODE_POSITIONS.get(node.name) ?? null;

export const buildEdgeMaps = (edges: MapEdge[]) => {
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

export const sortByAnchor = (
  items: MapNode[],
  incomingByNode: Map<string, string[]>,
  placements: Record<string, NodeLayout>,
  nodesById: Map<string, MapNode>
) => {
  const centerLane = (LANE_COUNT - 1) / 2;
  const getExplicitOrder = (node: MapNode) => {
    if (node.type === "electiva") {
      return ELECTIVE_ORDER_INDEX.get(node.name);
    }
    return REQUIRED_ORDER_INDEX.get(node.name);
  };

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
    const firstIndex = getExplicitOrder(first);
    const secondIndex = getExplicitOrder(second);
    if (
      typeof firstIndex === "number" &&
      typeof secondIndex === "number" &&
      firstIndex !== secondIndex
    ) {
      return firstIndex - secondIndex;
    }
    const firstAnchor = getAnchorLane(first);
    const secondAnchor = getAnchorLane(second);
    if (firstAnchor !== secondAnchor) return firstAnchor - secondAnchor;
    return first.name.localeCompare(second.name);
  });
};

export const assignLanes = (
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

export const computeHorizontalLayout = (nodes: MapNode[], edges: MapEdge[]): LayoutResult => {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const { incomingByNode } = buildEdgeMaps(edges);
  const placements: Record<string, NodeLayout> = {};
  const sections = [] as LayoutResult["sections"];
  const terms = getOrderedTerms(nodes);
  const slotHeight = NODE_MIN_HEIGHT + ROW_GAP;
  const laneToY = (lane: number) => WORLD_PADDING_Y + lane * slotHeight;

  let currentLeft = WORLD_PADDING_X;

  for (const term of terms) {
    const termNodes = nodes.filter((node) => getNodeTerm(node) === term);
    if (!termNodes.length) continue;

    const sectionLeft = currentLeft;
    let cursorX = sectionLeft + SECTION_SIDE_PADDING;
    let fixedContentWidth = 0;
    let lastColumnGap = SLOT_GAP;

    const fixedNodes = termNodes.filter((node) => getFixedNodePosition(node));
    const floatingNodes = termNodes.filter((node) => !getFixedNodePosition(node));

    if (fixedNodes.length) {
      const fixedRequiredColumns = fixedNodes
        .filter((node) => node.type !== "electiva")
        .map((node) => getFixedNodePosition(node)?.column ?? 0);
      const electiveColumnOffset = fixedRequiredColumns.length
        ? Math.max(...fixedRequiredColumns) + 1
        : 0;

      fixedNodes.forEach((node) => {
        const position = getFixedNodePosition(node);
        if (!position) return;
        const fixedGap = node.type === "electiva" ? ELECTIVE_COLUMN_GAP : SLOT_GAP;
        const resolvedColumn =
          node.type === "electiva" ? position.column + electiveColumnOffset : position.column;
        const x = sectionLeft + SECTION_SIDE_PADDING + resolvedColumn * (NODE_WIDTH + fixedGap);
        const y = laneToY(position.lane);
        placements[node.id] = {
          x,
          y,
          width: NODE_WIDTH,
          height: NODE_MIN_HEIGHT,
          lane: position.lane
        };
        fixedContentWidth = Math.max(
          fixedContentWidth,
          (resolvedColumn + 1) * NODE_WIDTH + resolvedColumn * fixedGap
        );
      });
      cursorX = sectionLeft + SECTION_SIDE_PADDING + fixedContentWidth + (fixedContentWidth ? SLOT_GAP : 0);
    }

    const placeColumn = (columnNodes: MapNode[], columnGap: number = SLOT_GAP) => {
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
        cursorX += NODE_WIDTH + columnGap;
        lastColumnGap = columnGap;
      });
    };

    if (floatingNodes.length) {
      const genericElectives = floatingNodes
        .filter((node) => isGenericElectiveNode(node))
        .sort((a, b) => a.name.localeCompare(b.name));

      const mainNodes = sortByAnchor(
        floatingNodes.filter((node) => node.type !== "electiva"),
        incomingByNode,
        placements,
        nodesById
      );

      const electiveNodes = floatingNodes.filter(
        (node) => node.type === "electiva" && !isGenericElectiveNode(node)
      );

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
            placeColumn(levels.get(level) ?? [], ELECTIVE_COLUMN_GAP);
          });
      }

      if (genericElectives.length) {
        placeColumn(genericElectives, ELECTIVE_GROUP_GAP);
      }
    }

    const computedFlowWidth = Math.max(
      0,
      cursorX -
        sectionLeft -
        SECTION_SIDE_PADDING -
        (cursorX > sectionLeft + SECTION_SIDE_PADDING ? lastColumnGap : 0)
    );
    const contentWidth = Math.max(NODE_WIDTH, fixedContentWidth, computedFlowWidth);
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

export const buildLinePaths = (positions: Record<string, NodeLayout>, edges: MapEdge[]) => {
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
    .filter(Boolean) as Array<{ from: string; to: string; d: string }>;
};
