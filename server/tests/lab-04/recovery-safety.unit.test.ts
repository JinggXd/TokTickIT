import path from "node:path";
import { describe, it, expect } from "vitest";
import { getWorkspaceRoot } from "../../src/config/testEnvironment.js";
import { validateRecoveryTarget } from "../../scripts/verify-recovery.mjs";

describe("MIG-L4-02 recovery safety", () => {
  const uploadDir = path.join(getWorkspaceRoot(), "server/test-uploads/recovery-unit");
  const outputDir = path.join(uploadDir, "proof");
  it("rejects development, remote, non-public schema, and files outside the isolated run", () => {
    for (const url of ["postgresql://user:password@localhost:5433/toktickit", "postgresql://user:password@remote.example/toktickit_test",
      "postgresql://user:password@localhost/toktickit_test?schema=private"]) {
      expect(() => validateRecoveryTarget(url, uploadDir, outputDir)).toThrow();
    }
    expect(() => validateRecoveryTarget("postgresql://u:p@localhost/toktickit_test", uploadDir, path.dirname(uploadDir))).toThrow();
    expect(() => validateRecoveryTarget("postgresql://u:p@localhost/toktickit_test", getWorkspaceRoot(), outputDir)).toThrow();
  });
});
