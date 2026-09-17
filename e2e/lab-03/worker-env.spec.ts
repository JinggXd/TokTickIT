import { test, expect } from "@playwright/test";
import { resolveApiBase, assertContained, cleanupAttachmentFiles } from "../../server/src/config/testEnvironment.js";

test.describe("HARNESS-01 Playwright worker environment propagation", () => {
  test("worker process inherits all test environment variables from Playwright config", async () => {
    // 1. Verify test mode is active in worker
    expect(process.env.TOKTICKIT_TEST_MODE).toBe("true");

    // 2. Verify test run ID is populated and non-empty
    expect(process.env.TOKTICKIT_TEST_RUN_ID).toBeDefined();
    expect(process.env.TOKTICKIT_TEST_RUN_ID!.length).toBeGreaterThan(0);

    // 3. Verify DATABASE_URL matches DATABASE_URL_TEST and targets toktickit_test
    expect(process.env.DATABASE_URL).toBe(process.env.DATABASE_URL_TEST);
    expect(process.env.DATABASE_URL).toContain("toktickit_test");

    // 4. Verify API_URL and VITE_API_URL are locked to test server port 3001
    expect(process.env.API_URL).toBe("http://localhost:3001");
    expect(process.env.VITE_API_URL).toBe("http://localhost:3001");
    expect(resolveApiBase()).toBe("http://localhost:3001");

    // 5. Verify SCREENSHOT_DIR targets lab-03 screenshots run directory
    expect(process.env.SCREENSHOT_DIR).toContain("artifacts");
    expect(process.env.SCREENSHOT_DIR).toContain("lab-03");
    expect(process.env.SCREENSHOT_DIR).toContain("screenshots");

    // 6. Verify shared helpers assertContained and cleanupAttachmentFiles function properly in worker
    expect(() => assertContained("D:/test/file", "D:/test")).not.toThrow();
    expect(typeof cleanupAttachmentFiles).toBe("function");
  });
});
