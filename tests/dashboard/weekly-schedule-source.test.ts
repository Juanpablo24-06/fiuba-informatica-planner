import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("weekly schedule source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/weekly-schedule.tsx"),
    "utf8"
  );

  it("pins desktop event cards to the day column instead of letting CSS grid create implicit extra columns", () => {
    expect(componentSource).toContain('gridColumn: "1"');
  });

  it("keeps the desktop week grid horizontally scrollable on tighter widths", () => {
    expect(componentSource).toContain("overflow-x-auto");
    expect(componentSource).toContain("min-w-[820px]");
  });

  it("keeps sunday visible in both the weekly day list and the desktop grid", () => {
    expect(componentSource).toContain('{ short: "Dom", long: "Domingo" }');
    expect(componentSource).toContain('grid-cols-[76px_repeat(7,minmax(0,1fr))]');
  });
});
