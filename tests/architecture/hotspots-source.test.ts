import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("architecture hotspot docs", () => {
  const hotspots = fs.readFileSync(
    path.join(process.cwd(), "docs/architecture/hotspots.md"),
    "utf8"
  );

  it("tracks the current hotspot files explicitly", () => {
    expect(hotspots).toContain("components/map/map-view.tsx");
    expect(hotspots).toContain("components/dashboard/term-manager.tsx");
    expect(hotspots).toContain("components/dashboard/course-workspace-drawer.tsx");
    expect(hotspots).toContain("components/dashboard/chat-panel.tsx");
    expect(hotspots).toContain("app/api/chat/route.ts");
    expect(hotspots).toContain("lib/ai/admin-actions.ts");
  });
});
