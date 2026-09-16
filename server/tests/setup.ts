import fs from "node:fs";
import { beforeAll } from "vitest";
import { requireTestEnvironment } from "../src/config/testEnvironment.js";

beforeAll(() => {
  const environment = requireTestEnvironment();
  fs.mkdirSync(environment.uploadDir, { recursive: true });
});
