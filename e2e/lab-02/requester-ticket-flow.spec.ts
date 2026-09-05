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

let cachedFixture: TestFixture | null = null;
const createdTicketIds: number[] = [];
const prisma = new PrismaClient();

// Dynamic fixture setup: queries active requester, creates a ticket with long summary and long attachment filename
async function getOrCreateTestFixture(request: APIRequestContext): Promise<TestFixture> {
  if (cachedFixture) {
    return cachedFixture;
  }

  // 1. Fetch active requesters and reference data from API
  const reqRes = await request.get("http://localhost:3000/api/requesters/active");
  expect(reqRes.ok()).toBe(true);
  const requesters = await reqRes.json();
  const activeRequester = requesters.find((r: any) => r.isActive) || requesters[0];
  expect(activeRequester).toBeDefined();

  const catRes = await request.get("http://localhost:3000/api/categories");
  expect(catRes.ok()).toBe(true);
  const categories = await catRes.json();
  const activeCategory = categories.find((c: any) => c.isActive) || categories[0];

  const sysRes = await request.get("http://localhost:3000/api/related-systems");
  expect(sysRes.ok()).toBe(true);
  const systems = await sysRes.json();
  const activeSystem = systems.find((s: any) => s.isActive) || systems[0];

  // 2. Create a dedicated test ticket with a long summary (<= 100 chars per BR-09)
  const longSummary = "RESP-03 Polish Ticket with Long Summary Testing Text Wrapping and Layout Integrity";
  const createRes = await request.post("http://localhost:3000/api/tickets", {
    headers: {
      "X-Requester-Id": String(activeRequester.id),
    },
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
  const uploadRes = await request.post(`http://localhost:3000/api/tickets/${createdTicket.id}/attachments`, {
    headers: {
      "X-Requester-Id": String(activeRequester.id),
    },
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
    const testTickets = await prisma.ticket.findMany({
      where: {
        OR: [
          { id: { in: createdTicketIds } },
          { summary: "RESP-03 Polish Ticket with Long Summary Testing Text Wrapping and Layout Integrity" },
        ],
      },
      select: { id: true },
    });
    const idsToDelete = testTickets.map((t) => t.id);
    if (idsToDelete.length > 0) {
      const attachments = await prisma.attachment.findMany({
        where: { ticketId: { in: idsToDelete } },
        select: { storedFileName: true },
      });
      const possibleDirs = [
        path.resolve(process.cwd(), "server", "uploads"),
        path.resolve(process.cwd(), "uploads"),
      ];
      for (const att of attachments) {
        if (att.storedFileName) {
          for (const dir of possibleDirs) {
            const filePath = path.join(dir, att.storedFileName);
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch {}
            }
          }
        }
      }
      await prisma.attachment.deleteMany({
        where: { ticketId: { in: idsToDelete } },
      });
      await prisma.ticket.deleteMany({
        where: { id: { in: idsToDelete } },
      });
    }
  } catch (err) {
    console.warn("Test cleanup warning:", err);
  } finally {
    await prisma.$disconnect();
  }
});

// Inject requester session into localStorage before page load
async function injectRequester(page: Page, requester: TestFixture["requester"]) {
  await page.addInitScript((req) => {
    window.localStorage.setItem("toktickit_current_requester", JSON.stringify(req));
  }, requester);
}

// Helper to ensure screenshot directory exists
function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
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
    const ctPath = `artifacts/lab-02/screenshots/create-ticket/${proj}.png`;
    ensureDir(ctPath);
    await page.screenshot({ path: ctPath, fullPage: true });

    // 2. My Tickets
    await page.goto("/my-tickets");
    await page.waitForSelector(".card-zen");
    const mtPath = `artifacts/lab-02/screenshots/my-tickets/${proj}.png`;
    ensureDir(mtPath);
    await page.screenshot({ path: mtPath, fullPage: true });

    // 3. Requester Ticket Detail
    await page.goto(`/tickets/${fixture.ticketId}`);
    await page.waitForSelector(".card-zen");
    const tdPath = `artifacts/lab-02/screenshots/ticket-detail/${proj}.png`;
    ensureDir(tdPath);
    await page.screenshot({ path: tdPath, fullPage: true });
  });
});
