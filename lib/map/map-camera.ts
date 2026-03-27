import {
  DESKTOP_PANEL_WIDTH,
  MAX_ZOOM,
  MIN_ZOOM,
  NODE_MIN_HEIGHT,
  NODE_WIDTH
} from "@/lib/map/map-constants";
import { clamp } from "@/lib/map/map-layout";
import type {
  MapNode,
  NodeLayout,
  Transform
} from "@/lib/map/types";

export type DefaultFocusBounds = {
  mode: "current" | "pending" | "incomplete" | "all";
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export type SheetSizes = {
  collapsed: number;
  half: number;
  full: number;
};

export const getSheetSizePreset = (viewportHeight: number): SheetSizes => ({
  collapsed: 126,
  half: Math.max(256, Math.min(430, viewportHeight * 0.54)),
  full: Math.max(360, Math.min(700, viewportHeight * 0.84))
});

export const findNearestSheetState = (
  sheetHeight: number,
  sheetSizes: SheetSizes
) => {
  const distances = {
    collapsed: Math.abs(sheetHeight - sheetSizes.collapsed),
    half: Math.abs(sheetHeight - sheetSizes.half),
    full: Math.abs(sheetHeight - sheetSizes.full)
  };

  return (Object.keys(distances) as Array<keyof typeof distances>).sort(
    (first, second) => distances[first] - distances[second]
  )[0];
};

export const getDefaultFocusBounds = (
  visibleNodes: MapNode[],
  nodeLayouts: Record<string, NodeLayout>
): DefaultFocusBounds | null => {
  const currentCandidates = visibleNodes.filter(
    (node) => node.status === "cursando"
  );
  const pendingCandidates = visibleNodes.filter(
    (node) =>
      node.status === "final_pendiente" || node.status === "recursar"
  );
  const incompleteCandidates = visibleNodes.filter(
    (node) => node.status !== "aprobado"
  );
  const source = currentCandidates.length
    ? currentCandidates
    : pendingCandidates.length
      ? pendingCandidates
      : incompleteCandidates.length
        ? incompleteCandidates
        : visibleNodes;
  const layouts = source
    .map((node) => nodeLayouts[node.id])
    .filter(Boolean) as NodeLayout[];

  if (!layouts.length) return null;

  return {
    mode: currentCandidates.length
      ? "current"
      : pendingCandidates.length
        ? "pending"
        : incompleteCandidates.length
          ? "incomplete"
          : "all",
    minX: Math.min(...layouts.map((item) => item.x)),
    maxX: Math.max(...layouts.map((item) => item.x + item.width)),
    minY: Math.min(...layouts.map((item) => item.y)),
    maxY: Math.max(...layouts.map((item) => item.y + item.height))
  };
};

export const getClampedTransform = ({
  next,
  viewportWidth,
  viewportHeight,
  worldWidth,
  worldHeight
}: {
  next: Transform;
  viewportWidth: number;
  viewportHeight: number;
  worldWidth: number;
  worldHeight: number;
}) => {
  if (!viewportWidth || !viewportHeight || !worldWidth || !worldHeight) {
    return next;
  }

  const scaledWidth = worldWidth * next.scale;
  const scaledHeight = worldHeight * next.scale;
  const extraX = Math.max(220, viewportWidth * 0.38);
  const extraY = Math.max(220, viewportHeight * 0.34);

  let minX = Math.min(0, viewportWidth - scaledWidth) - extraX;
  let maxX = Math.max(0, viewportWidth - scaledWidth) + extraX;
  let minY = Math.min(0, viewportHeight - scaledHeight) - extraY;
  let maxY = Math.max(0, viewportHeight - scaledHeight) + extraY;

  if (scaledWidth <= viewportWidth) {
    const centered = (viewportWidth - scaledWidth) / 2;
    minX = centered - extraX;
    maxX = centered + extraX;
  }

  if (scaledHeight <= viewportHeight) {
    const centered = (viewportHeight - scaledHeight) / 2;
    minY = centered - extraY;
    maxY = centered + extraY;
  }

  return {
    ...next,
    x: clamp(next.x, minX, maxX),
    y: clamp(next.y, minY, maxY)
  };
};

export const resolveInitialMapTransform = ({
  layoutWidth,
  layoutHeight,
  viewportWidth,
  viewportHeight,
  currentTransform,
  persistedTransform,
  defaultFocus,
  isDesktop
}: {
  layoutWidth: number;
  layoutHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  currentTransform: Transform;
  persistedTransform: Transform | null;
  defaultFocus: DefaultFocusBounds | null;
  isDesktop: boolean;
}) => {
  if (persistedTransform) {
    return {
      transform: persistedTransform,
      userMoved: true
    };
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
        (viewportWidth - paddingX * 2) / Math.max(groupWidth, NODE_WIDTH),
        (viewportHeight - paddingY * 2) / Math.max(groupHeight, NODE_MIN_HEIGHT)
      ),
      MIN_ZOOM,
      isDesktop ? (isCurrent ? 1.04 : 0.98) : isCurrent ? 1.28 : 1.16
    );
    const centerX = (defaultFocus.minX + defaultFocus.maxX) / 2;
    const centerY = (defaultFocus.minY + defaultFocus.maxY) / 2;

    return {
      transform: {
        x: viewportWidth / 2 - centerX * scale,
        y:
          viewportHeight *
            (isDesktop
              ? isCurrent
                ? 0.5
                : 0.43
              : isCurrent
                ? 0.44
                : 0.4) -
          centerY * scale,
        scale
      },
      userMoved: false
    };
  }

  const scaledWidth = layoutWidth * currentTransform.scale;
  const scaledHeight = layoutHeight * currentTransform.scale;

  return {
    transform: {
      x:
        scaledWidth < viewportWidth
          ? (viewportWidth - scaledWidth) / 2
          : currentTransform.x,
      y:
        scaledHeight < viewportHeight
          ? (viewportHeight - scaledHeight) / 2
          : Math.min(24, currentTransform.y),
      scale: currentTransform.scale
    },
    userMoved: false
  };
};

