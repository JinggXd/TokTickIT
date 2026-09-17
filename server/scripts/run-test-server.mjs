import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) throw new Error("DATABASE_URL_TEST is required for the isolated test server.");

let databaseName;
try {
  const parsed = new URL(testUrl);
  databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!["postgresql:", "postgres:"].includes(parsed.protocol)) throw new Error("wrong protocol");
} catch {
  throw new Error("DATABASE_URL_TEST must be a valid PostgreSQL URL.");
}
if (!/^toktickit_test(?:_[a-z0-9_]+)?$/i.test(databaseName)) {
  throw new Error("DATABASE_URL_TEST must target toktickit_test or toktickit_test_<suffix>.");
}

const serverRoot = path.resolve(import.meta.dirname, "..");
const workspaceRoot = path.resolve(serverRoot, "..");
const runId = process.env.TOKTICKIT_TEST_RUN_ID ?? `playwright-${Date.now()}-${process.pid}`;
const uploadRoot = path.resolve(serverRoot, "test-uploads");
const uploadDir = path.resolve(uploadRoot, runId);
const relative = path.relative(uploadRoot, uploadDir);
if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
  throw new Error("Refusing an upload directory outside server/test-uploads.");
}
mkdirSync(uploadDir, { recursive: true });

const child = spawn("npm", ["run", "dev"], {
  cwd: serverRoot,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: {
    ...process.env,
    DATABASE_URL: testUrl,
    TOKTICKIT_TEST_MODE: "true",
    TOKTICKIT_TEST_RUN_ID: runId,
    PORT: process.env.PORT ?? "3001",
  },
});

function cleanupAndExit(code) {
  rmSync(uploadDir, { recursive: true, force: true });
  process.exit(code);
}

child.on("exit", (code) => cleanupAndExit(code ?? 1));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
