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

  it("supports fixed positioning so the shared backdrop can cover transitions behind the header", () => {
    expect(componentSource).toContain("position?: \"absolute\" | \"fixed\"");
    expect(componentSource).toContain("position === \"fixed\" ? \"fixed\" : \"absolute\"");
  });

  it("does not add an extra top orb on top of the shared app background, avoiding the horizontal seam", () => {
    expect(componentSource).not.toContain("radial-gradient(circle_at_top");
    expect(componentSource).not.toContain("blur-[120px]");
    expect(componentSource).not.toContain("top-[-16rem]");
    expect(componentSource).not.toContain("w-[72rem]");
  });
});
