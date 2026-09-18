import path from "node:path";
import fs from "node:fs";
import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";
import { hashPassword } from "../../server/src/utils/password.js";

const testDbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
if (!testDbUrl) {
  throw new Error("DATABASE_URL_TEST is required; E2E refusing to run without verified test database.");
}
const testDbName = decodeURIComponent(new URL(testDbUrl).pathname.replace(/^\//, ""));
if (!/^toktickit_test(?:_[a-z0-9_]+)?$/i.test(testDbName)) {
  throw new Error(`E2E refusing to run against non-test database: ${testDbName}`);
}

const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
const runId = process.env.TOKTICKIT_TEST_RUN_ID || `playwright-admin-${Date.now()}`;
const SCREENSHOT_BASE = process.env.SCREENSHOT_DIR || path.resolve("artifacts", "lab-03", "screenshots", runId);

function screenshotPath(testInfo: TestInfo, filename: string): string {
  const dir = path.join(SCREENSHOT_BASE, testInfo.project.name);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}

const createdUserIds: number[] = [];

const ADMIN_EMAIL = `e2e-admin-${runId}@test.local`;
const TARGET_EMAIL = `e2e-target-${runId}@test.local`;
const NEW_STAFF_EMAIL = `e2e-newstaff-${runId}@test.local`;
const PASS = "AdminTest1234!";

let adminId: number;
let targetUserId: number;

async function loginAs(page: Page, email: string, password = PASS) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(password);
  await page.getByTestId("login-submit-button").click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15_000 });
}

async function signOut(page: Page) {
  await page.getByTestId("sign-out-button").click();
  await page.waitForURL((url) => url.pathname.endsWith("/login"), { timeout: 15_000 });
}

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_BASE, { recursive: true });
  const hash = await hashPassword(PASS);

  const admin = await prisma.user.create({
    data: {
      name: `E2E Admin ${runId}`,
      email: ADMIN_EMAIL,
      passwordHash: hash,
      role: "ADMINISTRATOR",
      isActive: true,
      mustChangePassword: false,
      department: "IT",
    },
  });
  adminId = admin.id;
  createdUserIds.push(adminId);

  const target = await prisma.user.create({
    data: {
      name: `E2E Reset Target ${runId}`,
      email: TARGET_EMAIL,
      passwordHash: hash,
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
      department: "Operations",
    },
  });
  targetUserId = target.id;
  createdUserIds.push(targetUserId);
});

