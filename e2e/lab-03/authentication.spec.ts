import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { test, expect, type TestInfo } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";
import { hashPassword } from "../../server/src/utils/password.js";

// Safety check: verify we are running against disposable test database
const testDbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
if (!testDbUrl) {
  throw new Error("DATABASE_URL_TEST is required; E2E refusing to run without verified test database.");
}
const testDbName = decodeURIComponent(new URL(testDbUrl).pathname.replace(/^\//, ""));
if (!/^toktickit_test(?:_[a-z0-9_]+)?$/i.test(testDbName)) {
  throw new Error(`E2E refusing to run against non-test database: ${testDbName}`);
}

const prisma = new PrismaClient({
  datasources: { db: { url: testDbUrl } },
});

const runId = process.env.TOKTICKIT_TEST_RUN_ID || `playwright-${Date.now()}`;
const SCREENSHOT_BASE = process.env.SCREENSHOT_DIR || path.resolve("artifacts", "lab-03", "screenshots", runId);

function getScreenshotPath(testInfo: TestInfo, filename: string): string {
  const projectDir = path.join(SCREENSHOT_BASE, testInfo.project.name);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  return path.join(projectDir, filename);
}

// Track all IDs created dynamically across tests for strict teardown
const createdUserIds: number[] = [];

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_BASE, { recursive: true });
});

