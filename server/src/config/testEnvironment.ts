import fs from "node:fs";
import path from "node:path";

export class TestEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TestEnvironmentError";
  }
}

type Environment = Record<string, string | undefined>;

export interface TestEnvironment {
  databaseUrl: string;
  uploadDir: string;
  runId: string;
}

const TEST_DATABASE_NAME = /^toktickit_test(?:_[a-z0-9_]+)?$/i;
const SAFE_RUN_ID = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

function databaseName(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new TestEnvironmentError("DATABASE_URL_TEST must be a valid PostgreSQL URL.");
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    throw new TestEnvironmentError("DATABASE_URL_TEST must use the PostgreSQL protocol.");
  }

  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!TEST_DATABASE_NAME.test(name)) {
    throw new TestEnvironmentError(
      "DATABASE_URL_TEST must target an allowlisted disposable test database named toktickit_test or toktickit_test_<suffix>.",
    );
  }
  return name;
}

export function assertContained(candidate: string, parent: string): void {
  const relative = path.relative(parent, candidate);
  if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new TestEnvironmentError(`Path must be strictly contained within parent directory: ${candidate}`);
  }
}

export function cleanupAttachmentFiles(
  runDir: string,
  parentDir: string,
  storedFileNames: (string | null | undefined)[],
  unlinkFn: (filePath: string) => void = fs.unlinkSync,
): void {
  assertContained(runDir, parentDir);
  for (const name of storedFileNames) {
    if (name) {
      const filePath = path.resolve(runDir, name);
      assertContained(filePath, runDir);
      if (fs.existsSync(filePath)) {
        unlinkFn(filePath);
      }
    }
  }
}

export function resolveTestEnvironment(
  environment: Environment,
  options: { workspaceRoot: string; runId: string },
): TestEnvironment {
  const databaseUrl = environment.DATABASE_URL_TEST;
  if (!databaseUrl) {
    throw new TestEnvironmentError(
      "DATABASE_URL_TEST is required. Refusing to run tests with an ambient development database.",
    );
  }
  databaseName(databaseUrl);

  if (!SAFE_RUN_ID.test(options.runId)) {
    throw new TestEnvironmentError("Test run ID must contain only letters, numbers, underscores, or hyphens.");
  }

  const uploadsRoot = path.resolve(options.workspaceRoot, "server", "test-uploads");
  const uploadDir = path.resolve(uploadsRoot, options.runId);
  assertContained(uploadDir, uploadsRoot);

  return { databaseUrl, uploadDir, runId: options.runId };
}

export function getWorkspaceRoot(cwd = process.cwd()): string {
  return path.basename(cwd).toLowerCase() === "server" ? path.dirname(cwd) : cwd;
}

export function requireTestEnvironment(): TestEnvironment {
  if (process.env.TOKTICKIT_TEST_MODE !== "true") {
    throw new TestEnvironmentError("TOKTICKIT_TEST_MODE=true is required for the test runner.");
  }
  const runId = process.env.TOKTICKIT_TEST_RUN_ID;
  if (!runId) {
    throw new TestEnvironmentError("TOKTICKIT_TEST_RUN_ID is required for isolated test uploads.");
  }

  const testEnvironment = resolveTestEnvironment(process.env, {
    workspaceRoot: getWorkspaceRoot(),
    runId,
  });

  if (process.env.DATABASE_URL !== testEnvironment.databaseUrl) {
    throw new TestEnvironmentError(
      "DATABASE_URL must equal DATABASE_URL_TEST. Refusing to connect tests to a different database.",
    );
  }
  return testEnvironment;
}

export function getUploadDirectory(): string {
  if (process.env.TOKTICKIT_TEST_MODE === "true") {
    return requireTestEnvironment().uploadDir;
  }
  return path.resolve(getWorkspaceRoot(), "server", "uploads");
}

export function validateApiEndpoint(urlString: string): string {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new TestEnvironmentError(`Invalid API URL: ${urlString}`);
  }
  const isLocalhost =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "0.0.0.0" ||
    url.hostname === "[::1]" ||
    url.hostname === "::1";

  if (url.port === "3000" || (!url.port && isLocalhost)) {
    throw new TestEnvironmentError(
      `Refusing to target development server at ${urlString}. Test server runs on port 3001.`,
    );
  }
  return urlString;
}

export function resolveApiBase(
  env: { API_URL?: string; VITE_API_URL?: string; TOKTICKIT_TEST_MODE?: string } = process.env,
): string {
  // In test mode, default strictly to isolated test server on port 3001 and ignore dev-server VITE_API_URL
  let candidate = env.API_URL;
  if (!candidate) {
    candidate =
      env.TOKTICKIT_TEST_MODE === "true"
        ? "http://localhost:3001"
        : env.VITE_API_URL || "http://localhost:3001";
  }
  return validateApiEndpoint(candidate);
}
