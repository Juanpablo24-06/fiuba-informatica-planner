import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("map transition layer source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/layout/map-progress-transition-layer.tsx"),
    "utf8"
  );

  it("renders the cloned bar without registering it as the map-bottom target slot", () => {
    expect(componentSource).toContain("disableSlotRegistration");
  });

  it("waits until the next paint before starting the cloned bar animation", () => {
    expect(componentSource).toContain("requestAnimationFrame");
    expect(componentSource).toContain("data-progress-transition-clone");
  });

  it("moves the cloned bar without scaling its text content", () => {
    expect(componentSource).not.toContain("scale(");
    expect(componentSource).toContain("left:");
    expect(componentSource).toContain("width:");
  });

  it("keeps the cloned bar mounted through the loader handoff so the real bottom bar can take over underneath it", () => {
    expect(componentSource).toContain("state.mapEntryPhase !== \"idle\"");
    expect(componentSource).toContain("if (state.mapEntryPhase !== \"bar-drop\")");
  });
});