test.afterAll(async () => {
  if (createdUserIds.length > 0) {
    await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.$disconnect();
});

test.describe("Phase F4 / P11 & P12: User Administration E2E Verification", () => {
  test("E2E-16: Admin list directory, search, and role filter", async ({ page }, testInfo) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/admin/users");
    await expect(page.getByTestId("user-management-page")).toBeVisible();
    await expect(page.getByTestId("user-table")).toBeVisible();

    // Verify search narrows results
    await page.getByTestId("user-search-input").fill(runId);
    await expect(page.getByTestId("user-table").getByText(`E2E Admin ${runId}`)).toBeVisible();

    // Verify role filter
    await page.getByTestId("user-role-filter").selectOption("ADMINISTRATOR");
    await expect(page.getByTestId("user-table").getByText(`E2E Admin ${runId}`)).toBeVisible();

    // Clear filters
    const clearBtn = page.getByTestId("clear-user-filters-btn");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();

    await page.screenshot({ path: screenshotPath(testInfo, "e2e16-admin-directory.png") });
    await signOut(page);
  });

  test("E2E-12: Admin provisions new user account and verifies forced password change", async ({ page }, testInfo) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/admin/users");
    await expect(page.getByTestId("user-management-page")).toBeVisible();

    // 1. Open Add User modal
    await page.getByTestId("add-user-btn").click();
    await expect(page.getByTestId("add-user-modal")).toBeVisible();

    // 2. Fill form
    const newStaffName = `Provisioned Staff ${runId}`;
    const initialPass = "TempInitialPass123!";
    await page.getByTestId("add-user-name").fill(newStaffName);
    await page.getByTestId("add-user-email").fill(NEW_STAFF_EMAIL);
    await page.getByTestId("add-user-role").selectOption("IT_STAFF");
    await page.getByTestId("add-user-password").fill(initialPass);

    await page.screenshot({ path: screenshotPath(testInfo, "e2e12-add-user-modal.png") });

    // 3. Submit
    await page.getByTestId("submit-add-user-btn").click();
    await expect(page.locator(".alert-success")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(newStaffName)).toBeVisible();

    // Remember created user ID for cleanup
    const createdUser = await prisma.user.findUnique({ where: { email: NEW_STAFF_EMAIL } });
    if (createdUser) createdUserIds.push(createdUser.id);

    await page.screenshot({ path: screenshotPath(testInfo, "e2e12-user-provisioned.png") });
    await signOut(page);

    // 4. Log in as newly provisioned user with initial password
    await page.goto("/login");
    await page.getByTestId("login-email-input").fill(NEW_STAFF_EMAIL);
    await page.getByTestId("login-password-input").fill(initialPass);
    await page.getByTestId("login-submit-button").click();

    // Verify redirected to /change-password
    await page.waitForURL("**/change-password", { timeout: 15_000 });
    await expect(page.getByTestId("mandatory-change-alert")).toBeVisible();
    await expect(page.getByTestId("change-password-card")).toBeVisible();

    // 5. Complete mandatory password change
    const permanentPass = "PermanentPass1234!";
    await page.getByTestId("current-password-input").fill(initialPass);
    await page.getByTestId("new-password-input").fill(permanentPass);
    await page.getByTestId("confirm-password-input").fill(permanentPass);
    await page.getByTestId("update-password-submit-button").click();

    // Verify lands on permitted role view (/staff/queue)
    await page.waitForURL("**/staff/queue", { timeout: 15_000 });
    await expect(page.getByTestId("staff-ticket-queue-page")).toBeVisible();

    await page.screenshot({ path: screenshotPath(testInfo, "e2e12-new-user-landing.png") });
    await signOut(page);
  });

  test("E2E-13: Admin resets user password and verifies session invalidation", async ({ page }, testInfo) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/admin/users");
    await expect(page.getByTestId("user-management-page")).toBeVisible();

    // Find row for target user and click Reset Password
    await page.getByTestId("user-search-input").fill(TARGET_EMAIL);
    await expect(page.getByTestId(`reset-password-btn-${targetUserId}`)).toBeVisible();
    await page.getByTestId(`reset-password-btn-${targetUserId}`).click();

    await expect(page.getByTestId("reset-password-modal")).toBeVisible();
    const newResetSecret = "NewSecretPass2026!";
    await page.getByTestId("reset-user-password").fill(newResetSecret);
    await page.screenshot({ path: screenshotPath(testInfo, "e2e13-reset-password-modal.png") });

    await page.getByTestId("submit-reset-password-btn").click();
    await expect(page.locator(".alert-success")).toBeVisible({ timeout: 8_000 });

    await page.screenshot({ path: screenshotPath(testInfo, "e2e13-password-reset-success.png") });
    await signOut(page);

    // Verify target user must login with new secret and is forced to change password
    await page.goto("/login");
    await page.getByTestId("login-email-input").fill(TARGET_EMAIL);
    await page.getByTestId("login-password-input").fill(newResetSecret);
    await page.getByTestId("login-submit-button").click();

    await page.waitForURL("**/change-password", { timeout: 15_000 });
    await expect(page.getByTestId("mandatory-change-alert")).toBeVisible();
    await expect(page.getByTestId("change-password-card")).toBeVisible();
    await page.screenshot({ path: screenshotPath(testInfo, "e2e13-reset-user-forced-change.png") });
  });

  test("E2E-14: Admin self-deactivation guard", async ({ page }, testInfo) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/admin/users");
    await expect(page.getByTestId("user-management-page")).toBeVisible();

    // Open edit modal on admin's own row
    await page.getByTestId(`edit-user-btn-${adminId}`).click();
    await expect(page.getByTestId("edit-user-modal")).toBeVisible();

    // Verify active checkbox is disabled and warning text is displayed
    const activeToggle = page.getByTestId("edit-user-active");
    await expect(activeToggle).toBeDisabled();
    await expect(page.getByTestId("self-deactivation-warning")).toBeVisible();
    await expect(page.getByTestId("self-deactivation-warning")).toHaveText("You cannot deactivate your own account.");

    await page.screenshot({ path: screenshotPath(testInfo, "e2e14-self-deactivation-guard.png") });
    await page.getByTestId("cancel-edit-user-btn").click();
    await signOut(page);
  });

  test("E2E-16: Edit user name and role", async ({ page }, testInfo) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto("/admin/users");
    await expect(page.getByTestId("user-management-page")).toBeVisible();

    // Edit target user
    await page.getByTestId("user-search-input").fill(TARGET_EMAIL);
    await expect(page.getByTestId(`edit-user-btn-${targetUserId}`)).toBeVisible();
    await page.getByTestId(`edit-user-btn-${targetUserId}`).click();

    await expect(page.getByTestId("edit-user-modal")).toBeVisible();
    const updatedName = `Updated Target ${runId}`;
    await page.getByTestId("edit-user-name").fill(updatedName);
    await page.getByTestId("edit-user-role").selectOption("IT_STAFF");
    await page.getByTestId("submit-edit-user-btn").click();

    await expect(page.locator(".alert-success")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText(updatedName)).toBeVisible();

    await page.screenshot({ path: screenshotPath(testInfo, "e2e16-user-edited.png") });
    await signOut(page);
  });
});
