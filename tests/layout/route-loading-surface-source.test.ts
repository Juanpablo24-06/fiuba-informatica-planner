import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("route loading surface source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/layout/route-loading-surface.tsx"),
    "utf8"
  );

  it("selects admin and agenda loaders from the current pathname instead of always falling back to the resumen loader", () => {
    expect(componentSource).toContain('pathname.startsWith("/admin")');
    expect(componentSource).toContain('pathname.startsWith("/agenda")');
    expect(componentSource).toContain("AdminLoadingSurface");
    expect(componentSource).toContain("HorarioLoadingSurface");
  });
});
