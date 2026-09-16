import { describe, expect, it } from "vitest";
import {
  resolveTestEnvironment,
  TestEnvironmentError,
} from "../../src/config/testEnvironment.js";

describe("HARNESS-01 test-environment guard", () => {
  const workspaceRoot = "D:/toktickit";

  it("rejects a missing test database before any application connection can be made", () => {
    expect(() =>
      resolveTestEnvironment({}, { workspaceRoot, runId: "run-a" }),
    ).toThrow(TestEnvironmentError);
  });

  it("rejects a development database URL instead of treating it as a test target", () => {
    expect(() =>
      resolveTestEnvironment(
        { DATABASE_URL_TEST: "postgresql://user:pass@localhost:5432/toktickit?schema=public" },
        { workspaceRoot, runId: "run-a" },
      ),
    ).toThrow(/disposable test database/i);
  });

  it("accepts only an allowlisted test database and a contained run upload directory", () => {
    const environment = resolveTestEnvironment(
      { DATABASE_URL_TEST: "postgresql://user:pass@localhost:5432/toktickit_test?schema=public" },
      { workspaceRoot, runId: "run-a" },
    );

    expect(environment.databaseUrl).toContain("/toktickit_test?");
    expect(environment.uploadDir.replace(/\\/g, "/")).toBe(
      "D:/toktickit/server/test-uploads/run-a",
    );
  });
});
