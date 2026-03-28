import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("queries source", () => {
  const queriesSource = fs.readFileSync(
    path.join(process.cwd(), "lib/queries.ts"),
    "utf8"
  );

  it("memoizes the heavy shared fetches that are used by both the app shell and the map route", () => {
    expect(queriesSource).toContain('import { cache } from "react";');
    expect(queriesSource).toContain("export const getSubjects = cache(async (): Promise<Subject[]> =>");
    expect(queriesSource).toContain("export const getPrerequisites = cache(async () =>");
    expect(queriesSource).toContain("export const getLatestEnrollmentStatus = cache(async () =>");
  });
});
