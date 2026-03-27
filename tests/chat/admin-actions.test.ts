import { describe, expect, it } from "vitest";
import { buildSubjectSearchIndex, resolveSubjectByQuery } from "@/lib/chat/subject-resolution";

describe("admin action subject resolution", () => {
  it("resolves roman numeral aliases using the same normalized subject key", () => {
    const index = buildSubjectSearchIndex([
      { id: "math-3", code: "61.01", name: "Análisis Matemático 3" },
      { id: "algo-1", code: "75.09", name: "Algoritmos y Programación I" }
    ]);

    expect(resolveSubjectByQuery(index, "Análisis Matemático III")).toEqual({
      subject: {
        id: "math-3",
        code: "61.01",
        name: "Análisis Matemático 3"
      }
    });
  });

  it("still resolves subjects by exact code match", () => {
    const index = buildSubjectSearchIndex([
      { id: "math-3", code: "61.01", name: "Análisis Matemático 3" }
    ]);

    expect(resolveSubjectByQuery(index, "61.01")).toEqual({
      subject: {
        id: "math-3",
        code: "61.01",
        name: "Análisis Matemático 3"
      }
    });
  });
});
