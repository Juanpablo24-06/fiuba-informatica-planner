import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("weekly schedule day coverage", () => {
  const componentSource = fs.readFileSync(
    path.join(process.cwd(), "components/dashboard/weekly-schedule.tsx"),
    "utf8"
  );

  it("includes sunday so agenda events on that day are not silently dropped", () => {
    expect(componentSource).toContain('{ short: "Dom", long: "Domingo" }');
    expect(componentSource).toContain('dom: "Dom"');
  });
});
