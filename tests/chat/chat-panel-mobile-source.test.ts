import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("chat panel mobile source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/chat-panel.tsx"),
    "utf8"
  );

  it("keeps the composer compact with a bottom controls row", () => {
    expect(componentSource).toContain("border-t border-white/10 px-4 py-3");
    expect(componentSource).toContain("flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between");
  });

  it("shows an accessible subtitle in the chat modal header", () => {
    expect(componentSource).toContain("DialogDescription");
    expect(componentSource).toContain("Asistente académico para agenda, cursada y decisiones rápidas.");
  });

  it("keeps model and reasoning selectors in the bottom bar", () => {
    expect(componentSource).toContain("OpenRouter");
    expect(componentSource).toContain("GPT-OSS 120B Free");
    expect(componentSource).not.toContain("<optgroup label=\"Cerebras\">");
    expect(componentSource).toContain("Nivel {reasoningLabelByLevel[level]}");
  });
});
