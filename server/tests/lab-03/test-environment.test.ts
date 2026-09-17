import { describe, expect, it } from "vitest";
import {
  resolveTestEnvironment,
  requireTestEnvironment,
  getUploadDirectory,
  assertContained,
  cleanupAttachmentFiles,
  validateApiEndpoint,
  resolveApiBase,
  getWorkspaceRoot,
  TestEnvironmentError,
} from "../../src/config/testEnvironment.js";

describe("HARNESS-01 test-environment guard & isolation", () => {
  const workspaceRoot = "D:/toktickit";
  const validTestUrl = "postgresql://user:pass@localhost:5432/toktickit_test?schema=public";
  const suffixedTestUrl = "postgresql://user:pass@localhost:5432/toktickit_test_worker1?schema=public";

  describe("database target validation", () => {
    it("rejects a missing test database before any application connection can be made", () => {
      expect(() =>
        resolveTestEnvironment({}, { workspaceRoot, runId: "run-a" }),
      ).toThrow(TestEnvironmentError);
    });

    it("rejects non-postgres protocols", () => {
      expect(() =>
        resolveTestEnvironment(
          { DATABASE_URL_TEST: "mysql://user:pass@localhost:3306/toktickit_test" },
          { workspaceRoot, runId: "run-a" },
        ),
      ).toThrow(/PostgreSQL protocol/i);
    });

    it("rejects malformed database URLs", () => {
      expect(() =>
        resolveTestEnvironment(
          { DATABASE_URL_TEST: "not-a-valid-url" },
          { workspaceRoot, runId: "run-a" },
        ),
      ).toThrow(/valid PostgreSQL URL/i);
    });

    it("rejects a development database URL instead of treating it as a test target", () => {
      expect(() =>
        resolveTestEnvironment(
          { DATABASE_URL_TEST: "postgresql://user:pass@localhost:5432/toktickit?schema=public" },
          { workspaceRoot, runId: "run-a" },
        ),
      ).toThrow(/disposable test database/i);
    });

    it("rejects other non-test database names like postgres or production", () => {
      for (const badName of ["postgres", "toktickit_prod", "toktickit_dev", "production"]) {
        expect(() =>
          resolveTestEnvironment(
            { DATABASE_URL_TEST: `postgresql://user:pass@localhost:5432/${badName}?schema=public` },
            { workspaceRoot, runId: "run-a" },
          ),
        ).toThrow(/disposable test database/i);
      }
    });

    it("accepts an allowlisted test database and suffixed test database", () => {
      const env1 = resolveTestEnvironment(
        { DATABASE_URL_TEST: validTestUrl },
        { workspaceRoot, runId: "run-a" },
      );
      expect(env1.databaseUrl).toContain("/toktickit_test?");

      const env2 = resolveTestEnvironment(
        { DATABASE_URL_TEST: suffixedTestUrl },
        { workspaceRoot, runId: "run-b" },
      );
      expect(env2.databaseUrl).toContain("/toktickit_test_worker1?");
    });
  });

  describe("upload directory and path safety", () => {
    it("accepts a contained run upload directory within server/test-uploads", () => {
      const environment = resolveTestEnvironment(
        { DATABASE_URL_TEST: validTestUrl },
        { workspaceRoot, runId: "run-a" },
      );
      expect(environment.uploadDir.replace(/\\/g, "/")).toBe(
        "D:/toktickit/server/test-uploads/run-a",
      );
    });

    it("rejects run IDs with path traversal characters", () => {
      for (const badRunId of ["../escape", "run/nested", "..", "run\\escape"]) {
        expect(() =>
          resolveTestEnvironment(
            { DATABASE_URL_TEST: validTestUrl },
            { workspaceRoot, runId: badRunId },
          ),
        ).toThrow(/Test run ID must contain only letters, numbers, underscores, or hyphens/i);
      }
    });

    it("rejects empty or invalid character run IDs", () => {
      for (const badRunId of ["", "run@id", "run$id", "run id"]) {
        expect(() =>
          resolveTestEnvironment(
            { DATABASE_URL_TEST: validTestUrl },
            { workspaceRoot, runId: badRunId },
          ),
        ).toThrow(/Test run ID must contain only letters, numbers, underscores, or hyphens/i);
      }
    });
  });

  describe("requireTestEnvironment and runtime mode enforcement", () => {
    const originalEnv = { ...process.env };

    it("rejects when TOKTICKIT_TEST_MODE is not true", () => {
      process.env.TOKTICKIT_TEST_MODE = "false";
      expect(() => requireTestEnvironment()).toThrow(/TOKTICKIT_TEST_MODE=true is required/i);
      process.env = { ...originalEnv };
    });

    it("rejects when TOKTICKIT_TEST_RUN_ID is missing in test mode", () => {
      process.env.TOKTICKIT_TEST_MODE = "true";
      delete process.env.TOKTICKIT_TEST_RUN_ID;
      expect(() => requireTestEnvironment()).toThrow(/TOKTICKIT_TEST_RUN_ID is required/i);
      process.env = { ...originalEnv };
    });

    it("rejects when DATABASE_URL does not match DATABASE_URL_TEST (environment mismatch bypass)", () => {
      process.env.TOKTICKIT_TEST_MODE = "true";
      process.env.TOKTICKIT_TEST_RUN_ID = "run-safe-123";
      process.env.DATABASE_URL_TEST = validTestUrl;
      process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/toktickit?schema=public";

      expect(() => requireTestEnvironment()).toThrow(/DATABASE_URL must equal DATABASE_URL_TEST/i);
      process.env = { ...originalEnv };
    });

    it("succeeds when all test environment requirements are properly matched", () => {
      process.env.TOKTICKIT_TEST_MODE = "true";
      process.env.TOKTICKIT_TEST_RUN_ID = "run-safe-123";
      process.env.DATABASE_URL_TEST = validTestUrl;
      process.env.DATABASE_URL = validTestUrl;

      const env = requireTestEnvironment();
      expect(env.runId).toBe("run-safe-123");
      expect(env.databaseUrl).toBe(validTestUrl);
      expect(env.uploadDir.replace(/\\/g, "/")).toContain("/server/test-uploads/run-safe-123");

      process.env = { ...originalEnv };
    });
  });

  describe("getUploadDirectory isolation", () => {
    const originalEnv = { ...process.env };

    it("returns isolated test upload path in test mode", () => {
      process.env.TOKTICKIT_TEST_MODE = "true";
      process.env.TOKTICKIT_TEST_RUN_ID = "run-upload-dir";
      process.env.DATABASE_URL_TEST = validTestUrl;
      process.env.DATABASE_URL = validTestUrl;

      const uploadDir = getUploadDirectory();
      expect(uploadDir.replace(/\\/g, "/")).toContain("/server/test-uploads/run-upload-dir");

      process.env = { ...originalEnv };
    });

    it("returns normal server/uploads when not in test mode", () => {
      delete process.env.TOKTICKIT_TEST_MODE;
      delete process.env.TOKTICKIT_TEST_RUN_ID;

      const uploadDir = getUploadDirectory();
      expect(uploadDir.replace(/\\/g, "/")).toContain("/server/uploads");

      process.env = { ...originalEnv };
    });
  });

  describe("HARNESS-01 integration: real path validation, worker propagation, and strict containment cleanup", () => {
    it("validates that API endpoint resolution rejects development server (port 3000)", () => {
      // Must refuse dev server on port 3000 across all host variants
      expect(() => validateApiEndpoint("http://localhost:3000")).toThrow(
        /Refusing to target development server/i,
      );
      expect(() => validateApiEndpoint("http://127.0.0.1:3000/api")).toThrow(
        /Refusing to target development server/i,
      );
      expect(() => validateApiEndpoint("http://0.0.0.0:3000")).toThrow(
        /Refusing to target development server/i,
      );
      expect(() => validateApiEndpoint("http://[::1]:3000")).toThrow(
        /Refusing to target development server/i,
      );
      expect(() => validateApiEndpoint("http://localhost")).toThrow(
        /Refusing to target development server/i,
      );

      // Must accept test server on port 3001
      expect(validateApiEndpoint("http://localhost:3001")).toBe("http://localhost:3001");
      expect(validateApiEndpoint("http://localhost:3001/api")).toBe("http://localhost:3001/api");
    });

    it("verifies resolveApiBase enforces test port 3001 in test mode and rejects dev server overrides", () => {
      // When in test mode, ambient dev VITE_API_URL pointing to port 3000 is ignored and defaults to port 3001
      expect(
        resolveApiBase({
          TOKTICKIT_TEST_MODE: "true",
          VITE_API_URL: "http://localhost:3000",
        }),
      ).toBe("http://localhost:3001");

      // When in test mode with no env, defaults to port 3001
      expect(resolveApiBase({ TOKTICKIT_TEST_MODE: "true" })).toBe("http://localhost:3001");

      // Explicit API_URL override targeting port 3000 must be rejected
      expect(() =>
        resolveApiBase({
          TOKTICKIT_TEST_MODE: "true",
          API_URL: "http://localhost:3000",
        }),
      ).toThrow(/Refusing to target development server/i);

      // Explicit valid test API_URL is accepted
      expect(
        resolveApiBase({
          TOKTICKIT_TEST_MODE: "true",
          API_URL: "http://localhost:3001",
        }),
      ).toBe("http://localhost:3001");
    });

    it("verifies requireTestEnvironment and getUploadDirectory return run-specific contained directory", () => {
      const original = { ...process.env };
      const runId = `harness-real-${Date.now()}`;
      process.env.TOKTICKIT_TEST_MODE = "true";
      process.env.TOKTICKIT_TEST_RUN_ID = runId;
      process.env.DATABASE_URL_TEST = validTestUrl;
      process.env.DATABASE_URL = validTestUrl;

      // Invokes actual application functions
      const env = requireTestEnvironment();
      const uploadDir = getUploadDirectory();

      expect(env.runId).toBe(runId);
      expect(uploadDir).toContain(runId);
      expect(uploadDir).toContain("server");
      expect(uploadDir).toContain("test-uploads");
      expect(uploadDir).not.toContain("server/uploads");

      process.env = { ...original };
    });

    it("verifies physical file creation and deterministic containment cleanup strictly within runSpecificDir using shared helper", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");

      const demoRunId = `cleanup-run-${Date.now()}`;
      const uploadsRoot = path.resolve(getWorkspaceRoot(), "server", "test-uploads");
      const runSpecificDir = path.resolve(uploadsRoot, demoRunId);
      const testFile = path.resolve(runSpecificDir, "test_fixture.pdf");

      // 1. Assert runSpecificDir itself is contained within uploadsRoot
      assertContained(runSpecificDir, uploadsRoot);

      // 2. Create fixture file inside runSpecificDir
      fs.mkdirSync(runSpecificDir, { recursive: true });
      fs.writeFileSync(testFile, "dummy test fixture content");
      expect(fs.existsSync(testFile)).toBe(true);

      // 3. Clean up using shared cleanupAttachmentFiles helper
      cleanupAttachmentFiles(runSpecificDir, uploadsRoot, ["test_fixture.pdf"]);

      // 4. Verify physical removal
      expect(fs.existsSync(testFile)).toBe(false);
      fs.rmdirSync(runSpecificDir);
      expect(fs.existsSync(runSpecificDir)).toBe(false);
    });

    it("fails visibly when cleanup encounters uncontained path or physical unlink failure", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const uploadsRoot = path.resolve(getWorkspaceRoot(), "server", "test-uploads");
      const demoRunId = `cleanup-fail-${Date.now()}`;
      const runSpecificDir = path.resolve(uploadsRoot, demoRunId);
      const testFile = path.resolve(runSpecificDir, "error_fixture.pdf");

      fs.mkdirSync(runSpecificDir, { recursive: true });
      fs.writeFileSync(testFile, "test fixture for failure simulation");

      // 1. Path rejection: attempting to clean an escaped path fails closed with TestEnvironmentError
      const uncontainedFile = path.resolve(getWorkspaceRoot(), "server", "uploads", "legacy_file.pdf");
      expect(() => assertContained(uncontainedFile, uploadsRoot)).toThrow(
        /must be strictly contained/i,
      );
      expect(() =>
        cleanupAttachmentFiles(runSpecificDir, uploadsRoot, ["../legacy_file.pdf"]),
      ).toThrow(/must be strictly contained/i);

      // 2. Simulated physical unlink failure: unlinkFn throws (e.g. EPERM / disk I/O / locked file error)
      const simulatedUnlinkError = new Error("EPERM: operation not permitted, unlink 'error_fixture.pdf'");
      const failingUnlink = () => {
        throw simulatedUnlinkError;
      };

      // Verify cleanupAttachmentFiles propagates the error and does NOT swallow it (proves: cleanup failures fail run)
      expect(() =>
        cleanupAttachmentFiles(runSpecificDir, uploadsRoot, ["error_fixture.pdf"], failingUnlink),
      ).toThrow(simulatedUnlinkError);

      // Clean up test file and directory safely
      fs.unlinkSync(testFile);
      fs.rmdirSync(runSpecificDir);
    });

    it("proves at runtime via Playwright CLI that missing or dev DATABASE_URL_TEST is rejected and valid test DB succeeds", async () => {
      const { spawnSync } = await import("node:child_process");
      const workspaceRoot = getWorkspaceRoot();

      // Case 1: Missing DATABASE_URL_TEST must fail closed at runtime
      const r1 = spawnSync("npx", ["playwright", "test", "--list"], {
        cwd: workspaceRoot,
        env: { ...process.env, DATABASE_URL_TEST: "" },
        encoding: "utf-8",
        shell: true,
      });
      expect(r1.status).not.toBe(0);
      expect(r1.stderr).toContain("DATABASE_URL_TEST is required");

      // Case 2: Development database target must fail closed at runtime
      const r2 = spawnSync("npx", ["playwright", "test", "--list"], {
        cwd: workspaceRoot,
        env: { ...process.env, DATABASE_URL_TEST: "postgresql://user:pass@localhost:5432/toktickit?schema=public" },
        encoding: "utf-8",
        shell: true,
      });
      expect(r2.status).not.toBe(0);
      expect(r2.stderr).toContain("DATABASE_URL_TEST must target toktickit_test");

      // Case 3: Valid test database target loads successfully and lists all tests
      const r3 = spawnSync("npx", ["playwright", "test", "--list"], {
        cwd: workspaceRoot,
        env: { ...process.env, DATABASE_URL_TEST: validTestUrl },
        encoding: "utf-8",
        shell: true,
      });
      expect(r3.status).toBe(0);
      expect(r3.stdout).toContain("Listing tests:");
    }, 45000);

    it("proves Playwright worker execution and environment propagation at runtime without build artifacts", async () => {
      const { spawnSync } = await import("node:child_process");
      const workspaceRoot = getWorkspaceRoot();

      // Executes Playwright worker directly via CLI against e2e/lab-03/worker-env.spec.ts
      // Verifies actual Playwright worker environment propagation without relying on server/dist build artifacts
      const workerResult = spawnSync(
        "npx",
        ["playwright", "test", "e2e/lab-03/worker-env.spec.ts", "--project=desktop"],
        {
          cwd: workspaceRoot,
          env: {
            ...process.env,
            DATABASE_URL_TEST: validTestUrl,
            PLAYWRIGHT_SKIP_WEBSERVER: "true",
          },
          encoding: "utf-8",
          shell: true,
        },
      );

      expect(workerResult.status).toBe(0);
      expect(workerResult.stdout).toContain("1 passed");
    }, 45000);

    it("strictly restricts skipping webServer to probe tests and rejects non-probe test suites", async () => {
      const { spawnSync } = await import("node:child_process");
      const workspaceRoot = getWorkspaceRoot();

      // Case 1: Non-probe test file with PLAYWRIGHT_SKIP_WEBSERVER=true must fail closed
      const rNonProbe = spawnSync(
        "npx",
        ["playwright", "test", "e2e/lab-02/requester-ticket-flow.spec.ts", "--list"],
        {
          cwd: workspaceRoot,
          env: {
            ...process.env,
            DATABASE_URL_TEST: validTestUrl,
            PLAYWRIGHT_SKIP_WEBSERVER: "true",
          },
          encoding: "utf-8",
          shell: true,
        },
      );
      expect(rNonProbe.status).not.toBe(0);
      expect(rNonProbe.stderr).toContain("PLAYWRIGHT_SKIP_WEBSERVER is strictly restricted to probe tests");

      // Case 2: Non-probe test file containing 'probe' in filename with PLAYWRIGHT_SKIP_WEBSERVER=true must fail closed
      const rProbeName = spawnSync(
        "npx",
        ["playwright", "test", "e2e/lab-02/probe.spec.ts", "--list"],
        {
          cwd: workspaceRoot,
          env: {
            ...process.env,
            DATABASE_URL_TEST: validTestUrl,
            PLAYWRIGHT_SKIP_WEBSERVER: "true",
          },
          encoding: "utf-8",
          shell: true,
        },
      );
      expect(rProbeName.status).not.toBe(0);
      expect(rProbeName.stderr).toContain("PLAYWRIGHT_SKIP_WEBSERVER is strictly restricted to probe tests");

      // Case 3: General invocation (all tests) with PLAYWRIGHT_SKIP_WEBSERVER=true must fail closed
      const rAllTests = spawnSync(
        "npx",
        ["playwright", "test", "--list"],
        {
          cwd: workspaceRoot,
          env: {
            ...process.env,
            DATABASE_URL_TEST: validTestUrl,
            PLAYWRIGHT_SKIP_WEBSERVER: "true",
          },
          encoding: "utf-8",
          shell: true,
        },
      );
      expect(rAllTests.status).not.toBe(0);
      expect(rAllTests.stderr).toContain("PLAYWRIGHT_SKIP_WEBSERVER is strictly restricted to probe tests");

      // Case 4: Probe test with PLAYWRIGHT_SKIP_WEBSERVER=true succeeds
      const rProbe = spawnSync(
        "npx",
        ["playwright", "test", "e2e/lab-03/worker-env.spec.ts", "--project=desktop"],
        {
          cwd: workspaceRoot,
          env: {
            ...process.env,
            DATABASE_URL_TEST: validTestUrl,
            PLAYWRIGHT_SKIP_WEBSERVER: "true",
          },
          encoding: "utf-8",
          shell: true,
        },
      );
      expect(rProbe.status).toBe(0);
      expect(rProbe.stdout).toContain("1 passed");
    }, 45000);

    it("verifies Playwright webServer and worker configuration options disable server reuse and bind to port 3001", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const configPath = path.resolve(getWorkspaceRoot(), "playwright.config.ts");
      const configContent = fs.readFileSync(configPath, "utf-8");

      expect(configContent).toContain("reuseExistingServer: false");
      expect(configContent).toContain('PORT: "3001"');
      expect(configContent).toContain('VITE_API_URL: "http://localhost:3001"');
      expect(configContent).toContain("workers: 1");
    });
  });
});
