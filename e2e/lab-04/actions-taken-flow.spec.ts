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
const runId = process.env.TOKTICKIT_TEST_RUN_ID || `playwright-actflow-${Date.now()}`;
const SCREENSHOT_BASE = process.env.SCREENSHOT_DIR || path.resolve("artifacts", "lab-04", "screenshots", runId);

function screenshotPath(testInfo: TestInfo, filename: string): string {
  const dir = path.join(SCREENSHOT_BASE, testInfo.project.name);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}

async function verifyModalKeyboard(page: Page) {
  const dialog = page.getByRole("dialog");
  const buttons = dialog.getByRole("button");
  await buttons.last().focus();
  await page.keyboard.press("Tab");
  await expect(buttons.first()).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(buttons.last()).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

async function captureActionsPanel(page: Page, testInfo: TestInfo, filename: string) {
  const destination = screenshotPath(testInfo, filename);
  if (await page.evaluate(() => window.innerWidth < 768)) {
    // Capture from the page top so the sticky mobile header cannot cover the panel.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await page.screenshot({ path: destination, fullPage: true });
  } else {
    await page.getByTestId("actions-taken-section").screenshot({ path: destination });
  }
}

const createdUserIds: number[] = [];
const createdTicketIds: number[] = [];

const STAFF_EMAIL = `staff-actflow-${runId}@test.local`;
const REQUESTER_EMAIL = `req-actflow-${runId}@test.local`;
const PASS = "StaffTest123!";

let staffId: number;
let requesterId: number;
let ticketId: number;

async function loginAs(page: Page, email: string, password = PASS) {
  await page.context().clearCookies();
  await page.goto("/login");
  const emailInput = page.getByTestId("login-email-input");
  await expect(emailInput).toBeVisible({ timeout: 10_000 });
  await emailInput.fill(email);
  await page.getByTestId("login-password-input").fill(password);
  await page.getByTestId("login-submit-button").click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 15_000 });
}

