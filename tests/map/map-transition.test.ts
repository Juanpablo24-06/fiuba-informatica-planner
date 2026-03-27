import { describe, expect, it } from "vitest";
import {
  buildPendingNavigationState,
  DEFAULT_MAP_TRANSITION_STATE,
  getDisplaySection,
  getSectionForPathname,
  isMapTransitionStateEqual,
  isPendingNavigationResolved,
  type MapTransitionState
} from "@/components/layout/map-transition-store";
import {
  getRemainingTransitionDuration,
  isRenderableProgressRect,
  rectDistance,
  shouldAnimateToTargetRect
} from "@/components/layout/map-progress-transition";

const buildState = (
  overrides: Partial<MapTransitionState> = {}
): MapTransitionState => ({
  ...DEFAULT_MAP_TRANSITION_STATE,
  ...overrides
});

describe("map transition helpers", () => {
  it("compares transition state structurally", () => {
    const base = buildState({
      pathname: "/mapa",
      transitionSource: "summary-link",
      transitioning: true,
      progressSourceSlot: "summary",
      progressTargetSlot: "map-bottom",
      progressSourceRect: {
        left: 10,
        top: 20,
        width: 200,
        height: 60
      }
    });

    expect(isMapTransitionStateEqual(base, { ...base })).toBe(true);
    expect(
      isMapTransitionStateEqual(base, {
        ...base,
        progressSourceRect: {
          left: 11,
          top: 20,
          width: 200,
          height: 60
        }
      })
    ).toBe(false);
  });

  it("measures meaningful distance between source and target rects", () => {
    expect(
      rectDistance(
        { left: 0, top: 0, width: 100, height: 40 },
        { left: 4, top: 3, width: 102, height: 40 }
      )
    ).toBe(4);

    expect(
      shouldAnimateToTargetRect(
        { left: 0, top: 0, width: 100, height: 40 },
        { left: 4, top: 3, width: 102, height: 40 }
      )
    ).toBe(false);

    expect(
      shouldAnimateToTargetRect(
        { left: 0, top: 0, width: 100, height: 40 },
        { left: 20, top: 0, width: 100, height: 40 }
      )
    ).toBe(true);
  });

  it("keeps a minimum animation duration when the destination appears late", () => {
    expect(getRemainingTransitionDuration(100, 220, 480, 160)).toBe(360);
    expect(getRemainingTransitionDuration(100, 560, 480, 160)).toBe(160);
  });

  it("treats zero-sized rects as non-renderable transition targets", () => {
    expect(
      isRenderableProgressRect({ left: 0, top: 0, width: 100, height: 40 })
    ).toBe(true);
    expect(
      isRenderableProgressRect({ left: 0, top: 0, width: 0, height: 40 })
    ).toBe(false);
    expect(
      isRenderableProgressRect({ left: 0, top: 0, width: 100, height: 0 })
    ).toBe(false);
    expect(isRenderableProgressRect(null)).toBe(false);
  });

  it("builds the special map entry state only for summary to map", () => {
    expect(buildPendingNavigationState("/", "/mapa")).toMatchObject({
      pendingPath: "/mapa",
      pendingSection: "/mapa",
      loaderKind: "map",
      startedFromSection: "/",
      showMapBar: true,
      animateMapBar: true
    });

    expect(buildPendingNavigationState("/horario", "/mapa")).toMatchObject({
      pendingPath: "/mapa",
      pendingSection: "/mapa",
      loaderKind: "map",
      startedFromSection: "/horario",
      showMapBar: true,
      animateMapBar: false
    });
  });

  it("uses the generic loader when the destination is not map", () => {
    expect(buildPendingNavigationState("/mapa", "/")).toMatchObject({
      pendingPath: "/",
      pendingSection: "/",
      loaderKind: "app",
      showMapBar: false,
      animateMapBar: false
    });
    expect(buildPendingNavigationState("/", "/horario")).toMatchObject({
      pendingPath: "/horario",
      pendingSection: "/horario",
      loaderKind: "app",
      showMapBar: false,
      animateMapBar: false
    });
  });

  it("prefers the pending section while navigation is still unresolved", () => {
    expect(getDisplaySection("/", "/mapa")).toBe("/mapa");
    expect(getDisplaySection("/horario", null)).toBe("/horario");
    expect(isPendingNavigationResolved("/mapa", "/mapa")).toBe(true);
    expect(isPendingNavigationResolved("/", "/mapa")).toBe(false);
  });

  it("normalizes app sections from arbitrary pathnames", () => {
    expect(getSectionForPathname("/mapa")).toBe("/mapa");
    expect(getSectionForPathname("/horario/semana")).toBe("/horario");
    expect(getSectionForPathname("/admin/config")).toBe("/admin");
    expect(getSectionForPathname("/cualquier-cosa")).toBe("/");
  });
});