export const computeFocusedNodeTransform = ({
  selectedLayout,
  viewportWidth,
  viewportHeight,
  worldWidth,
  worldHeight,
  currentTransform,
  isDesktop,
  zoom
}: {
  selectedLayout: NodeLayout;
  viewportWidth: number;
  viewportHeight: number;
  worldWidth: number;
  worldHeight: number;
  currentTransform: Transform;
  isDesktop: boolean;
  zoom: boolean;
}) => {
  const desiredCardWidth = isDesktop
    ? viewportWidth * 0.22
    : viewportWidth * 0.68;
  const fittedScale = desiredCardWidth / selectedLayout.width;
  const scale = clamp(
    zoom ? fittedScale : currentTransform.scale,
    0.68,
    1.24
  );

  const centerX = selectedLayout.x + selectedLayout.width / 2;
  const centerY = selectedLayout.y + selectedLayout.height / 2;
  const targetX =
    (viewportWidth - (isDesktop ? DESKTOP_PANEL_WIDTH : 0)) / 2;
  const targetY = isDesktop
    ? viewportHeight / 2
    : viewportHeight * 0.34;

  return getClampedTransform({
    next: {
      x: targetX - centerX * scale,
      y: targetY - centerY * scale,
      scale
    },
    viewportWidth,
    viewportHeight,
    worldWidth,
    worldHeight
  });
};

export const computeZoomTransform = ({
  currentTransform,
  nextScale,
  centerX,
  centerY
}: {
  currentTransform: Transform;
  nextScale: number;
  centerX: number;
  centerY: number;
}) => {
  const scale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
  const worldX = (centerX - currentTransform.x) / currentTransform.scale;
  const worldY = (centerY - currentTransform.y) / currentTransform.scale;

  return {
    x: centerX - worldX * scale,
    y: centerY - worldY * scale,
    scale
  };
};

export const computePinchTransform = ({
  initialDistance,
  currentDistance,
  initialScale,
  centerX,
  centerY,
  panX,
  panY
}: {
  initialDistance: number;
  currentDistance: number;
  initialScale: number;
  centerX: number;
  centerY: number;
  panX: number;
  panY: number;
}) => {
  const scale = clamp(
    initialScale * (currentDistance / initialDistance),
    MIN_ZOOM,
    MAX_ZOOM
  );
  const worldX = (centerX - panX) / initialScale;
  const worldY = (centerY - panY) / initialScale;

  return {
    x: centerX - worldX * scale,
    y: centerY - worldY * scale,
    scale
  };
};
