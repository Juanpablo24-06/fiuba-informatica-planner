import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("map progress transition source", () => {
  const transitionSource = fs.readFileSync(
    path.join(process.cwd(), "components/layout/map-progress-transition.ts"),
    "utf8"
  );
  const layerSource = fs.readFileSync(
    path.join(process.cwd(), "components/layout/map-progress-transition-layer.tsx"),
    "utf8"
  );

  it("uses a slightly longer map bar travel so the handoff feels smoother", () => {
    expect(transitionSource).toContain("export const MAP_TRANSITION_DURATION_MS = 300;");
  });

  it("uses a softer easing curve for the cloned bar motion", () => {
    expect(layerSource).toContain('easing: "cubic-bezier(0.2, 0.8, 0.2, 1)"');
  });
});
