import { defineConfig, devices } from "@playwright/test";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST is required; Playwright will not start against an ambient database.");
}
const testDatabaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.replace(/^\//, ""));
if (!/^toktickit_test(?:_[a-z0-9_]+)?$/i.test(testDatabaseName)) {
  throw new Error("DATABASE_URL_TEST must target toktickit_test or toktickit_test_<suffix>.");
}
const testRunId = `playwright-${Date.now()}-${process.pid}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "tablet",
      use: {
        browserName: "chromium",
        viewport: { width: 768, height: 1024 },
      },
    },
    {
      name: "mobile",
      use: {
        ...devices["Pixel 5"],
        viewport: { width: 375, height: 667 },
      },
    },
  ],
  webServer: [
    {
      command: "node server/scripts/run-test-server.mjs",
      url: "http://localhost:3001/api/health",
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        DATABASE_URL_TEST: testDatabaseUrl,
        DATABASE_URL: testDatabaseUrl,
        TOKTICKIT_TEST_MODE: "true",
        TOKTICKIT_TEST_RUN_ID: testRunId,
        PORT: "3001",
      },
    },
    {
      command: "npm --prefix client run dev -- --host 127.0.0.1 --port 5174",
      url: "http://localhost:5174",
      reuseExistingServer: false,
      timeout: 30000,
      env: {
        VITE_API_URL: "http://localhost:3001",
      },
    },
  ],
});
