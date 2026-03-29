import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("verify workflow env wiring", () => {
  const workflowSource = fs.readFileSync(
    path.join(process.cwd(), ".github/workflows/verify.yml"),
    "utf8"
  );

  it("provides the minimum secrets required by build and browser smoke in CI", () => {
    expect(workflowSource).toContain("NEXT_PUBLIC_SUPABASE_URL:");
    expect(workflowSource).toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY:");
    expect(workflowSource).toContain("SUPABASE_SERVICE_ROLE_KEY:");
    expect(workflowSource).toContain("SESSION_SECRET:");
    expect(workflowSource).toContain("${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}");
    expect(workflowSource).toContain("${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}");
    expect(workflowSource).toContain("${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}");
    expect(workflowSource).toContain("${{ secrets.SESSION_SECRET }}");
  });
});
