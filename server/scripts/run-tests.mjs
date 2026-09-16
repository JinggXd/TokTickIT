import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  throw new Error("DATABASE_URL_TEST is required; refusing to run tests against an ambient database.");
}

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

const runId = `vitest-${Date.now()}-${process.pid}`;
const uploadDir = path.resolve(process.cwd(), "test-uploads", runId);
const uploadRoot = path.resolve(process.cwd(), "test-uploads");
const relative = path.relative(uploadRoot, uploadDir);
if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
  throw new Error("Refusing an upload directory outside server/test-uploads.");
}
mkdirSync(uploadDir, { recursive: true });

try {
  const result = spawnSync(
    process.execPath,
    ["./node_modules/vitest/vitest.mjs", "run", ...process.argv.slice(2)],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: testUrl,
        TOKTICKIT_TEST_MODE: "true",
        TOKTICKIT_TEST_RUN_ID: runId,
      },
    },
  );
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(uploadDir, { recursive: true, force: true });
}
