import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("weekly schedule source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/weekly-schedule.tsx"),
    "utf8"
  );

  it("keeps the mobile day groups as flat timeline rows instead of nested cards", () => {
    expect(componentSource).toContain('border-b border-border/35 py-3');
    expect(componentSource).toContain('divide-y divide-border/30');
    expect(componentSource).toContain('flex items-start gap-3 py-2.5');
  });

  it("keeps the desktop week grid horizontally scrollable on tighter widths", () => {
    expect(componentSource).toContain("overflow-x-auto");
    expect(componentSource).toContain("min-w-[820px]");
  });

  it("keeps sunday visible in both the weekly day list and the desktop grid", () => {
    expect(componentSource).toContain('{ short: "Dom", long: "Domingo" }');
    expect(componentSource).toContain('grid-cols-[64px_repeat(7,minmax(0,1fr))]');
  });

  it("renders desktop events with a slimmer timeline shell", () => {
    expect(componentSource).toContain('"absolute z-10 overflow-hidden rounded-md border-l-2 border-border/55 bg-surface/95 px-3 py-2 text-[11px] text-text shadow-sm"');
    expect(componentSource).toContain('left: "0.5rem"');
    expect(componentSource).toContain('right: "0.5rem"');
  });
});
