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
const runId = process.env.TOKTICKIT_TEST_RUN_ID || `playwright-resgate-${Date.now()}`;
const SCREENSHOT_BASE = process.env.SCREENSHOT_DIR || path.resolve("artifacts", "lab-04", "screenshots", runId);

function screenshotPath(testInfo: TestInfo, filename: string): string {
  const dir = path.join(SCREENSHOT_BASE, testInfo.project.name);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, filename);
}

const createdUserIds: number[] = [];
const createdTicketIds: number[] = [];

const STAFF_EMAIL = `staff-resgate-${runId}@test.local`;
const PASS = "StaffTest123!";

let staffId: number;
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
      name: "Sam IT Staff",
      email: STAFF_EMAIL,
      passwordHash: hash,
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: false,
      department: "Network Operations",
    },
  });
  staffId = staff.id;
  createdUserIds.push(staffId);

  const requester = await prisma.user.create({
    data: {
      name: "Dave Requester",
      email: `req-resgate-${runId}@test.local`,
      passwordHash: hash,
      role: "REQUESTER",
      isActive: true,
      mustChangePassword: false,
      department: "Marketing",
    },
  });
  createdUserIds.push(requester.id);

  let cat = await prisma.category.findFirst({ where: { isActive: true } });
  if (!cat) cat = await prisma.category.create({ data: { name: `Cat ${runId}`, isActive: true } });
  let sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  if (!sys) sys = await prisma.relatedSystem.create({ data: { name: `Sys ${runId}`, isActive: true } });

  // Create ticket in IN_PROGRESS with staff assigned and 0 actions taken
  const ticket = await prisma.ticket.create({
    data: {
      ticketNo: `TKT-RES-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`,
      summary: `E2E Resolution Gate Enforcement ${runId}`,
      description: "Testing resolution gate requiring completed action",
      requestedPriority: "MEDIUM",
      itPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
      requesterId: requester.id,
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

test.describe("Phase F2 / L4-P06: Resolution Gate Enforcement (E2E-L4-02)", () => {
  test("E2E-L4-02: Ticket cannot be resolved without completed Action Taken; resolution succeeds after completing action", async ({ page }, testInfo) => {
    // 1. Staff logs in and navigates to the ticket detail page
    await loginAs(page, STAFF_EMAIL);
    await page.goto(`/staff/tickets/${ticketId}`);
    await expect(page.getByTestId("staff-ticket-detail-page")).toBeVisible({ timeout: 10_000 });

    // 2. Attempt to resolve with ZERO actions taken (Should be BLOCKED by BR-12)
    const statusSelect = page.getByTestId("staff-status-select");
    await expect(statusSelect.locator("option[value='RESOLVED']")).toHaveCount(1);
    await statusSelect.selectOption("RESOLVED");

    const changeStatusBtn = page.getByTestId("staff-change-status-btn");
    await expect(changeStatusBtn).toBeEnabled();
    await changeStatusBtn.click();

    // In confirmation modal, confirm transition
    const confirmBtn = page.getByTestId("confirm-status-transition-btn");
    await expect(confirmBtn).toBeVisible({ timeout: 6_000 });
    await confirmBtn.click();

    // Assert 422 Resolution Gate error banner appears in the modal
    const modalError = page.getByTestId("status-modal-error");
    await expect(modalError).toBeVisible({ timeout: 6_000 });
    await expect(modalError).toContainText(
      "Ticket resolution requires at least one completed Action Taken and no pending actions."
    );

    await page.screenshot({ path: screenshotPath(testInfo, "e2e-l4-02-resolution-blocked-422.png") });

    // Dismiss the status confirmation modal
    await page.getByRole("button", { name: /^Cancel$/i }).click();
    await expect(page.getByText("Confirm Status Change")).not.toBeVisible();

    // 3. Log a completed Action Taken to fulfill BR-12
    const logBtn = page.getByRole("button", { name: /\+ Log Action/i });
    await expect(logBtn).toBeVisible();
    await logBtn.click();

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 6_000 });
    // Mode is COMPLETED by default; fill description and result
    await page.locator("#log-action-desc").fill("Conducted port loopback test and replaced transceiver module");
    await page.locator("#log-action-result").fill("Signal levels nominal (-3.2dBm), link stable at 10Gbps");
    await page.getByRole("button", { name: /Save Action/i }).click();

    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 6_000 });
    await expect(page.getByText("Conducted port loopback test and replaced transceiver module").filter({ visible: true })).toBeVisible({ timeout: 6_000 });

    // 4. Attempt to resolve AGAIN (Should now SUCCEED)
    await statusSelect.selectOption("RESOLVED");
    await changeStatusBtn.click();

    await expect(confirmBtn).toBeVisible({ timeout: 6_000 });
    await confirmBtn.click();

    // Assert resolution succeeds
    await expect(page.locator(".alert-success")).toBeVisible({ timeout: 6_000 });
    await expect(page.getByTestId("status-modal-error")).not.toBeVisible();
    await expect(page.locator("[data-testid='status-badge-RESOLVED'], .badge:has-text('Resolved')").filter({ visible: true })).toBeVisible({ timeout: 6_000 });

    await page.screenshot({ path: screenshotPath(testInfo, "e2e-l4-02-resolution-succeeded.png") });
  });
});
