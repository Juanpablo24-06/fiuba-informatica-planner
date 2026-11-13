import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("verify workflow env wiring", () => {
  const workflowSource = fs.readFileSync(
    path.join(process.cwd(), ".github/workflows/verify.yml"),
    "utf8"
  );

  it("verifies both distributions without production credentials in automatic jobs", () => {
    const automaticSteps = workflowSource.split("      - name: Browser smoke")[0];
    expect(automaticSteps).not.toContain("secrets.");
    expect(workflowSource).toContain("npm run verify:demo");
    expect(workflowSource).toContain("npm run verify");
    expect(workflowSource).toContain("inputs.browser_checks");
  });
});
