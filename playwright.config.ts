import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 60 * 1000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"]
      }
    }
  ],
  webServer: {
    command: "npm run dev:harness",
    url: baseURL,
    // Browser QA exercises local UI and mocked writes, never remote sync.
    env: {
      GOOGLE_CALENDAR_ID: "",
      GOOGLE_SERVICE_ACCOUNT_EMAIL: "",
      GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: "",
      MEM0_API_KEY: ""
    },
    reuseExistingServer: false,
    timeout: 120 * 1000
  }
});
