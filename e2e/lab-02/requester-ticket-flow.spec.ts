import crypto from "node:crypto";
import { hash } from "../../server/node_modules/argon2/argon2.cjs";
import { test, expect, Page, APIRequestContext } from "@playwright/test";
import path from "path";
import fs from "fs";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";

interface TestFixture {
  requester: {
    id: number;
    name: string;
    email: string;
    department: string;
    isActive: boolean;
  };
  ticketId: number;
  ticketNo: string;
  attachmentFileName: string;
}

import {
  resolveApiBase,
  assertContained,
  cleanupAttachmentFiles,
} from "../../server/src/config/testEnvironment.js";

let cachedFixture: TestFixture | null = null;
const createdTicketIds: number[] = [];

const API_BASE = resolveApiBase();
// Lab 3 requirement: never overwrite Lab 2 screenshots. Default strictly to run-specific directory under artifacts/lab-03/screenshots/
const runId = process.env.TOKTICKIT_TEST_RUN_ID || `run-${Date.now()}`;
const SCREENSHOT_BASE = process.env.SCREENSHOT_DIR
  ? process.env.SCREENSHOT_DIR
  : path.resolve("artifacts", "lab-03", "screenshots", runId);

const testDbUrl = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
if (process.env.TOKTICKIT_TEST_MODE === "true" && testDbUrl) {
  try {
    const dbName = decodeURIComponent(new URL(testDbUrl).pathname.replace(/^\//, ""));
    if (!/^toktickit_test(?:_[a-z0-9_]+)?$/i.test(dbName)) {
      throw new Error("E2E worker refusing to run against non-test database: " + dbName);
    }
  } catch (err: any) {
    if (err.message && err.message.startsWith("E2E worker refusing")) throw err;
  }
}
const prisma = new PrismaClient(
  testDbUrl ? { datasources: { db: { url: testDbUrl } } } : undefined,
);

const fixturePassword = 'E2EFixturePassword2026!';
const fixtureUsers: TestFixture['requester'][] = [];
async function getFixtureUsers() {
  if (fixtureUsers.length) return fixtureUsers;
  const passwordHash = await hash(fixturePassword, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
  for (const name of ['Requester A', 'Requester B']) {
    const user = await prisma.user.create({ data: {
      name, email: crypto.randomUUID() + '@e2e.example.com', department: 'E2E',
      passwordHash, mustChangePassword: false, role: 'REQUESTER',
    } });
    fixtureUsers.push(user);
  }
  return fixtureUsers;
}
async function apiHeaders(request: APIRequestContext, id: number) {
  const user = (await getFixtureUsers()).find(u => u.id === id)!;
  const login = await request.post(API_BASE + '/api/auth/login', {
    headers: { Origin: 'http://localhost:5174' }, data: { email: user.email, password: fixturePassword },
  });
  expect(login.status()).toBe(200);
  const cookie = login.headers()['set-cookie'].split(';')[0];
  const csrf = await request.get(API_BASE + '/api/auth/csrf', { headers: { Cookie: cookie } });
  expect(csrf.status()).toBe(200);
  return { Cookie: cookie, Origin: 'http://localhost:5174', 'X-CSRF-Token': (await csrf.json()).csrfToken };
}

// Dynamic fixture setup: queries active requester, creates a ticket with long summary and long attachment filename
async function getOrCreateTestFixture(request: APIRequestContext): Promise<TestFixture> {
  if (cachedFixture) {
    return cachedFixture;
  }

  const activeRequester = (await getFixtureUsers())[0];
  const catRes = await request.get(`${API_BASE}/api/categories`, { headers: await apiHeaders(request, (await getFixtureUsers())[0].id) });
  expect(catRes.ok()).toBe(true);
  const categories = await catRes.json();
  const activeCategory = categories.find((c: any) => c.isActive) || categories[0];

  const sysRes = await request.get(`${API_BASE}/api/related-systems`, { headers: await apiHeaders(request, (await getFixtureUsers())[0].id) });
  expect(sysRes.ok()).toBe(true);
  const systems = await sysRes.json();
  const activeSystem = systems.find((s: any) => s.isActive) || systems[0];

  // 2. Create a dedicated test ticket with a long summary (<= 100 chars per BR-09)
  const longSummary = "RESP-03 Polish Ticket with Long Summary Testing Text Wrapping and Layout Integrity";
  const createRes = await request.post(`${API_BASE}/api/tickets`, {
    headers: await apiHeaders(request, activeRequester.id),
    data: {
      summary: longSummary,
      description: "Detailed description verifying responsive rules, no clipped labels, proper padding, and centered alignment.",
      categoryId: activeCategory.id,
      relatedSystemId: activeSystem.id,
      requestedPriority: "MEDIUM",
    },
  });
  if (!createRes.ok()) {
    console.error("Create ticket failed:", await createRes.text());
  }
  expect(createRes.ok()).toBe(true);
  const createdTicket = await createRes.json();
  createdTicketIds.push(createdTicket.id);

  // 3. Upload an attachment with a long filename to verify ellipsis truncation and title attribute
  const longAttachmentName = "very_long_attachment_filename_testing_ellipsis_truncation_spec.pdf";
  const dummyPdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
  const uploadRes = await request.post(`${API_BASE}/api/tickets/${createdTicket.id}/attachments`, {
    headers: await apiHeaders(request, activeRequester.id),
    multipart: {
      file: {
        name: longAttachmentName,
        mimeType: "application/pdf",
        buffer: dummyPdf,
      },
    },
  });
  expect(uploadRes.ok()).toBe(true);

  cachedFixture = {
    requester: activeRequester,
    ticketId: createdTicket.id,
    ticketNo: createdTicket.ticketNo,
    attachmentFileName: longAttachmentName,
  };

  return cachedFixture;
}

// Cleanup fixture tickets and physical files after worker finishes tests
test.afterAll(async () => {
  try {
    if (createdTicketIds.length > 0) {
      const attachments = await prisma.attachment.findMany({
        where: { ticketId: { in: createdTicketIds } },
        select: { storedFileName: true },
      });

      const testUploadsRoot = path.resolve(process.cwd(), "server", "test-uploads");
      const runId = process.env.TOKTICKIT_TEST_RUN_ID;
      if (!runId) {
        throw new Error("TOKTICKIT_TEST_RUN_ID is required for test fixture cleanup.");
      }
      const runSpecificDir = path.resolve(testUploadsRoot, runId);

      // Perform strict containment cleanup using shared helper; throws visibly on containment or unlink failure
      cleanupAttachmentFiles(
        runSpecificDir,
        testUploadsRoot,
        attachments.map((a) => a.storedFileName),
      );

      await prisma.attachment.deleteMany({
        where: { ticketId: { in: createdTicketIds } },
      });
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
    await prisma.user.deleteMany({ where: { id: { in: fixtureUsers.map(u => u.id) } } });
  } finally {
    await prisma.$disconnect();
  }
});

// Authenticate through the real UI; no development selector or storage injection.
async function injectRequester(page: Page, requester: TestFixture["requester"]) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(requester.email);
  await page.locator('#login-password').fill(fixturePassword);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL('**/my-tickets');
  await expect(page.getByTestId('user-profile-name')).toHaveText(requester.name);
}

// Helper to ensure screenshot directory exists
function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureCleanScreenshot(page: Page, filePath: string) {
  ensureDir(filePath);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  await page.screenshot({ path: filePath, fullPage: true });
}

// Helper to verify no element has unintended text clipping / overflow
// Only allows text-overflow if it has an intentional ellipsis WITH an accessible way to read the full text (title/aria-label)
async function checkNoClippedElements(page: Page): Promise<void> {
  const clipped = await page.evaluate(() => {
    const candidates = Array.from(
      document.querySelectorAll("label, h1, h2, h3, .card-title, .form-label, .table thead th, .badge, td, p, .fw-semibold, .fw-bold")
    );
    const errors: string[] = [];
    for (const el of candidates) {
      if (el.getBoundingClientRect().width === 0 && el.getBoundingClientRect().height === 0) {
        continue;
      }
      const style = window.getComputedStyle(el);
      if (el.scrollWidth > el.clientWidth + 2) {
        if (style.overflowX === "auto" || style.overflowX === "scroll") {
          continue;
        }
        const hasEllipsis = style.textOverflow === "ellipsis" || el.classList.contains("text-truncate");
        const titleAttr = el.getAttribute("title") || el.closest("[title]")?.getAttribute("title") || el.getAttribute("aria-label");
        const hasAccessibleFullName = !!titleAttr && titleAttr.trim().length > 0;

        if (!hasEllipsis || !hasAccessibleFullName) {
          errors.push(
            `${el.tagName}.${el.className}: "${el.textContent?.trim().slice(0, 30)}" (scrollWidth: ${el.scrollWidth} > clientWidth: ${el.clientWidth}, hasEllipsis: ${hasEllipsis}, hasTitle: ${hasAccessibleFullName})`
          );
        }
      }
    }
    return errors;
  });
  expect(clipped).toEqual([]);
}

test.describe("Phase 7 — Responsive Layout Tests (RESP-01, RESP-02, RESP-03 per tests.md)", () => {
  // RESP-01 — AC-19: My Tickets at < 768px (Mobile)
  test("RESP-01: My Tickets at <768px replaces table with card list, buttons full width, and has zero horizontal scroll", async ({ page, request }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    const fixture = await getOrCreateTestFixture(request);
    await injectRequester(page, fixture.requester);

    // 1. My Tickets Screen
    await page.goto("/my-tickets");
    await page.waitForSelector(".card.card-zen");

    // Desktop/Tablet table must be hidden (.d-none.d-md-block)
    const tableContainer = page.locator(".d-none.d-md-block");
    await expect(tableContainer).toBeHidden();

    // Mobile card list must be visible (.d-block.d-md-none)
    const mobileCards = page.locator(".d-block.d-md-none");
    await expect(mobileCards).toBeVisible();

    const cards = mobileCards.locator(".card.card-zen");
    expect(await cards.count()).toBeGreaterThan(0);

    // Verify zero page-level horizontal scrollbar
    const mtScrollOk = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(mtScrollOk).toBe(true);

    // 2. Create Ticket Screen: buttons are full width on mobile (< 768px)
    await page.goto("/create-ticket");
    await page.waitForSelector("#category-select");

    const submitBtn = page.locator("button[type='submit']");
    const cancelBtn = page.locator("button:has-text('Cancel')");
    const submitBox = await submitBtn.boundingBox();
    const cancelBox = await cancelBtn.boundingBox();
    expect(submitBox).not.toBeNull();
    expect(cancelBox).not.toBeNull();

    // Both buttons should be full width (close to viewport width minus container padding)
    expect(submitBox!.width).toBeGreaterThan(300);
    expect(cancelBox!.width).toBeGreaterThan(300);

    // Buttons stacked vertically on mobile
    expect(Math.abs(submitBox!.x - cancelBox!.x)).toBeLessThan(10);
    expect(cancelBox!.y).toBeGreaterThan(submitBox!.y);

    // Mobile navigation items must meet touch target requirement (>= 44px)
    const mobileNavBtn = page.locator("[data-testid='nav-my-tickets-mobile']");
    const navBtnBox = await mobileNavBtn.boundingBox();
    expect(navBtnBox).not.toBeNull();
    expect(navBtnBox!.height).toBeGreaterThanOrEqual(44);

    const ctScrollOk = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(ctScrollOk).toBe(true);
  });

  // RESP-02 — AC-19: Create Ticket at 768–991px (Tablet)
  test("RESP-02: Create Ticket at 768–991px shows two-column classification fields while Summary/Description remain full width, and My Tickets shows compact table", async ({ page, request }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    const fixture = await getOrCreateTestFixture(request);
    await injectRequester(page, fixture.requester);

    // 1. Create Ticket Screen
    await page.goto("/create-ticket");
    await page.waitForSelector("#category-select");
    await page.waitForFunction(() => {
      const sel = document.querySelector("#category-select") as HTMLSelectElement | null;
      return !!sel && sel.options.length > 1;
    });

    const categorySelect = page.locator("#category-select");
    const systemSelect = page.locator("#system-select");
    const catBox = await categorySelect.boundingBox();
    const sysBox = await systemSelect.boundingBox();
    expect(catBox).not.toBeNull();
    expect(sysBox).not.toBeNull();

    // In a 2-column layout, Category and Related System are side by side (similar Y, distinct X)
    expect(Math.abs(catBox!.y - sysBox!.y)).toBeLessThan(15);
    expect(sysBox!.x).toBeGreaterThan(catBox!.x);

    // Summary and Description remain full width
    const summaryInput = page.locator("#summary-input");
    const descTextarea = page.locator("#description-input");
    const summaryBox = await summaryInput.boundingBox();
    const descBox = await descTextarea.boundingBox();
    expect(summaryBox).not.toBeNull();
    expect(descBox).not.toBeNull();
    expect(summaryBox!.width).toBeGreaterThan(catBox!.width * 1.5);
    expect(descBox!.width).toBeGreaterThan(catBox!.width * 1.5);

    // Verify buttons are NOT full-width on tablet (w-md-auto takes effect)
    const submitBtn = page.locator("button[type='submit']");
    const submitBox = await submitBtn.boundingBox();
    expect(submitBox).not.toBeNull();
    expect(submitBox!.width).toBeLessThan(250);

    const ctScrollOk = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(ctScrollOk).toBe(true);

    // 2. My Tickets Screen: on tablet (768-991px), table is VISIBLE and card list is HIDDEN
    await page.goto("/my-tickets");
    await page.waitForSelector(".card.card-zen");

    const tableContainer = page.locator(".d-none.d-md-block");
    await expect(tableContainer).toBeVisible();

    const mobileCards = page.locator(".d-block.d-md-none");
    await expect(mobileCards).toBeHidden();

    // Verify .table-responsive wraps table and page-level has no horizontal scroll
    const tableResponsive = page.locator(".table-responsive");
    await expect(tableResponsive).toBeVisible();

    const mtScrollOk = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    expect(mtScrollOk).toBe(true);
  });

  // RESP-03 — AC-19: All three screens at ≥ 992px (Desktop)
  test("RESP-03: All three screens at ≥992px center content with max width 1200px, no clipped text, and handle long content", async ({ page, request }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    const fixture = await getOrCreateTestFixture(request);
    await injectRequester(page, fixture.requester);

    const viewportWidth = 1280;

    // --- Screen 1: My Tickets ---
    await page.goto("/my-tickets");
    await page.waitForSelector(".d-none.d-md-block table");

    await expect(page.locator(".d-none.d-md-block")).toBeVisible();
    await expect(page.locator(".d-block.d-md-none")).toBeHidden();

    const mtContainer = page.locator(".container").first();
    const mtBox = await mtContainer.boundingBox();
    expect(mtBox).not.toBeNull();
    expect(mtBox!.width).toBeLessThanOrEqual(1200);

    // Strict Centering Verification (left margin equals right margin)
    const mtLeftMargin = mtBox!.x;
    const mtRightMargin = viewportWidth - (mtBox!.x + mtBox!.width);
    expect(Math.abs(mtLeftMargin - mtRightMargin)).toBeLessThanOrEqual(2);

    await checkNoClippedElements(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // --- Screen 2: Create Ticket ---
    await page.goto("/create-ticket");
    await page.waitForSelector("#category-select");

    const ctContainer = page.locator(".container").first();
    const ctBox = await ctContainer.boundingBox();
    expect(ctBox).not.toBeNull();
    expect(ctBox!.width).toBeLessThanOrEqual(1200);

    const ctLeftMargin = ctBox!.x;
    const ctRightMargin = viewportWidth - (ctBox!.x + ctBox!.width);
    expect(Math.abs(ctLeftMargin - ctRightMargin)).toBeLessThanOrEqual(2);

    // Verify buttons are NOT full-width on desktop (w-md-auto takes effect)
    const ctSubmitBtn = page.locator("button[type='submit']");
    const ctSubmitBox = await ctSubmitBtn.boundingBox();
    expect(ctSubmitBox).not.toBeNull();
    expect(ctSubmitBox!.width).toBeLessThan(250);

    await checkNoClippedElements(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    // --- Screen 3: Ticket Detail ---
    await page.goto(`/tickets/${fixture.ticketId}`);
    await page.waitForSelector(".card-zen");

    const dtContainer = page.locator(".container").first();
    const dtBox = await dtContainer.boundingBox();
    expect(dtBox).not.toBeNull();
    expect(dtBox!.width).toBeLessThanOrEqual(1200);

    const dtLeftMargin = dtBox!.x;
    const dtRightMargin = viewportWidth - (dtBox!.x + dtBox!.width);
    expect(Math.abs(dtLeftMargin - dtRightMargin)).toBeLessThanOrEqual(2);

    await checkNoClippedElements(page);

    // Verify Summary textarea displays full text without clipping
    const summaryTextarea = page.locator("textarea.form-control").first();
    await expect(summaryTextarea).toBeVisible();
    const summaryVal = await summaryTextarea.inputValue();
    expect(summaryVal).toContain("RESP-03 Polish Ticket with Long Summary");

    // Verify Attachment item displays long filename with text-truncate and title attribute
    const attachmentSpan = page.locator(".text-truncate", { hasText: "very_long_attachment_filename" });
    await expect(attachmentSpan).toBeVisible();
    const titleAttr = await attachmentSpan.getAttribute("title");
    expect(titleAttr).toBe(fixture.attachmentFileName);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});

test.describe("Phase 7 — Visual Inspection Screenshot Captures (Project-Isolated)", () => {
  test("Capture 3 screenshots for current viewport project (desktop, tablet, or mobile)", async ({ page, request }, testInfo) => {
    const proj = testInfo.project.name; // 'desktop' | 'tablet' | 'mobile'
    const fixture = await getOrCreateTestFixture(request);
    await injectRequester(page, fixture.requester);

    // 1. Create Ticket
    await page.goto("/create-ticket");
    await page.waitForSelector("#category-select");
    await page.waitForFunction(() => {
      const sel = document.querySelector("#category-select") as HTMLSelectElement | null;
      return !!sel && sel.options.length > 1;
    });
    const ctPath = `${SCREENSHOT_BASE}/create-ticket/${proj}.png`;
    await captureCleanScreenshot(page, ctPath);

    // 2. My Tickets
    await page.goto("/my-tickets");
    await page.waitForSelector(".card-zen");
    const mtPath = `${SCREENSHOT_BASE}/my-tickets/${proj}.png`;
    await captureCleanScreenshot(page, mtPath);

    // 3. Requester Ticket Detail
    await page.goto(`/tickets/${fixture.ticketId}`);
    await page.waitForSelector(".card-zen");
    const tdPath = `${SCREENSHOT_BASE}/ticket-detail/${proj}.png`;
    await captureCleanScreenshot(page, tdPath);
  });
});

test.describe("Phase 8 — End-to-End Integration Flows (E2E-01, E2E-02, E2E-03 per tests.md)", () => {
  // E2E-01 (AC-01, AC-02, AC-03, AC-13)
  test("E2E-01: Full happy path — sign in, verify read-only fields, create ticket with attachment, find in My Tickets, sign out and switch account", async ({ page }, testInfo) => {
    const proj = testInfo.project.name;

    const users = await getFixtureUsers();
    const firstReqText = users[0].name;
    await page.goto('/my-tickets');
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    await expect(page.locator('#requester-select')).toHaveCount(0);
    await injectRequester(page, users[0]);

    // Step 3: Navigate to Create Ticket screen
    const navCreate = page.locator("[data-testid='nav-create-ticket']:visible, [data-testid='nav-create-ticket-mobile']:visible").first();
    await navCreate.click();
    await page.waitForURL("**/create-ticket");
    await page.waitForSelector("#category-select");

    // Step 4: Verify AC-03 read-only system and requester fields
    const headerInputs = page.locator(".card form .row.g-3").first().locator("input[readonly]");
    await expect(headerInputs.nth(0)).toHaveValue("Assigned on save (will be assigned on save)");
    await expect(headerInputs.nth(1)).toHaveValue("Assigned on save (will be assigned on save)");
    const reqValue = await headerInputs.nth(2).inputValue();
    expect(firstReqText).toContain(reqValue.split(" (")[0]);

    // Step 5: Fill form with valid fields and stage attachment
    await page.waitForFunction(() => {
      const cat = document.querySelector("#category-select") as HTMLSelectElement | null;
      const sys = document.querySelector("#system-select") as HTMLSelectElement | null;
      return !!cat && cat.options.length > 1 && !!sys && sys.options.length > 1;
    });

    const uniqueSummary = `E2E-01 Happy Path Ticket ${Date.now()}`;
    await page.fill("#summary-input", uniqueSummary);
    await page.fill("#description-input", "Detailed description for E2E-01 happy path ticket verifying creation and requester isolation.");
    await page.selectOption("#priority-select", "HIGH");

    // Stage valid attachment
    const dummyPdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
    await page.setInputFiles("[data-testid='attachment-input']", {
      name: "e2e_happy_attachment.pdf",
      mimeType: "application/pdf",
      buffer: dummyPdf,
    });
    await expect(page.locator("text=e2e_happy_attachment.pdf")).toBeVisible();

    // Capture Step 2 screenshot
    const shot2 = `${SCREENSHOT_BASE}/e2e/02-create-ticket-form-${proj}.png`;
    await captureCleanScreenshot(page, shot2);

    // Step 6: Submit Ticket and verify Success screen
    const createResPromise = page.waitForResponse(
      (res) => res.url().includes("/api/tickets") && res.request().method() === "POST"
    );
    await page.click("button[type='submit']");
    const createRes = await createResPromise;
    if (createRes.ok()) {
      const data = await createRes.json();
      if (data.id && !createdTicketIds.includes(data.id)) {
        createdTicketIds.push(data.id);
      }
    }
    await page.waitForSelector("[data-testid='success-ticket-no']");

    const createdTicketNo = (await page.locator("[data-testid='success-ticket-no']").textContent())?.trim();
    expect(createdTicketNo).toMatch(/^TKT-\d{4}-\d{6}$/);

    const successRequester = await page.locator("[data-testid='success-requester']").textContent();
    expect(firstReqText).toContain(successRequester?.split(" (")[0] || "");

    await expect(page.locator("text=e2e_happy_attachment.pdf")).toBeVisible();

    // Track ticket ID for cleanup (backup)
    const dbTicket = await prisma.ticket.findUnique({ where: { ticketNo: createdTicketNo! } });
    if (dbTicket && !createdTicketIds.includes(dbTicket.id)) {
      createdTicketIds.push(dbTicket.id);
    }

    // Capture Step 3 screenshot
    const shot3 = `${SCREENSHOT_BASE}/e2e/03-ticket-created-success-${proj}.png`;
    await captureCleanScreenshot(page, shot3);

    // Step 7: Click View My Tickets and verify ticket appears in list
    const myTicketsResPromise = page.waitForResponse(
      (res) => res.url().includes("/api/tickets") && res.request().method() === "GET" && res.status() === 200
    );
    await page.click("button:has-text('View My Tickets')");
    await page.waitForURL("**/my-tickets");
    await myTicketsResPromise;
    await expect(page.locator("text=Loading your tickets...")).toHaveCount(0);
    await page.waitForSelector(".card-zen");

    if (proj === "mobile") {
      await expect(page.locator(".d-block.d-md-none").getByText(createdTicketNo)).toBeVisible();
      await expect(page.locator(".d-block.d-md-none").getByText(uniqueSummary)).toBeVisible();
    } else {
      await expect(page.locator(".d-none.d-md-block").getByText(createdTicketNo)).toBeVisible();
      await expect(page.locator(".d-none.d-md-block").getByText(uniqueSummary)).toBeVisible();
    }

    // Capture Step 4 screenshot
    const shot4 = `${SCREENSHOT_BASE}/e2e/04-my-tickets-owner-${proj}.png`;
    await captureCleanScreenshot(page, shot4);

    // Switch identity through logout/login, then wait for real ticket data.
    await page.getByTestId('sign-out-button').click();
    await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    const switchedTicketsResPromise = page.waitForResponse(
      res => res.url().includes('/api/tickets') && res.request().method() === 'GET' && res.status() === 200
    );
    await injectRequester(page, users[1]);
    await switchedTicketsResPromise;
    await expect(page.getByText('Loading your tickets...')).toHaveCount(0);

    // Verify Jennifer's ticket is NOT present in Sarah's My Tickets list
    await expect(page.locator(`text=${createdTicketNo}`)).toHaveCount(0);
    await expect(page.locator(`text=${uniqueSummary}`)).toHaveCount(0);

    // Capture Step 5 screenshot
    const shot5 = `${SCREENSHOT_BASE}/e2e/05-switched-requester-${proj}.png`;
    await captureCleanScreenshot(page, shot5);
  });

  // E2E-02 (AC-07, BR-11)
  test("E2E-02: Simulated backend failure during ticket submission retains form values", async ({ page, request }, testInfo) => {
    const proj = testInfo.project.name;
    const fixture = await getOrCreateTestFixture(request);
    await injectRequester(page, fixture.requester);

    await page.goto("/create-ticket");
    await page.waitForSelector("#category-select");
    await page.waitForFunction(() => {
      const cat = document.querySelector("#category-select") as HTMLSelectElement | null;
      const sys = document.querySelector("#system-select") as HTMLSelectElement | null;
      return !!cat && cat.options.length > 1 && !!sys && sys.options.length > 1;
    });

    const failedSummary = `E2E-02 Simulated Failure Test ${Date.now()}`;
    const failedDesc = "This description and summary must be strictly retained after a 500 error.";

    await page.fill("#summary-input", failedSummary);
    await page.fill("#description-input", failedDesc);
    await page.selectOption("#priority-select", "HIGH");

    // Stage an attachment
    const dummyPdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
    await page.setInputFiles("[data-testid='attachment-input']", {
      name: "failure_retention_file.pdf",
      mimeType: "application/pdf",
      buffer: dummyPdf,
    });
    await expect(page.locator("text=failure_retention_file.pdf")).toBeVisible();

    // Intercept POST /api/tickets with 500 failure per api-spec.md Section 6.4
    await page.route("**/api/tickets", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Unable to create ticket. Please try again." }),
        });
      } else {
        await route.continue();
      }
    });

    // Click submit
    await page.click("button[type='submit']");

    // Verify safe failure alert appears
    const alert = page.locator(".alert.alert-danger");
    await expect(alert).toBeVisible();
    await expect(alert).toContainText("Unable to create ticket. Please try again.");

    // Verify form values remain intact (BR-11)
    await expect(page.locator("#summary-input")).toHaveValue(failedSummary);
    await expect(page.locator("#description-input")).toHaveValue(failedDesc);
    await expect(page.locator("#priority-select")).toHaveValue("HIGH");
    await expect(page.locator("text=failure_retention_file.pdf")).toBeVisible();

    // Submit button re-enabled
    await expect(page.locator("button[type='submit']")).toBeEnabled();

    // Capture screenshot
    const shot = `${SCREENSHOT_BASE}/e2e/06-backend-failure-retained-${proj}.png`;
    await captureCleanScreenshot(page, shot);

    await page.unroute("**/api/tickets");
  });

  // E2E-03 (AC-08, AC-17, BR-04, BR-08)
  test("E2E-03: Negative security flows — cross-requester direct URL (403) and removed attachment direct download (410)", async ({ page, request }, testInfo) => {
    const proj = testInfo.project.name;

    const [req1, req2] = await getFixtureUsers();
    const catRes = await request.get(`${API_BASE}/api/categories`, { headers: await apiHeaders(request, (await getFixtureUsers())[0].id) });
    const cats = await catRes.json();
    const sysRes = await request.get(`${API_BASE}/api/related-systems`, { headers: await apiHeaders(request, (await getFixtureUsers())[0].id) });
    const syss = await sysRes.json();

    // Part A: Create a ticket owned by Requester 2 (Sarah Johnson)
    const sarahTicketRes = await request.post(`${API_BASE}/api/tickets`, {
      headers: await apiHeaders(request, req2.id),
      data: {
        summary: `E2E-03 Sarah Private Ticket ${Date.now()}`,
        description: "Confidential ticket belonging exclusively to Sarah Johnson.",
        categoryId: cats[0].id,
        relatedSystemId: syss[0].id,
        requestedPriority: "LOW",
      },
    });
    expect(sarahTicketRes.ok()).toBe(true);
    const sarahTicket = await sarahTicketRes.json();
    createdTicketIds.push(sarahTicket.id);

    // As Requester 1 (Jennifer Anderson), attempt direct URL navigation to Sarah's ticket
    await injectRequester(page, req1);
    await page.goto(`/tickets/${sarahTicket.id}`);
    await page.waitForSelector(".card-zen");

    // Verify safe 403 Access Denied UI
    await expect(page.locator("text=Access Denied")).toBeVisible();
    await expect(page.locator("text=You do not own this ticket and cannot view its details.")).toBeVisible();
    await expect(page.locator(`text=${sarahTicket.summary}`)).toHaveCount(0);

    const shotA = `${SCREENSHOT_BASE}/e2e/07-cross-requester-403-${proj}.png`;
    await captureCleanScreenshot(page, shotA);

    // Click Return to My Tickets
    await page.click("button:has-text('Return to My Tickets')");
    await page.waitForURL("**/my-tickets");

    // Part B: Direct URL download of a soft-removed attachment (410 Gone)
    // Create a ticket owned by Requester 1 (Jennifer Anderson)
    const jenniferTicketRes = await request.post(`${API_BASE}/api/tickets`, {
      headers: await apiHeaders(request, req1.id),
      data: {
        summary: `E2E-03 Jennifer Attachment Ticket ${Date.now()}`,
        description: "Ticket to verify 410 Gone on removed attachment direct download.",
        categoryId: cats[0].id,
        relatedSystemId: syss[0].id,
        requestedPriority: "MEDIUM",
      },
    });
    expect(jenniferTicketRes.ok()).toBe(true);
    const jenniferTicket = await jenniferTicketRes.json();
    createdTicketIds.push(jenniferTicket.id);

    // Upload an attachment
    const dummyPdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
    const uploadRes = await request.post(`${API_BASE}/api/tickets/${jenniferTicket.id}/attachments`, {
      headers: await apiHeaders(request, req1.id),
      multipart: {
        file: {
          name: "e2e_removed_file.pdf",
          mimeType: "application/pdf",
          buffer: dummyPdf,
        },
      },
    });
    expect(uploadRes.ok()).toBe(true);
    const uploadedAtt = await uploadRes.json();

    // Navigate to ticket detail as owner while attachment is still active
    await page.goto(`/tickets/${jenniferTicket.id}`);
    await page.waitForSelector(".card-zen");

    // Verify attachment is initially active with Download and Remove buttons
    await expect(page.locator("text=e2e_removed_file.pdf")).toBeVisible();
    const downloadBtn = page.locator("button:has-text('Download')");
    await expect(downloadBtn).toBeVisible();
    await expect(page.locator("button:has-text('Remove')")).toBeVisible();
    await expect(page.locator("span.badge:has-text('Unavailable')")).toHaveCount(0);

    // Concurrently soft-remove the attachment on the server via API (stale UI simulation)
    const removeRes = await request.delete(`${API_BASE}/api/attachments/${uploadedAtt.id}`, {
      headers: await apiHeaders(request, req1.id),
      data: { removalReason: "Soft-removed for E2E-03 verification" },
    });
    expect(removeRes.ok()).toBe(true);

    // Click Download from the stale UI — browser receives 410 Gone and dynamically transitions
    const download410Promise = page.waitForResponse(
      (res) => res.url().includes(`/api/attachments/${uploadedAtt.id}/download`) && res.status() === 410
    );
    await downloadBtn.click();
    const download410Res = await download410Promise;
    expect(download410Res.status()).toBe(410);

    // Verify UI dynamically updates to Unavailable state without page refresh (AC-17, BR-08)
    await expect(page.locator("button:has-text('Download')")).toHaveCount(0);
    await expect(page.locator("button:has-text('Remove')")).toHaveCount(0);
    await expect(page.locator("span.badge:has-text('Unavailable')")).toBeVisible();
    await expect(page.locator("text=Removal reason:")).toBeVisible();

    // Direct download API request by owner returns 410 Gone per api-spec.md Section 6.8
    const dlRes = await request.get(`${API_BASE}/api/attachments/${uploadedAtt.id}/download`, {
      headers: await apiHeaders(request, req1.id),
    });
    expect(dlRes.status()).toBe(410);
    const dlBody = await dlRes.json();
    expect(dlBody.error).toContain("This attachment has been removed and cannot be downloaded");

    // Direct download API request by non-owner returns 403 Forbidden per api-spec.md Section 6.8
    const crossDlRes = await request.get(`${API_BASE}/api/attachments/${uploadedAtt.id}/download`, {
      headers: await apiHeaders(request, req2.id),
    });
    expect(crossDlRes.status()).toBe(403);
    const crossBody = await crossDlRes.json();
    expect(crossBody.error).toContain("Access denied: You do not own this attachment");

    const shotB = `${SCREENSHOT_BASE}/e2e/08-removed-attachment-410-${proj}.png`;
    await captureCleanScreenshot(page, shotB);
  });
});
