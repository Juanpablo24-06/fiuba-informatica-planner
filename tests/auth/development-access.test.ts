import { afterEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/auth/demo/route";

afterEach(() => vi.unstubAllEnvs());

it.each([
  ["production", "true"], ["development", undefined], ["development", "false"]
])("keeps development access closed in %s with flag %s", async (environment, flag) => {
  vi.stubEnv("NODE_ENV", environment);
  vi.stubEnv("DEMO_LOGIN_ENABLED", flag);
  const response = await POST();
  expect(response.status).toBe(404);
  expect(response.headers.get("set-cookie")).toBeNull();
});

it("allows the legacy developer shortcut only when explicitly enabled locally", async () => {
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("DEMO_LOGIN_ENABLED", "true");
  vi.stubEnv("SESSION_SECRET", "development-route-test-secret");
  const response = await POST();
  expect(response.status).toBe(200);
  expect(response.headers.get("set-cookie")).toContain("HttpOnly");
});
