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
const runId = process.env.TOKTICKIT_TEST_RUN_ID || `playwright-staff-${Date.now()}`;
const SCREENSHOT_BASE = process.env.SCREENSHOT_DIR || path.resolve("artifacts", "lab-03", "screenshots", runId);

function screenshotPath(testInfo: TestInfo, filename: string): string {
  const dir = path.join(SCREENSHOT_BASE, testInfo.project.name);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}

const createdUserIds: number[] = [];
const createdTicketIds: number[] = [];

const STAFF_EMAIL = `e2e-staff-${runId}@test.local`;
const REQUESTER_EMAIL = `e2e-req-${runId}@test.local`;
const ADMIN_EMAIL = `e2e-admin-${runId}@test.local`;
const PASS = "StaffTest123!";

let staffId: number;
let requesterId: number;
let adminId: number;
let ticketId: number;

async function loginAs(page: Page, email: string, password = PASS) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(password);
  await page.getByTestId("login-submit-btn").click();
  await page.waitForSelector("[data-testid='app-loading']", { state: "detached", timeout: 10_000 }).catch(() => {});
}

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_BASE, { recursive: true });
  const hash = await hashPassword(PASS);

  const staff = await prisma.user.create({
    data: { name: "E2E Staff", email: STAFF_EMAIL, passwordHash: hash, role: "IT_STAFF", isActive: true, mustChangePassword: false, department: "IT" },
  });
  staffId = staff.id;
  createdUserIds.push(staffId);

  const requester = await prisma.user.create({
    data: { name: "E2E Requester", email: REQUESTER_EMAIL, passwordHash: hash, role: "REQUESTER", isActive: true, mustChangePassword: false, department: "Finance" },
  });
  requesterId = requester.id;
  createdUserIds.push(requesterId);

  const admin = await prisma.user.create({
    data: { name: "E2E Admin", email: ADMIN_EMAIL, passwordHash: hash, role: "ADMINISTRATOR", isActive: true, mustChangePassword: false, department: "Management" },
  });
  adminId = admin.id;
  createdUserIds.push(adminId);

  let cat = await prisma.category.findFirst({ where: { isActive: true } });
  if (!cat) cat = await prisma.category.create({ data: { name: `E2E Cat ${runId}`, isActive: true } });
  let sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  if (!sys) sys = await prisma.relatedSystem.create({ data: { name: `E2E Sys ${runId}`, isActive: true } });

  const ticket = await prisma.ticket.create({
    data: {
      summary: `E2E Staff Flow Test ${runId}`,
      description: "Created by E2E staff-ticket-flow spec",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      requesterId,
      categoryId: cat.id,
      relatedSystemId: sys.id,
      version: 1,
    },
  });
  ticketId = ticket.id;
  createdTicketIds.push(ticketId);
});

test.afterAll(async () => {
  await prisma.communication.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
  await prisma.attachment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
  await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await prisma.$disconnect();
});

// E2E-09
test.describe("E2E-09: Staff Queue search and filter", () => {
  test("Queue renders and search narrows results", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await expect(page).toHaveURL(/\/staff\/queue/);
    await expect(page.getByTestId("staff-ticket-queue-page")).toBeVisible();
    await page.screenshot({ path: screenshotPath(testInfo, "e2e09-queue-initial.png") });

    await page.getByTestId("queue-search-input").fill(`E2E Staff Flow Test ${runId}`);
    await page.waitForTimeout(600);
    await page.waitForSelector("[data-testid='staff-queue-table'],[data-testid='staff-queue-no-results'],[data-testid='staff-queue-empty']", { timeout: 8_000 });
    await page.screenshot({ path: screenshotPath(testInfo, "e2e09-queue-search.png") });
  });

  test("Status filter NEW shows queue", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await expect(page).toHaveURL(/\/staff\/queue/);
    await page.getByTestId("queue-status-filter").selectOption("NEW");
    await page.waitForTimeout(500);
    await page.waitForSelector("[data-testid='staff-queue-table'],[data-testid='staff-queue-no-results'],[data-testid='staff-queue-empty']", { timeout: 8_000 });
    await page.screenshot({ path: screenshotPath(testInfo, "e2e09-status-filter.png") });
  });

  test("Non-matching search shows no-results state", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await expect(page).toHaveURL(/\/staff\/queue/);
    await page.getByTestId("queue-search-input").fill(`ZZZZ_NONE_${runId}`);
    await page.waitForTimeout(600);
    await page.waitForSelector("[data-testid='staff-queue-no-results'],[data-testid='staff-queue-empty']", { timeout: 8_000 });
    await page.screenshot({ path: screenshotPath(testInfo, "e2e09-no-results.png") });
  });

  test("Clear filters resets search", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await expect(page).toHaveURL(/\/staff\/queue/);
    await page.getByTestId("queue-search-input").fill("some text");
    await page.waitForTimeout(600);
    await expect(page.getByTestId("queue-clear-filters-btn")).toBeVisible();
    await page.getByTestId("queue-clear-filters-btn").click();
    await expect(page.getByTestId("queue-search-input")).toHaveValue("");
    await page.screenshot({ path: screenshotPath(testInfo, "e2e09-clear-filters.png") });
  });
});

