import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAP_LOADING_FLOW_NODES,
  MAP_LOADING_FLOW_PATHS,
  getMapLoadingNodeTint
} from "@/lib/map/map-loading";

describe("map loading helpers", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/map/map-loading-stage.tsx"),
    "utf8"
  );

  it("defines the expected diagram skeleton pieces", () => {
    expect(MAP_LOADING_FLOW_NODES).toHaveLength(7);
    expect(MAP_LOADING_FLOW_PATHS).toHaveLength(8);
  });

  it("cycles node tints through the shared accent palette", () => {
    expect(getMapLoadingNodeTint(0)).toBe("rgb(var(--color-accent))");
    expect(getMapLoadingNodeTint(1)).toBe("rgb(var(--color-accent-2))");
    expect(getMapLoadingNodeTint(2)).toBe("rgb(var(--color-accent-3))");
    expect(getMapLoadingNodeTint(3)).toBe("rgb(var(--color-accent))");
  });

  it("renders the map loader as a transparent diagram without copy panels", () => {
    expect(componentSource).not.toContain("Transición de mapa");
    expect(componentSource).not.toContain("Preparando mapa");
    expect(componentSource).not.toContain("Cargando nodos y conexiones del plan.");
    expect(componentSource).not.toContain("Sincronizando tramos del plan");
    expect(componentSource).not.toContain("map-canvas");
    expect(componentSource).not.toContain("bg-surface/84");
    expect(componentSource).not.toContain("shadow-[0_18px_38px_-28px");
    expect(componentSource).not.toContain("pt-[calc(var(--app-header-height,96px)+1.75rem)]");
    expect(componentSource).toContain("MapSceneBackground");
  });
});
