import { describe, expect, it } from "vitest";
import {
  MAP_LOADING_FLOW_NODES,
  MAP_LOADING_FLOW_PATHS,
  MAP_LOADING_FOOTER_SEGMENTS,
  getMapLoadingNodeTint
} from "@/lib/map/map-loading";

describe("map loading helpers", () => {
  it("defines the expected diagram skeleton pieces", () => {
    expect(MAP_LOADING_FLOW_NODES).toHaveLength(7);
    expect(MAP_LOADING_FLOW_PATHS).toHaveLength(8);
    expect(MAP_LOADING_FOOTER_SEGMENTS).toHaveLength(5);
  });

  it("cycles node tints through the shared accent palette", () => {
    expect(getMapLoadingNodeTint(0)).toBe("rgb(var(--color-accent))");
    expect(getMapLoadingNodeTint(1)).toBe("rgb(var(--color-accent-2))");
    expect(getMapLoadingNodeTint(2)).toBe("rgb(var(--color-accent-3))");
    expect(getMapLoadingNodeTint(3)).toBe("rgb(var(--color-accent))");
  });
});
