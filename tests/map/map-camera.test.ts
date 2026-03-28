import { describe, expect, it } from "vitest";
import {
  computeFocusedNodeTransform,
  getClampedTransform,
  resolveInitialMapTransform
} from "@/lib/map/map-camera";

describe("map camera safe top inset", () => {
  it("centers compact layouts inside the visible area below the header inset", () => {
    const centered = getClampedTransform({
      next: { x: 0, y: 0, scale: 1 },
      viewportWidth: 1200,
      viewportHeight: 900,
      worldWidth: 600,
      worldHeight: 300,
      safeTopInset: 120
    });

    expect(centered.y).toBeGreaterThanOrEqual(120);
  });

  it("pushes the initial focused transform below the header inset", () => {
    const withoutInset = resolveInitialMapTransform({
      layoutWidth: 1600,
      layoutHeight: 1000,
      viewportWidth: 1200,
      viewportHeight: 900,
      currentTransform: { x: 0, y: 0, scale: 1 },
      persistedTransform: null,
      defaultFocus: {
        mode: "current",
        minX: 420,
        maxX: 760,
        minY: 120,
        maxY: 360
      },
      isDesktop: true,
      safeTopInset: 0
    });

    const withInset = resolveInitialMapTransform({
      layoutWidth: 1600,
      layoutHeight: 1000,
      viewportWidth: 1200,
      viewportHeight: 900,
      currentTransform: { x: 0, y: 0, scale: 1 },
      persistedTransform: null,
      defaultFocus: {
        mode: "current",
        minX: 420,
        maxX: 760,
        minY: 120,
        maxY: 360
      },
      isDesktop: true,
      safeTopInset: 120
    });

    expect(withInset.transform.y).toBeGreaterThan(withoutInset.transform.y);
  });

  it("focuses selected nodes lower when the header inset is present", () => {
    const withoutInset = computeFocusedNodeTransform({
      selectedLayout: {
        x: 360,
        y: 220,
        width: 172,
        height: 112,
        row: 2,
        col: 3
      },
      viewportWidth: 1200,
      viewportHeight: 900,
      worldWidth: 1800,
      worldHeight: 1200,
      currentTransform: { x: 0, y: 0, scale: 1 },
      isDesktop: true,
      zoom: true,
      safeTopInset: 0
    });

    const withInset = computeFocusedNodeTransform({
      selectedLayout: {
        x: 360,
        y: 220,
        width: 172,
        height: 112,
        row: 2,
        col: 3
      },
      viewportWidth: 1200,
      viewportHeight: 900,
      worldWidth: 1800,
      worldHeight: 1200,
      currentTransform: { x: 0, y: 0, scale: 1 },
      isDesktop: true,
      zoom: true,
      safeTopInset: 120
    });

    expect(withInset.y).toBeGreaterThan(withoutInset.y);
  });

  it("still allows upward panning when a zoomed map is shorter than the visible viewport", () => {
    const clamped = getClampedTransform({
      next: { x: 0, y: 0, scale: 1.2 },
      viewportWidth: 1200,
      viewportHeight: 900,
      worldWidth: 600,
      worldHeight: 300,
      safeTopInset: 120
    });

    expect(clamped.y).toBeLessThan(120);
  });

});
