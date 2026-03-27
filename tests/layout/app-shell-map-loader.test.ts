import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("app shell map loading source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/layout/app-shell.tsx"),
    "utf8"
  );

  it("keeps route content mounted under a stable hidden wrapper while a pending navigation loader is visible", () => {
    expect(componentSource).toContain("aria-hidden={hideRouteContent}");
    expect(componentSource).toContain("pointer-events-none invisible absolute inset-0 z-10");
    expect(componentSource).toContain("{children}");
    expect(componentSource).toContain("{pendingNavigationActive ? <div className=\"relative z-20\">{loadingContent}</div> : null}");
  });
});
