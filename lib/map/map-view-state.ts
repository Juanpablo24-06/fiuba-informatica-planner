import {
  formatPreviewList,
  getDisplayNodeName,
  isCbcLeafNode
} from "@/lib/map/map-layout";
import { MAP_ELECTIVES_VISIBLE_STORAGE_KEY } from "@/lib/map/map-constants";
import type {
  FinalProjectTrack,
  MapEdge,
  MapNode
} from "@/lib/map/types";

export type MapEdgeIndex = {
  prereqMap: Map<string, string[]>;
  unlockMap: Map<string, string[]>;
};

export type MapNodePreview = {
  prereqNames: string[];
  unlockNames: string[];
  prereqSummary: string;
  unlockSummary: string;
};

export const buildVisibleNodeIds = ({
  nodes,
  showElectives,
  collapseCbc
}: {
  nodes: MapNode[];
  showElectives: boolean;
  collapseCbc: boolean;
}) => {
  const ids = new Set<string>();

  nodes.forEach((node) => {
    if (!showElectives && node.type === "electiva") return;
    if (collapseCbc && isCbcLeafNode(node)) return;
    ids.add(node.id);
  });

  return ids;
};

export const getInitialElectivesVisibility = (
  storage: Pick<Storage, "getItem">
) => {
  try {
    return storage.getItem(MAP_ELECTIVES_VISIBLE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const persistElectivesVisibility = (
  storage: Pick<Storage, "setItem">,
  showElectives: boolean
) => {
  try {
    storage.setItem(MAP_ELECTIVES_VISIBLE_STORAGE_KEY, String(showElectives));
  } catch {
    // Ignore storage write errors and keep the toggle responsive.
  }
};

export const buildMapEdgeIndex = (edges: MapEdge[]): MapEdgeIndex => {
  const prereqMap = new Map<string, string[]>();
  const unlockMap = new Map<string, string[]>();

  edges.forEach((edge) => {
    if (!prereqMap.has(edge.to)) prereqMap.set(edge.to, []);
    prereqMap.get(edge.to)?.push(edge.from);

    if (!unlockMap.has(edge.from)) unlockMap.set(edge.from, []);
    unlockMap.get(edge.from)?.push(edge.to);
  });

  return { prereqMap, unlockMap };
};

const resolveNodeNames = ({
  ids,
  nodesById,
  showElectives,
  finalProjectTrack
}: {
  ids: Iterable<string>;
  nodesById: Map<string, MapNode>;
  showElectives: boolean;
  finalProjectTrack: FinalProjectTrack;
}) => {
  const names = Array.from(ids)
    .map((id) => nodesById.get(id))
    .filter((node): node is MapNode => Boolean(node))
    .filter((node) => showElectives || node.type !== "electiva")
    .map((node) => getDisplayNodeName(node, finalProjectTrack));

  names.sort((first, second) => first.localeCompare(second));
  return names;
};

export const buildNodePreviewIndex = ({
  visibleNodes,
  edgeIndex,
  nodesById,
  showElectives,
  finalProjectTrack
}: {
  visibleNodes: MapNode[];
  edgeIndex: MapEdgeIndex;
  nodesById: Map<string, MapNode>;
  showElectives: boolean;
  finalProjectTrack: FinalProjectTrack;
}) => {
  const previews = new Map<string, MapNodePreview>();

  visibleNodes.forEach((node) => {
    const prereqNames = resolveNodeNames({
      ids: edgeIndex.prereqMap.get(node.id) ?? [],
      nodesById,
      showElectives,
      finalProjectTrack
    });
    const unlockNames = resolveNodeNames({
      ids: edgeIndex.unlockMap.get(node.id) ?? [],
      nodesById,
      showElectives,
      finalProjectTrack
    });

    previews.set(node.id, {
      prereqNames,
      unlockNames,
      prereqSummary: formatPreviewList(prereqNames),
      unlockSummary: formatPreviewList(unlockNames)
    });
  });

  return previews;
};
