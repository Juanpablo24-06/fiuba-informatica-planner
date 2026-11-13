import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("chat panel mobile source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/chat-panel.tsx"),
    "utf8"
  );
  const modelSource = fs.readFileSync(
    path.join(process.cwd(), "modules/chat/domain/models.ts"),
    "utf8"
  );
  const executorSource = fs.readFileSync(
    path.join(process.cwd(), "modules/chat/application/chat.ts"),
    "utf8"
  );

  it("keeps the composer compact with a bottom controls row", () => {
    expect(componentSource).toContain("border-t border-border/70 bg-surface/98");
    expect(componentSource).toContain("rounded-[1.35rem] border border-border/75 bg-surface-2/65");
  });

  it("shows an accessible subtitle in the chat modal header", () => {
    expect(componentSource).toContain("DialogDescription");
    expect(componentSource).toContain("Contexto académico, memoria seleccionada y acciones bajo tu control.");
  });

  it("keeps model and reasoning selectors in the bottom bar", () => {
    expect(modelSource).toContain('providerLabel: "OpenRouter"');
    expect(modelSource).toContain('label: "GPT-OSS 120B Free"');
    expect(modelSource).toContain('value: "z-ai/glm-5.2"');
    expect(modelSource).toContain('value: "minimaxai/minimax-m3"');
    expect(componentSource).not.toContain("<optgroup label=\"Cerebras\">");
    expect(componentSource).toContain("reasoningLabelForModel(");
    expect(componentSource).toContain("currentModelOption.value");
  });

  it("does not fabricate reasoning or append suggestions in the chat UI", () => {
    expect(componentSource).not.toContain("getPreflightDelayMs");
    expect(componentSource).toContain("Razonamiento nativo");
    expect(componentSource).toContain("Resumen del análisis");
    expect(executorSource).toContain("onReasoningDelta: () => undefined");
    expect(componentSource).not.toContain("Sugerencias:");
    expect(componentSource).toContain("Cancelar respuesta");
  });
});
