import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("map scene background source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/map/map-scene-background.tsx"),
    "utf8"
  );

  it("keeps the persistent map backdrop free of loader node diagrams", () => {
    expect(componentSource).not.toContain("MAP_LOADING_FLOW_NODES");
    expect(componentSource).not.toContain("MAP_LOADING_FLOW_PATHS");
    expect(componentSource).not.toContain("data-testid=\"map-loader-node\"");
    expect(componentSource).not.toContain("animate-map-loader-line");
  });

  it("extends the top glow above the viewport so the header transition does not leave a dark seam", () => {
    expect(componentSource).toContain("-top-[18vh]");
    expect(componentSource).toContain("h-[46vh]");
  });

  it("supports fixed positioning so the shared backdrop can cover transitions behind the header", () => {
    expect(componentSource).toContain("position?: \"absolute\" | \"fixed\"");
    expect(componentSource).toContain("position === \"fixed\" ? \"fixed\" : \"absolute\"");
  });

  it("keeps the top glow fully opaque enough to avoid a washed-out horizontal seam", () => {
    expect(componentSource).not.toContain("opacity-80");
  });
});
