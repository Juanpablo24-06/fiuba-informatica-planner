import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": rootDir,
      "server-only": fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url))
    }
  },
  test: {
    // Most tests exercise pure logic or source contracts. Only DOM tests need jsdom.
    environment: "node",
    pool: "threads",
    maxWorkers: 2,
    passWithNoTests: true,
    exclude: [...configDefaults.exclude, "tests/e2e/**", "apps/demo/**", "sites/**"]
  }
});
