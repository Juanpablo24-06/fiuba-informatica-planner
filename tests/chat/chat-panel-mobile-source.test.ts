import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("chat panel mobile source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/chat-panel.tsx"),
    "utf8"
  );

  it("keeps the composer compact with a bottom controls row", () => {
    expect(componentSource).toContain("border-t border-border/70 bg-surface/98");
    expect(componentSource).toContain("rounded-2xl border border-border/75 bg-surface-2/65");
  });

  it("shows an accessible subtitle in the chat modal header", () => {
    expect(componentSource).toContain("DialogDescription");
    expect(componentSource).toContain("Asistente académico para agenda, cursada y decisiones rápidas.");
  });

  it("keeps model and reasoning selectors in the bottom bar", () => {
    expect(componentSource).toContain("OpenRouter");
    expect(componentSource).toContain("GPT-OSS 120B Free");
    expect(componentSource).not.toContain("<optgroup label=\"Cerebras\">");
    expect(componentSource).toContain("{reasoningLabelByLevel[level]}");
  });

  it("does not fake live reasoning or append suggestions in the chat UI", () => {
    expect(componentSource).not.toContain("getPreflightDelayMs");
    expect(componentSource).not.toContain("Razonamiento");
    expect(componentSource).not.toContain("Sugerencias:");
    expect(componentSource).toContain("Cancelar respuesta");
  });
});
