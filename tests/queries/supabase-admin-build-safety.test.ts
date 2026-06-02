import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react", () => ({
  cache: <T extends (...args: any[]) => any>(fn: T) => fn
}));

const ORIGINAL_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const restoreSupabaseEnv = () => {
  if (ORIGINAL_SUPABASE_URL === undefined) {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  } else {
    process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_SUPABASE_URL;
  }

  if (ORIGINAL_SUPABASE_SERVICE_ROLE_KEY === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = ORIGINAL_SUPABASE_SERVICE_ROLE_KEY;
  }
};

describe("supabase admin build safety", () => {
  afterEach(() => {
    restoreSupabaseEnv();
    vi.resetModules();
  });

  it("lets AI route modules load during build even when Supabase env vars are absent", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();

    await expect(import("@/app/api/ai/enrich-calendar/route")).resolves.toBeTruthy();
    await expect(import("@/app/api/ai/summarize-week/route")).resolves.toBeTruthy();
  });

  it("throws only when the admin client is actually requested without Supabase env vars", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();

    const supabaseAdminModule = await import("@/lib/supabase-admin");

    expect(supabaseAdminModule.isSupabaseAdminConfigured()).toBe(false);
    expect(() => supabaseAdminModule.getSupabaseAdmin()).toThrow(
      "Missing Supabase env vars."
    );
  });

  it("returns empty read models when Supabase is not configured", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    vi.resetModules();

    const queries = await import("@/lib/queries");

    await expect(queries.getTerms()).resolves.toEqual([]);
    await expect(queries.getSubjects()).resolves.toEqual([]);
    await expect(queries.getPrerequisites()).resolves.toEqual([]);
    await expect(queries.getLatestEnrollmentStatus()).resolves.toEqual(new Map());
    await expect(queries.getEnrollmentsForTerm("term-1")).resolves.toEqual([]);
    await expect(queries.getEventsForTerm("term-1")).resolves.toEqual([]);
  });
});
