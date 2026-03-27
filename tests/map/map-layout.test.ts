import { describe, expect, it } from "vitest";
import {
  buildLinePaths,
  computeHorizontalLayout,
  getDisplayNodeMeta,
  getDisplayNodeName
} from "@/lib/map/map-layout";
import type { MapEdge, MapNode } from "@/lib/map/types";

const node = (overrides: Partial<MapNode>): MapNode => ({
  id: "node",
  name: "Materia",
  code: "MAT",
  term: 1,
  type: "obligatoria",
  cycle: "segundo",
  status: null,
  color: null,
  requirements: null,
  credits: 4,
  weekly_hours: 4,
  total_hours: 0,
  template: null,
  display_kind: undefined,
  progress_credits: null,
  ...overrides
});

describe("map layout helpers", () => {
  it("keeps the display model stable for CBC and final project nodes", () => {
    const cbc = node({ id: "__cbc__", name: "Cualquier nombre", code: "CBC", display_kind: "cbc_cluster" });
    const tif = node({
      id: "__tif__",
      name: "Trabajo Integrador Final II",
      code: "TIF",
      display_kind: "final_project",
      term: 10
    });

    expect(getDisplayNodeName(cbc, "tesis")).toBe("Ciclo Básico Común");
    expect(getDisplayNodeMeta(cbc)).toBe("CBC · tramo inicial");
    expect(getDisplayNodeName(tif, "tesis")).toBe("Trabajo Integrador Final");
    expect(getDisplayNodeName(tif, "trabajo_profesional")).toBe("Trabajo Integrador Final");
    expect(getDisplayNodeMeta(tif)).toBe("TIF · tramo final");
  });

  it("computes layout and paths for visible nodes", () => {
    const nodes: MapNode[] = [
      node({ id: "a", name: "Análisis Matemático A", code: "MAT1", term: 1 }),
      node({ id: "b", name: "Física", code: "FIS", term: 1 }),
      node({ id: "c", name: "Algoritmos y Estructuras de Datos", code: "AED", term: 2 })
    ];
    const edges: MapEdge[] = [
      { from: "a", to: "c" },
      { from: "b", to: "c" },
      { from: "missing", to: "c" }
    ];

    const layout = computeHorizontalLayout(nodes, edges);
    const paths = buildLinePaths(layout.nodeLayouts, edges);

    expect(layout.sections).toHaveLength(2);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);
    expect(layout.nodeLayouts.a).toMatchObject({
      width: 208,
      height: 108
    });
    expect(layout.nodeLayouts.c).toMatchObject({
      width: 208,
      height: 108
    });
    expect(paths).toHaveLength(2);
    expect(paths.every((path) => path.d.startsWith("M "))).toBe(true);
  });
});
