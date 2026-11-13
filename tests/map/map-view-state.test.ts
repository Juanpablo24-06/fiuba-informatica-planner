import { describe, expect, it, vi } from "vitest";
import {
  buildMapEdgeIndex,
  buildNodePreviewIndex,
  buildVisibleNodeIds,
  getInitialElectivesVisibility,
  persistElectivesVisibility
} from "@/lib/map/map-view-state";
import { getDefaultFocusBounds } from "@/lib/map/map-camera";
import type {
  FinalProjectTrack,
  MapEdge,
  MapNode,
  NodeLayout
} from "@/lib/map/types";

const baseNode = (overrides: Partial<MapNode>): MapNode => ({
  id: overrides.id ?? "node",
  name: overrides.name ?? "Materia",
  code: overrides.code ?? "MAT",
  term: overrides.term ?? 1,
  term_order: overrides.term_order ?? null,
  type: overrides.type ?? "obligatoria",
  cycle: overrides.cycle ?? "grado",
  status: overrides.status ?? "cursando",
  color: overrides.color ?? null,
  requirements: overrides.requirements ?? null,
  credits: overrides.credits ?? 6,
  weekly_hours: overrides.weekly_hours ?? 6,
  total_hours: overrides.total_hours ?? 96,
  template: overrides.template ?? null,
  display_kind: overrides.display_kind ?? null,
  progress_credits: overrides.progress_credits ?? null
});

const layout = (x: number, y: number): NodeLayout => ({
  x,
  y,
  width: 280,
  height: 120,
  lane: 0
});

describe("map view state helpers", () => {
  it("defaults elective visibility to off when nothing was stored", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue(null)
    };

    expect(getInitialElectivesVisibility(storage)).toBe(false);
    expect(storage.getItem).toHaveBeenCalledWith("fiuba-map-electives-visible-v1");
  });

  it("restores elective visibility when the user left it on", () => {
    const storage = {
      getItem: vi.fn().mockReturnValue("true")
    };

    expect(getInitialElectivesVisibility(storage)).toBe(true);
  });

  it("persists the explicit elective visibility choice", () => {
    const storage = {
      setItem: vi.fn()
    };

    persistElectivesVisibility(storage, false);

    expect(storage.setItem).toHaveBeenCalledWith(
      "fiuba-map-electives-visible-v1",
      "false"
    );
  });

  it("filters electives and collapsed CBC leaves without hiding the synthetic CBC cluster", () => {
    const ids = buildVisibleNodeIds({
      nodes: [
        baseNode({ id: "cbc-leaf", name: "Análisis Matemático A", cycle: "cbc" }),
        baseNode({
          id: "cbc-cluster",
          name: "CBC",
          display_kind: "cbc_cluster"
        }),
        baseNode({ id: "elective", type: "electiva" }),
        baseNode({ id: "regular", name: "Algoritmos" })
      ],
      showElectives: false,
      collapseCbc: true
    });

    expect(Array.from(ids).sort()).toEqual(["cbc-cluster", "regular"]);
  });

  it("prioritizes current courses when computing the default focus bounds", () => {
    const focus = getDefaultFocusBounds(
      [
        baseNode({ id: "current", status: "cursando" }),
        baseNode({ id: "pending", status: "final_pendiente" }),
        baseNode({ id: "done", status: "aprobado" })
      ],
      {
        current: layout(100, 200),
        pending: layout(600, 50),
        done: layout(50, 20)
      }
    );

    expect(focus).toEqual({
      mode: "current",
      minX: 100,
      maxX: 380,
      minY: 200,
      maxY: 320
    });
  });

  it("precomputes node previews and keeps hidden electives out of the summaries", () => {
    const nodes = [
      baseNode({ id: "main", name: "Ingeniería de Software I", status: "final_pendiente" }),
      baseNode({ id: "prereq", name: "Algoritmos y Estructuras de Datos" }),
      baseNode({ id: "elective", name: "Electiva de IA", type: "electiva" }),
      baseNode({
        id: "final-1",
        name: "Trabajo Integrador Final I",
        term: 10
      })
    ];
    const nodesById = new Map(nodes.map((node) => [node.id, node]));
    const edges: MapEdge[] = [
      { from: "prereq", to: "main" },
      { from: "elective", to: "main" },
      { from: "main", to: "final-1" }
    ];

    const previews = buildNodePreviewIndex({
      visibleNodes: nodes,
      edgeIndex: buildMapEdgeIndex(edges),
      nodesById,
      showElectives: false,
      finalProjectTrack: "tesis" satisfies FinalProjectTrack
    });

    expect(previews.get("main")).toEqual({
      prereqNames: ["Algoritmos y Estructuras de Datos"],
      unlockNames: ["Tesis de Ingeniería Informática II"],
      prereqSummary: "Algoritmos y Estructuras de Datos",
      unlockSummary: "Tesis de Ingeniería Informática II"
    });
  });
});
