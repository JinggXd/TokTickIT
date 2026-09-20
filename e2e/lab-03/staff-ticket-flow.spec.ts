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
  const emailInput = page.getByTestId("login-email-input");
  if (!(await emailInput.isVisible().catch(() => false))) {
    const signOutBtn = page.getByTestId("sign-out-button");
    if (await signOutBtn.isVisible().catch(() => false)) {
      await signOutBtn.click();
      await page.waitForURL((url) => url.pathname.endsWith("/login"), { timeout: 15_000 }).catch(() => {});
    } else {
      await page.goto("/login");
    }
  }
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-password-input").fill(password);
  await page.getByTestId("login-submit-button").click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15_000 });
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
      ticketNo: `TKT-E2E-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
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
  if (createdTicketIds.length > 0) {
    await prisma.internalNote.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
    await prisma.publicComment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
    await prisma.attachment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
  }
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
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
    // Explicitly assert that the created ticket IS found in the queue search results (AC-24)
    // Filter visible element to prevent Playwright strict mode violation between desktop table row and mobile card
    const visibleItem = page
      .getByTestId(`queue-row-${ticketId}`)
      .or(page.getByTestId(`queue-mobile-card-${ticketId}`))
      .filter({ visible: true });
    await expect(visibleItem).toBeVisible({ timeout: 8_000 });
    await expect(visibleItem).toContainText(`E2E Staff Flow Test ${runId}`);
    await page.screenshot({ path: screenshotPath(testInfo, "e2e09-queue-search.png") });
  });

  test("Status filter NEW shows queue", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await expect(page).toHaveURL(/\/staff\/queue/);
    await page.getByTestId("queue-status-filter").selectOption("NEW");
    await page.waitForTimeout(500);
    // Explicitly assert that the newly created ticket in status NEW is present in the visible viewport
    const visibleItem = page
      .getByTestId(`queue-row-${ticketId}`)
      .or(page.getByTestId(`queue-mobile-card-${ticketId}`))
      .filter({ visible: true });
    await expect(visibleItem).toBeVisible({ timeout: 8_000 });
    await expect(visibleItem).toContainText(`E2E Staff Flow Test ${runId}`);
    await page.screenshot({ path: screenshotPath(testInfo, "e2e09-status-filter.png") });
  });

  test("Non-matching search shows no-results state", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await expect(page).toHaveURL(/\/staff\/queue/);
    await page.getByTestId("queue-search-input").fill(`ZZZZ_NONE_${runId}`);
    await page.waitForTimeout(600);
    await expect(page.locator("[data-testid='staff-queue-no-results'], [data-testid='staff-queue-empty']").filter({ visible: true }).first()).toBeVisible({ timeout: 8_000 });
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

    // Assert the ticket is visible in the search results and click directly from queue without bypass
    const visibleItem = page
      .getByTestId(`queue-row-${ticketId}`)
      .or(page.getByTestId(`queue-mobile-card-${ticketId}`))
      .filter({ visible: true });
    await expect(visibleItem).toBeVisible({ timeout: 8_000 });
    await expect(visibleItem).toContainText(`E2E Staff Flow Test ${runId}`);
    await visibleItem.click();

    await expect(page).toHaveURL(new RegExp(`/staff/tickets/${ticketId}`));
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-detail.png") });
  });

  test("Claim unassigned ticket", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();

    const claimBtn = page.getByTestId("staff-claim-ticket-btn");
    await expect(claimBtn).toBeVisible();
    await claimBtn.click();
    await expect(page.locator(".alert-success, [role='alert']")).toBeVisible({ timeout: 6_000 });
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-claimed.png") });
  });

  test("Update IT Priority to HIGH", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();

    await page.getByTestId("staff-it-priority-select").selectOption("HIGH");
    const updateBtn = page.getByTestId("staff-update-priority-btn");
    await expect(updateBtn).toBeEnabled();
    await updateBtn.click();
    await expect(page.locator(".alert-success, [role='alert']")).toBeVisible({ timeout: 6_000 });
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-priority.png") });
  });

  test("Transition NEW → OPEN", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();

    const sel = page.getByTestId("staff-status-select");
    await expect(sel.locator("option[value='OPEN']")).toHaveCount(1);
    await sel.selectOption("OPEN");
    const btn = page.getByTestId("staff-change-status-btn");
    await expect(btn).toBeEnabled();
    await btn.click();
    await expect(page.locator(".alert-success, [role='alert']")).toBeVisible({ timeout: 6_000 });
    await expect(page.locator(".badge:has-text('OPEN'), [data-testid='status-badge-OPEN']").first()).toBeVisible();
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

  test("Transition OPEN → IN_PROGRESS", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();

    const sel = page.getByTestId("staff-status-select");
    await expect(sel.locator("option[value='IN_PROGRESS']")).toHaveCount(1);
    await sel.selectOption("IN_PROGRESS");
    const btn = page.getByTestId("staff-change-status-btn");
    await expect(btn).toBeEnabled();
    await btn.click();
    await expect(page.locator(".alert-success, [role='alert']")).toBeVisible({ timeout: 6_000 });
    await expect(page.locator("[data-testid='status-badge-IN_PROGRESS'], .badge:has-text('In Progress')").first()).toBeVisible();
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-status-in-progress.png") });
  });

  test("Switch to Requester view: verify IN_PROGRESS, public comments visible, internal notes hidden, flag appears resolved", async ({ page }, testInfo) => {
    await loginAs(page, REQUESTER_EMAIL);
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByTestId("public-comments-panel")).toBeVisible({ timeout: 8_000 });

    // Verify Requester sees status IN_PROGRESS
    await expect(page.locator("[data-testid='status-badge-IN_PROGRESS'], .badge:has-text('In Progress')").first()).toBeVisible();

    // Verify Public Comments panel contains the staff comment
    await expect(page.getByTestId("public-comments-panel")).toContainText("E2E automated public comment");

    // Verify Internal Notes panel is NOT visible to Requester (AC-30, BR-08)
    await expect(page.getByTestId("internal-notes-panel")).toHaveCount(0);

    // Verify Staff operations panel is NOT visible to Requester (BR-09)
    await expect(page.getByTestId("staff-operations-panel")).toHaveCount(0);

    // Requester flags "Problem Appears Resolved" (BR-17)
    const arBtn = page.getByTestId("appears-resolved-btn");
    await expect(arBtn).toBeVisible();
    await arBtn.click();
    await expect(page.getByTestId("appears-resolved-banner")).toBeVisible({ timeout: 6_000 });
    await expect(page.getByTestId("appears-resolved-banner")).toContainText("You indicated this problem appears resolved");

    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-requester-in-progress.png") });
  });

  test("Transition IN_PROGRESS → RESOLVED via confirmation modal", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();

    const sel = page.getByTestId("staff-status-select");
    await expect(sel.locator("option[value='RESOLVED']")).toHaveCount(1);
    await sel.selectOption("RESOLVED");
    const btn = page.getByTestId("staff-change-status-btn");
    await expect(btn).toBeEnabled();
    await btn.click();

    // Confirm modal for RESOLVED transition (CONFIRMATION_STATUSES)
    const confirmBtn = page.getByTestId("confirm-status-transition-btn");
    await expect(confirmBtn).toBeVisible({ timeout: 6_000 });
    await confirmBtn.click();

    await expect(page.locator(".alert-success, [role='alert']")).toBeVisible({ timeout: 6_000 });
    await expect(page.locator("[data-testid='status-badge-RESOLVED'], .badge:has-text('Resolved')").first()).toBeVisible();
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-status-resolved.png") });
  });

  test("Switch to Requester view: verify RESOLVED status and confidentiality", async ({ page }, testInfo) => {
    await loginAs(page, REQUESTER_EMAIL);
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByTestId("public-comments-panel")).toBeVisible({ timeout: 8_000 });

    // Verify Requester sees status RESOLVED
    await expect(page.locator("[data-testid='status-badge-RESOLVED'], .badge:has-text('Resolved')").first()).toBeVisible();

    // Verify Internal Notes remain hidden
    await expect(page.getByTestId("internal-notes-panel")).toHaveCount(0);
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-requester-resolved.png") });
  });

  test("Transition RESOLVED → CLOSED via confirmation modal", async ({ page }, testInfo) => {
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();

    const sel = page.getByTestId("staff-status-select");
    await expect(sel.locator("option[value='CLOSED']")).toHaveCount(1);
    await sel.selectOption("CLOSED");
    const btn = page.getByTestId("staff-change-status-btn");
    await expect(btn).toBeEnabled();
    await btn.click();

    // Confirm modal for CLOSED transition (CONFIRMATION_STATUSES)
    const confirmBtn = page.getByTestId("confirm-status-transition-btn");
    await expect(confirmBtn).toBeVisible({ timeout: 6_000 });
    await confirmBtn.click();

    await expect(page.locator(".alert-success, [role='alert']")).toBeVisible({ timeout: 6_000 });
    await expect(page.locator("[data-testid='status-badge-CLOSED'], .badge:has-text('Closed')").first()).toBeVisible();
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-status-closed.png") });
  });

  test("Switch to Requester view: verify CLOSED status and terminal restrictions", async ({ page }, testInfo) => {
    await loginAs(page, REQUESTER_EMAIL);
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByTestId("public-comments-panel")).toBeVisible({ timeout: 8_000 });

    // Verify Requester sees status CLOSED
    await expect(page.locator("[data-testid='status-badge-CLOSED'], .badge:has-text('Closed')").first()).toBeVisible();

    // Verify appears-resolved button is NOT available on CLOSED tickets (BR-17)
    await expect(page.getByTestId("appears-resolved-btn")).toHaveCount(0);

    // Verify Internal Notes remain hidden
    await expect(page.getByTestId("internal-notes-panel")).toHaveCount(0);
    await page.screenshot({ path: screenshotPath(testInfo, "e2e11-requester-closed.png") });
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

  test("Admin read-only view of ticket detail (AC-28, AC-37, E2E-15)", async ({ page }, testInfo) => {
    await loginAs(page, ADMIN_EMAIL);
    await page.goto(`/admin/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible();
    await expect(page.getByTestId("staff-detail-ticket-no")).toBeVisible();
    await expect(page.getByText(`E2E Staff Flow Test ${runId}`)).toBeVisible();
    // Verify operational actions panel is NOT visible for Admin (read-only per AC-28, AC-37, ui-spec §10.2)
    await expect(page.getByTestId("staff-operations-panel")).toHaveCount(0);
    // Verify comment and note input forms are NOT visible for Admin (read-only)
    await expect(page.getByTestId("public-comment-input")).toHaveCount(0);
    await expect(page.getByTestId("internal-note-input")).toHaveCount(0);
    // Verify comments and notes threads are visible and readable by Admin
    await expect(page.getByTestId("public-comments-panel")).toBeVisible();
    await expect(page.getByTestId("internal-notes-panel")).toBeVisible();
    await page.screenshot({ path: screenshotPath(testInfo, "e2e15-admin-readonly.png") });
  });
});
