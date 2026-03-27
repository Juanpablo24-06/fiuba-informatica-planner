import { describe, expect, it } from "vitest";
import { buildMapGraph } from "@/lib/map/map-graph";
import type { Subject } from "@/lib/types";

const baseSubject = (overrides: Partial<Subject>): Subject => ({
  id: "subject",
  code: "SUBJ",
  name: "Materia",
  credits: 4,
  weekly_hours: 4,
  total_hours: 0,
  term_suggested: 1,
  cycle: "segundo",
  type: "obligatoria",
  requirements: null,
  template: null,
  ...overrides
});

describe("buildMapGraph", () => {
  it("builds the synthetic CBC and TIF nodes without changing visible edges", () => {
    const subjects = [
      baseSubject({
        id: "cbc-a",
        name: "Análisis Matemático A",
        code: "MAT1",
        cycle: "cbc",
        type: "cbc",
        credits: 6,
        weekly_hours: 6
      }),
      baseSubject({
        id: "cbc-b",
        name: "Álgebra A",
        code: "ALG1",
        cycle: "cbc",
        type: "cbc",
        credits: 6,
        weekly_hours: 6
      }),
      baseSubject({
        id: "reg-1",
        name: "Algoritmos y Estructuras de Datos",
        code: "AED",
        requirements: ["CBC aprobado"]
      }),
      baseSubject({
        id: "reg-2",
        name: "Ingeniería de Software I",
        code: "IS1",
        requirements: ["Algoritmos y Estructuras de Datos"]
      }),
      baseSubject({
        id: "tif-1",
        name: "Trabajo Integrador Final I",
        code: "TIF-I",
        term_suggested: 10,
        requirements: ["140 créditos"],
        credits: 6,
        weekly_hours: 6
      }),
      baseSubject({
        id: "tif-2",
        name: "Trabajo Integrador Final II",
        code: "TIF-II",
        term_suggested: 11,
        requirements: ["140 créditos", "Defensa aprobada"],
        credits: 6,
        weekly_hours: 6
      })
    ];

    const prerequisites = [
      { subject_id: "reg-1", prerequisite_id: "cbc-a" },
      { subject_id: "reg-2", prerequisite_id: "reg-1" },
      { subject_id: "reg-2", prerequisite_id: "tif-1" }
    ];

    const statusMap = new Map<string, { status: string; color: string | null }>([
      ["cbc-a", { status: "aprobado", color: "#111111" }],
      ["cbc-b", { status: "cursando", color: "#222222" }],
      ["reg-1", { status: "recursar", color: "#333333" }],
      ["reg-2", { status: "aprobado", color: "#444444" }],
      ["tif-1", { status: "aprobado", color: "#555555" }],
      ["tif-2", { status: "final_pendiente", color: "#666666" }]
    ]);

    const graph = buildMapGraph({ prerequisites, statusMap, subjects });

    expect(graph.nodes.map((node) => node.id)).toEqual([
      "cbc-a",
      "cbc-b",
      "reg-1",
      "reg-2",
      "__cbc__",
      "__tif__"
    ]);

    expect(graph.edges).toHaveLength(5);
    expect(graph.edges).toEqual(
      expect.arrayContaining([
        { from: "cbc-a", to: "reg-1" },
        { from: "reg-1", to: "reg-2" },
        { from: "cbc-a", to: "__cbc__" },
        { from: "cbc-b", to: "__cbc__" },
        { from: "__cbc__", to: "reg-1" }
      ])
    );

    expect(graph.nodes.find((node) => node.id === "__cbc__")).toMatchObject({
      name: "Ciclo Básico Común",
      code: "CBC",
      status: "cursando",
      progress_credits: 6
    });

    expect(graph.nodes.find((node) => node.id === "__tif__")).toMatchObject({
      name: "Trabajo Integrador Final",
      code: "TIF",
      status: "final_pendiente",
      progress_credits: 6,
      requirements: ["140 créditos", "Defensa aprobada"]
    });
  });
});
