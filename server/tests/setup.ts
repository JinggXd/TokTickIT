import fs from "node:fs";
import { beforeAll } from "vitest";
import { requireTestEnvironment } from "../src/config/testEnvironment.js";

// Fail-closed guard executes immediately upon setup load, before any test module or app import
const environment = requireTestEnvironment();

beforeAll(() => {
  fs.mkdirSync(environment.uploadDir, { recursive: true });
});