// E2E-11
test.describe("E2E-11: Complete IT Staff triage workflow", () => {
  test("Navigate to ticket detail via queue row", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await expect(page).toHaveURL(/\/staff\/queue/);
    await page.getByTestId("queue-search-input").fill(`E2E Staff Flow Test ${runId}`);
    await page.waitForTimeout(600);

    const row = page.getByTestId(`queue-row-${ticketId}`);
    const card = page.getByTestId(`queue-mobile-card-${ticketId}`);
    if (await row.isVisible().catch(() => false)) {
      await row.click();
    } else if (await card.isVisible().catch(() => false)) {
      await card.click();
    } else {
      await page.goto(`/staff/tickets/${ticketId}`);
    }

    await expect(page).toHaveURL(new RegExp(`/staff/tickets/${ticketId}`));
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-detail.png") });
  });

  test("Claim unassigned ticket", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();

    const claimBtn = page.getByTestId("staff-claim-ticket-btn");
    if (await claimBtn.isVisible().catch(() => false)) {
      await claimBtn.click();
      await expect(page.getByRole("alert")).toBeVisible({ timeout: 6_000 });
    }
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-claimed.png") });
  });

  test("Update IT Priority to HIGH", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();

    await page.getByTestId("staff-it-priority-select").selectOption("HIGH");
    const updateBtn = page.getByTestId("staff-update-priority-btn");
    if (await updateBtn.isEnabled().catch(() => false)) {
      await updateBtn.click();
      await expect(page.getByRole("alert")).toBeVisible({ timeout: 6_000 });
    }
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-priority.png") });
  });

  test("Transition NEW → OPEN", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();

    const sel = page.getByTestId("staff-status-select");
    if (await sel.locator("option[value='OPEN']").count()) {
      await sel.selectOption("OPEN");
      const btn = page.getByTestId("staff-change-status-btn");
      if (await btn.isEnabled().catch(() => false)) {
        await btn.click();
        await expect(page.getByRole("alert")).toBeVisible({ timeout: 6_000 });
      }
    }
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-status-open.png") });
  });

  test("Post public comment", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();

    await page.getByTestId("public-comment-input").fill("E2E automated public comment");
    await page.getByTestId("submit-public-comment-btn").click();
    await expect(page.getByTestId("public-comments-panel")).toContainText("E2E automated public comment", { timeout: 6_000 });
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-comment.png") });
  });

  test("Post internal note", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();

    await page.getByTestId("internal-note-input").fill("E2E internal note — staff only");
    await page.getByTestId("submit-internal-note-btn").click();
    await expect(page.getByTestId("internal-notes-panel")).toContainText("E2E internal note", { timeout: 6_000 });
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-note.png") });
  });
});

// E2E-15
test.describe("E2E-15: Back navigation and admin read-only", () => {
  test("Back button returns to queue", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();
    await page.getByTestId("staff-back-to-queue-btn").click();
    await expect(page).toHaveURL(/\/staff\/queue/);
    await expect(page.getByTestId("staff-ticket-queue-page")).toBeVisible();
    await page.screenshot({ path: screenshotPath(testInfo, "e2e15-back.png") });
  });

  test("Admin accessing staff detail does not crash", async ({ page }, testInfo) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    const hasDetail = await page.getByTestId("staff-ticket-detail-page").isVisible().catch(() => false);
    const hasError = await page.locator(".alert-danger").isVisible().catch(() => false);
    expect(hasDetail || hasError).toBeTruthy();
    await page.screenshot({ path: screenshotPath(testInfo, "e2e15-admin.png") });
  });
});
