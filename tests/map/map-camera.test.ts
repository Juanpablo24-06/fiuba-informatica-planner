import { describe, expect, it } from "vitest";
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
import type { MapNode, NodeLayout, Transform } from "@/lib/map/types";

const node = (overrides: Partial<MapNode>): MapNode => ({
  id: overrides.id ?? "node",
  name: overrides.name ?? "Materia",
  code: overrides.code ?? "MAT",
  term: overrides.term ?? 1,
  type: overrides.type ?? "obligatoria",
  cycle: overrides.cycle ?? "segundo",
  status: overrides.status ?? null,
  color: overrides.color ?? null,
  requirements: overrides.requirements ?? null,
  credits: overrides.credits ?? 4,
  weekly_hours: overrides.weekly_hours ?? 4,
  total_hours: overrides.total_hours ?? 0,
  template: overrides.template ?? null,
  display_kind: overrides.display_kind ?? null,
  progress_credits: overrides.progress_credits ?? null
});

const layout = (overrides: Partial<NodeLayout>): NodeLayout => ({
  x: overrides.x ?? 0,
  y: overrides.y ?? 0,
  width: overrides.width ?? 208,
  height: overrides.height ?? 108,
  lane: overrides.lane ?? 0
});

describe("map camera helpers", () => {
  it("prefers current nodes when deriving the default focus bounds", () => {
    const visibleNodes = [
      node({ id: "approved", status: "aprobado" }),
      node({ id: "current", status: "cursando" }),
      node({ id: "pending", status: "final_pendiente" })
    ];
    const nodeLayouts = {
      approved: layout({ x: 0, y: 0 }),
      current: layout({ x: 320, y: 120 }),
      pending: layout({ x: 640, y: 260 })
    };

    expect(getDefaultFocusBounds(visibleNodes, nodeLayouts)).toEqual({
      mode: "current",
      minX: 320,
      maxX: 528,
      minY: 120,
      maxY: 228
    });
  });

  it("clamps the transform within the centered overscroll range", () => {
    const clamped = getClampedTransform({
      next: { x: 1000, y: -1000, scale: 1 },
      viewportWidth: 1200,
      viewportHeight: 700,
      worldWidth: 600,
      worldHeight: 320
    });

    expect(clamped.x).toBeCloseTo(756, 6);
    expect(clamped.y).toBeCloseTo(-48, 6);
    expect(clamped.scale).toBe(1);
  });

  it("resolves the initial transform from persisted state before default focus", () => {
    const persisted: Transform = { x: -120, y: 64, scale: 0.9 };

    expect(
      resolveInitialMapTransform({
        layoutWidth: 1200,
        layoutHeight: 820,
        viewportWidth: 1000,
        viewportHeight: 700,
        currentTransform: { x: 0, y: 0, scale: 1 },
        persistedTransform: persisted,
        defaultFocus: {
          mode: "current",
          minX: 200,
          maxX: 500,
          minY: 120,
          maxY: 320
        },
        isDesktop: true
      })
    ).toEqual({
      transform: persisted,
      userMoved: true
    });
  });

  it("keeps zoom and pinch math stable", () => {
    expect(
      computeZoomTransform({
        currentTransform: { x: 40, y: 30, scale: 1 },
        nextScale: 1.4,
        centerX: 300,
        centerY: 180
      })
    ).toEqual({
      x: -64,
      y: -30,
      scale: 1.4
    });

    expect(
      computePinchTransform({
        initialDistance: 100,
        currentDistance: 150,
        initialScale: 1,
        centerX: 260,
        centerY: 180,
        panX: 20,
        panY: 30
      })
    ).toEqual({
      x: -100,
      y: -45,
      scale: 1.5
    });
  });

  it("keeps focused-node and mobile sheet decisions deterministic", () => {
    const sheetSizes = getSheetSizePreset(720);
    expect(findNearestSheetState(380, sheetSizes)).toBe("half");

    expect(
      computeFocusedNodeTransform({
        selectedLayout: layout({ x: 420, y: 160 }),
        viewportWidth: 1200,
        viewportHeight: 800,
        worldWidth: 1800,
        worldHeight: 900,
        currentTransform: { x: 0, y: 0, scale: 1 },
        isDesktop: true,
        zoom: true
      })
    ).toMatchObject({
      scale: 1.24
    });
  });
});
