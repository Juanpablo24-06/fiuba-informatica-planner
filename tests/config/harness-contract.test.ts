import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("harness contract", () => {
  it("defines the canonical harness scripts in package.json", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.typecheck).toBeDefined();
    expect(packageJson.scripts?.verify).toBeDefined();
    expect(packageJson.scripts?.e2e).toBeDefined();
    expect(packageJson.scripts?.["e2e:headed"]).toBeDefined();
    expect(packageJson.scripts?.["harness:smoke"]).toBeDefined();
  });

  it("pins the supported Node major version for local work", () => {
    const packageJson = JSON.parse(read("package.json")) as { engines: { node: string } };
    expect(read(".nvmrc").trim()).toBe(packageJson.engines.node.split(".")[0]);
  });

  it("exposes root agent instructions and docs index", () => {
    expect(fs.existsSync(path.join(process.cwd(), "AGENTS.md"))).toBe(true);
    expect(fs.existsSync(path.join(process.cwd(), "docs", "README.md"))).toBe(true);
  });
});