test.beforeAll(async () => {
  fs.mkdirSync(SCREENSHOT_BASE, { recursive: true });
  const hash = await hashPassword(PASS);

  const staff = await prisma.user.create({
    data: {
      name: "Alex IT Staff",
      email: STAFF_EMAIL,
      passwordHash: hash,
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
      department: "IT Support",
    },
  });
  staffId = staff.id;
  createdUserIds.push(staffId);

  const requester = await prisma.user.create({
    data: {
      name: "Rachel Requester",
      email: REQUESTER_EMAIL,
      passwordHash: hash,
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
      department: "Finance",
    },
  });
  requesterId = requester.id;
  createdUserIds.push(requesterId);

  let cat = await prisma.category.findFirst({ where: { isActive: true } });
  if (!cat) cat = await prisma.category.create({ data: { name: `Cat ${runId}`, isActive: true } });
  let sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  if (!sys) sys = await prisma.relatedSystem.create({ data: { name: `Sys ${runId}`, isActive: true } });

  const ticket = await prisma.ticket.create({
    data: {
      ticketNo: `TKT-ACT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      summary: `E2E Action Flow Test ${runId}`,
      description: "Testing end-to-end action logging and lifecycle",
      requestedPriority: "MEDIUM",
      itPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
      requesterId,
      ticketOwnerId: staffId,
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
    await (prisma as any).actionTaken?.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
  }
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  await prisma.$disconnect();
});

test.describe("Phase F2 / L4-P05: Actions Taken Lifecycle Flow (E2E-L4-01)", () => {
  test("E2E-L4-01: Log pending action, assign staff, complete with result, and verify requester read-only view", async ({ page }, testInfo) => {
    // 1. Staff logs in and navigates to ticket detail
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible({ timeout: 10_000 });

    const actionsSection = page.getByTestId("actions-taken-section");
    await expect(actionsSection).toBeVisible();

    // 2. Open Log Action modal
    const logBtn = page.getByRole("button", { name: /\+ Log Action/i });
    await expect(logBtn).toBeVisible();
    await logBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText("Log New Action")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button").first()).toBeFocused();

    // Fill action as PENDING with assignee and follow-up
    await page.locator("label[for='mode-pending']").click();
    await page.locator("#log-action-desc").fill("Investigating core switch uplink flap");
    const assigneeSelect = page.locator("#log-action-assignee");
    await expect(assigneeSelect).toBeVisible();
    await assigneeSelect.selectOption(String(staffId));
    await expect(assigneeSelect).toHaveValue(String(staffId));
    await page.locator("#log-action-followup").check();
    await page.getByPlaceholder("Specify follow-up requirement or deadline...").fill("Verify fiber optics transceiver after 24h");
    await page.getByRole("dialog").getByRole("button").first().focus();
    await page.screenshot({ path: screenshotPath(testInfo, "f4-modal-log-action-top.png") });
    await verifyModalKeyboard(page);
    await page.screenshot({ path: screenshotPath(testInfo, "f4-modal-log-action.png") });

    // Submit modal
    await page.getByRole("button", { name: /Save Action/i }).click();

    // Wait for modal to close
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 6_000 });

    // Assert action appears in timeline with PENDING badge (works on desktop table or mobile cards)
    await expect(page.getByText("Investigating core switch uplink flap").filter({ visible: true })).toBeVisible({ timeout: 6_000 });
    const pendingBadge = page.locator("[data-testid='action-status-badge-PENDING'], .badge:has-text('Pending')").filter({ visible: true });
    await expect(pendingBadge).toBeVisible();

    // 3. Complete the pending action
    // Find visible complete button (works across desktop table row or mobile card)
    const completeBtn = page
      .getByRole("button", { name: /Complete/i })
      .filter({ visible: true })
      .first();
    await expect(completeBtn).toBeVisible({ timeout: 6_000 });
    await completeBtn.click();

    // Complete modal opens
    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText("Complete Action Taken")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button").first()).toBeFocused();

    // Fill result details
    await page.locator("#complete-result").fill("Cleaned LC fiber connector; zero CRC errors recorded");
    await verifyModalKeyboard(page);
    await page.screenshot({ path: screenshotPath(testInfo, "f4-modal-complete-action.png") });
    await page.getByRole("button", { name: /Mark Completed/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 6_000 });

    // Assert action now displays COMPLETED badge and result text
    const completedBadge = page.locator("[data-testid='action-status-badge-COMPLETED'], .badge:has-text('Completed')").filter({ visible: true });
    await expect(completedBadge).toBeVisible({ timeout: 6_000 });
    await expect(page.getByText("Cleaned LC fiber connector; zero CRC errors recorded").filter({ visible: true })).toBeVisible();

    await captureActionsPanel(page, testInfo, "e2e-l4-01-staff-completed.png");

    // Cancellation is verified through the UI with the current action version.
    await logBtn.click();
    await page.locator("label[for='mode-pending']").click();
    await page.locator("#log-action-desc").fill("Spare cable order no longer needed");
    await page.getByRole("button", { name: /Save Action/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await actionsSection.getByRole("button", { name: "Cancel", exact: true }).filter({ visible: true }).last().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByRole("button").first()).toBeFocused();
    await verifyModalKeyboard(page);
    await page.screenshot({ path: screenshotPath(testInfo, "f4-modal-cancel-action.png") });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await actionsSection.getByRole("button", { name: "Cancel", exact: true }).filter({ visible: true }).last().click();
    await page.getByRole("dialog").getByRole("button", { name: /Confirm Cancel/i }).click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await expect(actionsSection.getByText("Cancelled", { exact: false }).filter({ visible: true })).toBeVisible();

    // 4. Switch to Requester view and verify read-only behavior
    await loginAs(page, REQUESTER_EMAIL);
    await page.goto(`/tickets/${ticketId}`);
    await expect(page.getByTestId("actions-taken-section")).toBeVisible({ timeout: 10_000 });

    // Verify action description and result are rendered
    await expect(page.getByText("Investigating core switch uplink flap").filter({ visible: true })).toBeVisible();
    await expect(page.getByText(/Cleaned LC fiber connector/i).filter({ visible: true })).toBeVisible();

    // Assert zero mutation controls exist for Requester
    await expect(page.getByRole("button", { name: /\+ Log Action/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /^Complete$/i })).not.toBeVisible();
    await expect(page.getByRole("button", { name: /^Cancel$/i })).not.toBeVisible();

    await captureActionsPanel(page, testInfo, "e2e-l4-01-requester-readonly.png");
  });
});
