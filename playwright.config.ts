import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
  throw new Error("DATABASE_URL_TEST is required; Playwright will not start against an ambient database.");
}
const testDatabaseName = decodeURIComponent(new URL(testDatabaseUrl).pathname.replace(/^\//, ""));
if (!/^toktickit_test(?:_[a-z0-9_]+)?$/i.test(testDatabaseName)) {
  throw new Error("DATABASE_URL_TEST must target toktickit_test or toktickit_test_<suffix>.");
}
const testRunId = process.env.TOKTICKIT_TEST_RUN_ID || `playwright-${Date.now()}-${process.pid}`;

// Synchronize environment variables so worker processes and webServer share identical mode, run ID, isolated screenshot folder, and test API URL
process.env.TOKTICKIT_TEST_MODE = "true";
process.env.TOKTICKIT_TEST_RUN_ID = testRunId;
process.env.DATABASE_URL = testDatabaseUrl;
process.env.DATABASE_URL_TEST = testDatabaseUrl;
process.env.API_URL = "http://localhost:3001";
process.env.VITE_API_URL = "http://localhost:3001";
const testScreenshotDir = process.env.SCREENSHOT_DIR || path.resolve("artifacts", "lab-03", "screenshots", testRunId);
process.env.SCREENSHOT_DIR = testScreenshotDir;

const isWorker = process.env.TEST_WORKER_INDEX !== undefined;

function isProbeFile(fileArg: string): boolean {
  const normalized = path.resolve(fileArg).replace(/\\/g, "/").toLowerCase();
  const targetProbe = path.resolve("e2e/lab-03/worker-env.spec.ts").replace(/\\/g, "/").toLowerCase();
  return normalized === targetProbe;
}

function isProbeExecution(argv: string[]): boolean {
  const optionsWithArgs = new Set([
    "-c", "--config",
    "-g", "--grep",
    "--grep-invert",
    "-j", "--workers",
    "--output",
    "-p", "--project",
    "--reporter",
    "--retries",
    "--timeout",
    "--shard",
    "--max-failures",
  ]);

  const testFileArgs: string[] = [];
  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (optionsWithArgs.has(arg)) {
      i++;
      continue;
    }
    if (arg.startsWith("-")) {
      continue;
    }
    if (arg === "test") {
      continue;
    }
    testFileArgs.push(arg);
  }

  return (
    testFileArgs.length > 0 &&
    testFileArgs.every(isProbeFile)
  );
}

const isProbe = isProbeExecution(process.argv);

const skipWebServerRequested = process.env.PLAYWRIGHT_SKIP_WEBSERVER?.trim() === "true";

if (!isWorker && skipWebServerRequested) {
  if (!isProbe) {
    throw new Error(
      "PLAYWRIGHT_SKIP_WEBSERVER is strictly restricted to probe tests (e.g. e2e/lab-03/worker-env.spec.ts). Full test suites must run with isolated test web servers.",
    );
  }
}
const shouldSkipWebServer = !isWorker && skipWebServerRequested && isProbe;

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
  webServer: shouldSkipWebServer ? undefined : [
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