test.afterAll(async () => {
  if (createdUserIds.length > 0) {
    await prisma.session.deleteMany({
      where: { userId: { in: createdUserIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
  }
  await prisma.$disconnect();
});

test.describe("Phase F2 / P06 E2E Authentication & Navigation (E2E-01 to E2E-05)", () => {
  const TEST_PASSWORD = "E2EPassword2026!";

  // Helper to create isolated user
  async function createTestUser(options: {
    role?: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
    name?: string;
    mustChangePassword?: boolean;
    isActive?: boolean;
    password?: string;
  }) {
    const unique = crypto.randomUUID().slice(0, 8);
    const role = options.role ?? "REQUESTER";
    const email = `e2e.${role.toLowerCase()}.${unique}@example.com`;
    const pwd = options.password ?? TEST_PASSWORD;
    const passwordHash = await hashPassword(pwd);

    const user = await prisma.user.create({
      data: {
        name: options.name ?? `E2E ${role} ${unique}`,
        email,
        department: "Engineering",
        role,
        passwordHash,
        mustChangePassword: options.mustChangePassword ?? false,
        isActive: options.isActive ?? true,
      },
    });
    createdUserIds.push(user.id);
    return { ...user, plaintextPassword: pwd };
  }

  // -------------------------------------------------------------------------
  // E2E-01 (AC-01, AC-08, AC-13): Valid login, permitted role landing page, logout flow
  // -------------------------------------------------------------------------
  test("E2E-01: Valid login, permitted role landing page, logout flow", async ({ page }, testInfo) => {
    const user = await createTestUser({ role: "REQUESTER", name: "Alice Requester" });

    await page.goto("/login");
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeVisible();

    // Fill valid credentials
    await page.locator('[data-testid="login-email-input"]').fill(user.email);
    await page.locator('[data-testid="login-password-input"]').fill(user.plaintextPassword);
    await page.locator('[data-testid="login-submit-button"]').click();

    // Expect redirect to /my-tickets and landing view
    await page.waitForURL("**/my-tickets");
    await expect(page.locator('[data-testid="user-profile-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-profile-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-profile-name"]')).toHaveText(user.name);
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText("Requester");
    await expect(
      page.locator('[data-testid="nav-my-tickets"], [data-testid="nav-my-tickets-mobile"]').filter({ visible: true }),
    ).toBeVisible();

    // Verify Lab 2 legacy selector is completely absent
    await expect(page.locator('[data-testid="requester-selector"]')).toHaveCount(0);

    // Capture screenshot of authenticated requester view
    await page.screenshot({ path: getScreenshotPath(testInfo, "e2e-01-requester-authenticated.png") });

    // Logout
    await page.locator('[data-testid="sign-out-button"]').click();

    // Verified redirected to /login with form visible
    await page.waitForURL("**/login");
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-profile-badge"]')).toHaveCount(0);

    await page.screenshot({ path: getScreenshotPath(testInfo, "e2e-01-logged-out.png") });
  });

  // -------------------------------------------------------------------------
  // E2E-02 (AC-02, R02): Forced initial password change flow
  // -------------------------------------------------------------------------
  test("E2E-02: Forced initial password change flow", async ({ page }, testInfo) => {
    const tempPassword = "InitialTempSecret2026!";
    const newPassword = "BrandNewSecurePassword2026!";
    const user = await createTestUser({
      role: "REQUESTER",
      name: "Bob ForcedChange",
      mustChangePassword: true,
      password: tempPassword,
    });

    await page.goto("/login");
    await page.locator('[data-testid="login-email-input"]').fill(user.email);
    await page.locator('[data-testid="login-password-input"]').fill(tempPassword);
    await page.locator('[data-testid="login-submit-button"]').click();

    // User must be directed to /change-password
    await page.waitForURL("**/change-password");
    await expect(page.locator('[data-testid="mandatory-change-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="mandatory-change-alert"]')).toContainText(
      "You are required to set a new password before proceeding.",
    );

    // Cancel button must not be present in mandatory mode
    await expect(page.getByRole("button", { name: "Cancel" })).toHaveCount(0);

    await page.screenshot({ path: getScreenshotPath(testInfo, "e2e-02-mandatory-change-screen.png") });

    // Fill new password form
    await page.locator('[data-testid="current-password-input"]').fill(tempPassword);
    await page.locator('[data-testid="new-password-input"]').fill(newPassword);
    await page.locator('[data-testid="confirm-password-input"]').fill(newPassword);
    await page.locator('[data-testid="update-password-submit-button"]').click();

    // Success alert displayed
    await expect(page.locator('[data-testid="change-password-success-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="change-password-success-alert"]')).toContainText(
      "Password changed successfully! Redirecting...",
    );

    // Lands on role landing view
    await page.waitForURL("**/my-tickets", { timeout: 10000 });
    await expect(
      page.locator('[data-testid="nav-my-tickets"], [data-testid="nav-my-tickets-mobile"]').filter({ visible: true }),
    ).toBeVisible();

    // Verify DB state updated: mustChangePassword is false
    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updatedUser.mustChangePassword).toBe(false);

    await page.screenshot({ path: getScreenshotPath(testInfo, "e2e-02-post-change-landing.png") });

    // Complete flow: logout after accessing role landing page
    await page.locator('[data-testid="sign-out-button"]').click();
    await page.waitForURL("**/login");
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-profile-badge"]')).toHaveCount(0);
  });

  // -------------------------------------------------------------------------
  // E2E-03 (AC-08, R01): Invalidate session on logout and verify back navigation blocked
  // -------------------------------------------------------------------------
  test("E2E-03: Invalidate session on logout and verify back navigation blocked", async ({ page }, testInfo) => {
    const user = await createTestUser({ role: "REQUESTER", name: "Charlie SessionGuard" });

    await page.goto("/login");
    await page.locator('[data-testid="login-email-input"]').fill(user.email);
    await page.locator('[data-testid="login-password-input"]').fill(user.plaintextPassword);
    await page.locator('[data-testid="login-submit-button"]').click();

    await page.waitForURL("**/my-tickets");
    await expect(page.locator('[data-testid="user-profile-badge"]')).toBeVisible();

    // Logout
    await page.locator('[data-testid="sign-out-button"]').click();
    await page.waitForURL("**/login");
    await expect(page.locator('[data-testid="login-submit-button"]')).toBeVisible();

    // Press browser Back button
    await page.goBack();

    // The user session is invalidated. App either stays on /login or renders login form
    // Protected data and AppShell must NOT be visible
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-profile-badge"]')).toHaveCount(0);

    // Direct navigation to protected route also renders login form
    await page.goto("/my-tickets");
    await expect(page.locator('[data-testid="login-email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-profile-badge"]')).toHaveCount(0);

    await page.screenshot({ path: getScreenshotPath(testInfo, "e2e-03-back-navigation-blocked.png") });
  });

  // -------------------------------------------------------------------------
  // E2E-04 (AC-12, R01): Login error flows (wrong password, inactive account)
  // -------------------------------------------------------------------------
  test("E2E-04: Login error flows (wrong password, inactive account, client validation)", async ({ page }, testInfo) => {
    const activeUser = await createTestUser({ role: "REQUESTER", name: "David Active" });
    const inactiveUser = await createTestUser({
      role: "REQUESTER",
      name: "Eve Inactive",
      isActive: false,
    });

    await page.goto("/login");

    // 1. Client validation on blank submit
    await page.locator('[data-testid="login-submit-button"]').click();
    await expect(page.locator("#login-email-error")).toHaveText("Email address is required");
    await expect(page.locator("#login-password-error")).toHaveText("Password is required");

    // 2. Wrong password for active user
    await page.locator('[data-testid="login-email-input"]').fill(activeUser.email);
    await page.locator('[data-testid="login-password-input"]').fill("WrongPassword999!");
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="login-error-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-error-alert"]')).toHaveText("Invalid email or password");

    // 3. Credentials for inactive user -> uniform 401 error message
    await page.locator('[data-testid="login-email-input"]').fill(inactiveUser.email);
    await page.locator('[data-testid="login-password-input"]').fill(inactiveUser.plaintextPassword);
    await page.locator('[data-testid="login-submit-button"]').click();

    await expect(page.locator('[data-testid="login-error-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-error-alert"]')).toHaveText("Invalid email or password");

    await page.screenshot({ path: getScreenshotPath(testInfo, "e2e-04-login-error-states.png") });
  });

  // -------------------------------------------------------------------------
  // E2E-05 (AC-13, R03): Role-based navigation routing (Requester, Staff, Admin)
  // -------------------------------------------------------------------------
  test("E2E-05: Role-based navigation routing (Requester, Staff, Admin)", async ({ page }, testInfo) => {
    const requester = await createTestUser({ role: "REQUESTER", name: "Frank Requester" });
    const staff = await createTestUser({ role: "IT_STAFF", name: "Grace Staff" });
    const admin = await createTestUser({ role: "ADMINISTRATOR", name: "Heidi Admin" });

    // 1. Requester flow -> lands on /my-tickets
    await page.goto("/login");
    await page.locator('[data-testid="login-email-input"]').fill(requester.email);
    await page.locator('[data-testid="login-password-input"]').fill(requester.plaintextPassword);
    await page.locator('[data-testid="login-submit-button"]').click();

    await page.waitForURL("**/my-tickets");
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText("Requester");
    await expect(
      page.locator('[data-testid="nav-my-tickets"], [data-testid="nav-my-tickets-mobile"]').filter({ visible: true }),
    ).toBeVisible();
    await expect(page.locator('[data-testid="nav-staff-queue"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="nav-admin-users"]')).toHaveCount(0);

    await page.screenshot({ path: getScreenshotPath(testInfo, "e2e-05-role-requester.png") });
    await page.locator('[data-testid="sign-out-button"]').click();
    await page.waitForURL("**/login");

    // 2. IT Staff flow -> lands on /staff/queue
    await page.locator('[data-testid="login-email-input"]').fill(staff.email);
    await page.locator('[data-testid="login-password-input"]').fill(staff.plaintextPassword);
    await page.locator('[data-testid="login-submit-button"]').click();

    await page.waitForURL("**/staff/queue");
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText("IT Staff");
    await expect(
      page.locator('[data-testid="nav-staff-queue"], [data-testid="nav-staff-queue-mobile"]').filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "IT Staff Portal" })).toBeVisible();
    await expect(page.locator('[data-testid="nav-my-tickets"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="nav-admin-users"]')).toHaveCount(0);

    await page.screenshot({ path: getScreenshotPath(testInfo, "e2e-05-role-staff.png") });
    await page.locator('[data-testid="sign-out-button"]').click();
    await page.waitForURL("**/login");

    // 3. Administrator flow -> lands on /admin/users
    await page.locator('[data-testid="login-email-input"]').fill(admin.email);
    await page.locator('[data-testid="login-password-input"]').fill(admin.plaintextPassword);
    await page.locator('[data-testid="login-submit-button"]').click();

    await page.waitForURL("**/admin/users");
    await expect(page.locator('[data-testid="user-role-badge"]')).toHaveText("Administrator");
    await expect(
      page.locator('[data-testid="nav-admin-users"], [data-testid="nav-admin-users-mobile"]').filter({ visible: true }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Administrator Portal" })).toBeVisible();
    await expect(page.locator('[data-testid="nav-my-tickets"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="nav-staff-queue"]')).toHaveCount(0);

    await page.screenshot({ path: getScreenshotPath(testInfo, "e2e-05-role-admin.png") });
    await page.locator('[data-testid="sign-out-button"]').click();
    await page.waitForURL("**/login");
  });
});
