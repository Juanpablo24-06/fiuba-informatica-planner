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
    expect(componentSource).toContain("pointer-events-none hidden absolute inset-0 z-10");
    expect(componentSource).toContain("{children}");
    expect(componentSource).toContain("{pendingNavigationActive ? <div className=\"relative z-20\">{loadingContent}</div> : null}");
  });

  it("keeps the real bottom map bar hidden for the full animated map transition so it does not overlap the moving clone", () => {
    const hideActualMapBarBlock = componentSource.match(
      /const hideActualMapBar =[\s\S]*?;\n/
    )?.[0] ?? "";

    expect(hideActualMapBarBlock).toContain("pendingNavigationActive &&");
    expect(hideActualMapBarBlock).toContain("mapTransitionState.showMapBar &&");
    expect(hideActualMapBarBlock).toContain("mapTransitionState.animateMapBar");
    expect(hideActualMapBarBlock).not.toContain("mapTransitionState.mapEntryPhase === \"bar-drop\"");
  });

  it("drives the visible map bar from the shared flag without adding a second opacity tween after the clone handoff", () => {
    expect(componentSource).toContain("const showMapBottomBar = mapTransitionState.showMapBar;");
    expect(componentSource).not.toContain("transition-opacity duration-100");
    expect(componentSource).toContain('"pointer-events-auto w-full"');
  });
});
