import { describe, expect, it } from "vitest";
import {
  buildLinePaths,
  computeHorizontalLayout,
  getDisplayNodeMeta,
  getDisplayNodeName
} from "@/lib/map/map-layout";
import {
  ELECTIVE_COLUMN_GAP,
  NODE_WIDTH,
  OFFICIAL_ELECTIVE_ORDER,
  SLOT_GAP
} from "@/lib/map/map-constants";
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

  it("keeps elective blocks to the right with a wider, ordered arrangement", () => {
    const electiveNodes = [
      { id: "elective-8", name: OFFICIAL_ELECTIVE_ORDER[7] },
      { id: "elective-2", name: OFFICIAL_ELECTIVE_ORDER[1] },
      { id: "elective-6", name: OFFICIAL_ELECTIVE_ORDER[5] },
      { id: "elective-1", name: OFFICIAL_ELECTIVE_ORDER[0] },
      { id: "elective-7", name: OFFICIAL_ELECTIVE_ORDER[6] },
      { id: "elective-4", name: OFFICIAL_ELECTIVE_ORDER[3] },
      { id: "elective-3", name: OFFICIAL_ELECTIVE_ORDER[2] },
      { id: "elective-5", name: OFFICIAL_ELECTIVE_ORDER[4] }
    ];
    const nodes: MapNode[] = [
      node({ id: "required", name: "Algoritmos y Estructuras de Datos", code: "AED", term: 6 }),
      ...electiveNodes.map((entry, index) =>
        node({
          id: entry.id,
          name: entry.name,
          code: `EL${index + 1}`,
          term: 6,
          type: "electiva"
        })
      ),
      node({
        id: "generic",
        name: "Electivas/Optativas I",
        code: "OPT1",
        term: 6,
        type: "electiva"
      })
    ];

    const layout = computeHorizontalLayout(nodes, []);

    const requiredX = layout.nodeLayouts.required.x;
    const firstElectiveX = layout.nodeLayouts["elective-1"].x;
    const secondColumnElectiveX = layout.nodeLayouts["elective-4"].x;
    const genericElectiveX = layout.nodeLayouts.generic.x;

    expect(firstElectiveX).toBeGreaterThan(requiredX);
    expect(secondColumnElectiveX).toBe(firstElectiveX + NODE_WIDTH + ELECTIVE_COLUMN_GAP);
    expect(genericElectiveX).toBeGreaterThan(secondColumnElectiveX);
    expect(secondColumnElectiveX - firstElectiveX).toBeGreaterThan(NODE_WIDTH + SLOT_GAP);
  });
});
