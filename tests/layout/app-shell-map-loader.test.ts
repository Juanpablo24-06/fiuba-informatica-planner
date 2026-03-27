import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("app shell map loading source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/layout/app-shell.tsx"),
    "utf8"
  );

  it("keeps the map page mounted invisibly once the route resolves so the shared loader does not restart", () => {
    expect(componentSource).toContain("resolvedMapChildren");
    expect(componentSource).toContain("pendingNavigationResolved && pathname.startsWith(\"/mapa\")");
    expect(componentSource).toContain("aria-hidden=\"true\"");
    expect(componentSource).toContain("invisible pointer-events-none");
  });
});
