import { describe, expect, it } from "vitest";
import {
  buildPendingNavigationState,
  buildPendingNavigationStateFromCurrent,
  DEFAULT_MAP_TRANSITION_STATE,
  getDisplaySection,
  getSectionForPathname,
  isCurrentTransition,
  isMapTransitionStateEqual,
  isPendingNavigationResolved,
  type MapTransitionState
} from "@/components/layout/map-transition-store";
import {
  getRemainingTransitionDuration,
  getRemainingLoaderDuration,
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
    expect(buildPendingNavigationState("/", "/mapa", 1_000)).toMatchObject({
      pendingPath: "/mapa",
      pendingSection: "/mapa",
      loaderKind: "map",
      mapContentReady: false,
      startedFromSection: "/",
      showMapBar: true,
      animateMapBar: true,
      mapEntryPhase: "bar-drop",
      transitionStartedAt: 1_000,
      loaderStartedAt: null,
      minimumLoaderMs: 560
    });

    expect(buildPendingNavigationState("/agenda", "/mapa", 1_000)).toMatchObject({
      pendingPath: "/mapa",
      pendingSection: "/mapa",
      loaderKind: "map",
      mapContentReady: false,
      startedFromSection: "/agenda",
      showMapBar: true,
      animateMapBar: false,
      mapEntryPhase: "loader",
      transitionStartedAt: 1_000,
      loaderStartedAt: 1_000,
      minimumLoaderMs: 560
    });
  });

  it("uses the generic loader when the destination is not map", () => {
    expect(buildPendingNavigationState("/mapa", "/", 2_000)).toMatchObject({
      pendingPath: "/",
      pendingSection: "/",
      loaderKind: "app",
      mapContentReady: false,
      showMapBar: false,
      animateMapBar: false,
      mapEntryPhase: "loader",
      transitionStartedAt: 2_000,
      loaderStartedAt: 2_000,
      minimumLoaderMs: 560
    });
    expect(buildPendingNavigationState("/", "/agenda/semana", 2_000)).toMatchObject({
      pendingPath: "/agenda",
      pendingSection: "/agenda",
      loaderKind: "app",
      mapContentReady: false,
      showMapBar: false,
      animateMapBar: false,
      mapEntryPhase: "loader",
      transitionStartedAt: 2_000,
      loaderStartedAt: 2_000,
      minimumLoaderMs: 560
    });
  });

  it("builds the next transition from the effective section, not the stale pathname", () => {
    expect(
      buildPendingNavigationStateFromCurrent({
        pathname: "/",
        pendingSection: "/mapa",
        toPathname: "/agenda/evaluaciones",
        startedAt: 3_000,
        transitionId: 7
      })
    ).toMatchObject({
      pendingPath: "/agenda",
      pendingSection: "/agenda",
      loaderKind: "app",
      mapContentReady: false,
      startedFromSection: "/mapa",
      mapEntryPhase: "loader",
      transitionStartedAt: 3_000,
      loaderStartedAt: 3_000,
      animateMapBar: false,
      transitionId: 7
    });
  });

  it("keeps the loader visible until the minimum duration is met", () => {
    expect(getRemainingLoaderDuration(1_000, 1_120)).toBe(440);
    expect(getRemainingLoaderDuration(1_000, 1_500)).toBe(60);
    expect(getRemainingLoaderDuration(1_000, 1_600)).toBe(0);
    expect(getRemainingLoaderDuration(null, 1_500)).toBe(560);
  });

  it("prefers the pending section while navigation is still unresolved", () => {
    expect(getDisplaySection("/", "/mapa")).toBe("/mapa");
    expect(getDisplaySection("/agenda/semana", null)).toBe("/agenda");
    expect(isPendingNavigationResolved("/mapa", "/mapa")).toBe(true);
    expect(isPendingNavigationResolved("/", "/mapa")).toBe(false);
  });

  it("only lets the active transition token mutate pending navigation", () => {
    expect(
      isCurrentTransition(
        buildState({
          transitionId: 12,
          transitioning: true,
          pendingPath: "/mapa"
        }),
        12
      )
    ).toBe(true);

    expect(
      isCurrentTransition(
        buildState({
          transitionId: 12,
          transitioning: true,
          pendingPath: "/mapa"
        }),
        11
      )
    ).toBe(false);

    expect(
      isCurrentTransition(
        buildState({
          transitionId: 12,
          transitioning: false,
          pendingPath: "/mapa"
        }),
        12
      )
    ).toBe(false);
  });

  it("normalizes app sections from arbitrary pathnames", () => {
    expect(getSectionForPathname("/mapa")).toBe("/mapa");
    expect(getSectionForPathname("/agenda/semana")).toBe("/agenda");
    expect(getSectionForPathname("/horario/semana")).toBe("/agenda");
    expect(getSectionForPathname("/admin/config")).toBe("/admin");
    expect(getSectionForPathname("/cualquier-cosa")).toBe("/");
  });
});
