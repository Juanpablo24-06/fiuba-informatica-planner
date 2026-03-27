import { describe, expect, it } from "vitest";
import {
  inferDateFromPhrase,
  normalizeSubjectAlias,
  normalizeTermLabel,
  normalizeText
} from "@/lib/chat/normalization";

describe("chat normalization helpers", () => {
  it("normalizes term labels consistently", () => {
    expect(normalizeTermLabel(" 2026   2 ")).toBe("2026-2");
    expect(normalizeTermLabel("2026-1")).toBe("2026-1");
  });

  it("normalizes text without accents", () => {
    expect(normalizeText("Qué tú quieras")).toBe("que tu quieras");
  });

  it("normalizes subject aliases for matching", () => {
    expect(normalizeSubjectAlias("Análisis Matemático III")).toBe("analisis matematico 3");
  });

  it("infers a date from a month phrase", () => {
    expect(inferDateFromPhrase("marzo de 2026", 2026, "start")).toBe("2026-03-01");
    expect(inferDateFromPhrase("marzo de 2026", 2026, "end")).toBe("2026-03-31");
  });
});
