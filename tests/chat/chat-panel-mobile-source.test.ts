import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("chat panel mobile source", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/chat-panel.tsx"),
    "utf8"
  );

  it("stacks the composer on narrow screens while preserving the desktop row layout", () => {
    expect(componentSource).toContain("flex flex-col gap-3 sm:flex-row sm:items-end");
    expect(componentSource).toContain("w-full sm:w-auto");
  });

  it("includes an accessible dialog description for the mobile chat modal", () => {
    expect(componentSource).toContain("DialogDescription");
    expect(componentSource).toContain("className=\"sr-only\"");
  });

  it("shrinks the chat composer textarea on phones without changing the desktop height", () => {
    expect(componentSource).toContain("min-h-[88px] sm:min-h-[100px]");
  });
});
