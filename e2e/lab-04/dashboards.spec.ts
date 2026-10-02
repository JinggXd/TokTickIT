import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { PrismaClient } from "../../server/node_modules/@prisma/client/index.js";
import { hashPassword } from "../../server/src/utils/password.js";

const db = process.env.DATABASE_URL_TEST;
if (!db || !/^toktickit_test(?:_[a-z0-9_]+)?$/i.test(decodeURIComponent(new URL(db).pathname.slice(1)))) throw new Error("A verified disposable database is required.");
const prisma = new PrismaClient({ datasources: { db: { url: db } } });
const run = `${process.env.TOKTICKIT_TEST_RUN_ID}-${process.pid}`;
const ids: number[] = [], tickets: number[] = [];
const users: Record<string, { id: number; email: string; name: string }> = {};
const password = "DashboardTest123!";
const api = "http://localhost:3001";

async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByTestId("login-email-input").fill(users[role].email);
  await page.getByTestId("login-password-input").fill(password);
  await page.getByTestId("login-submit-button").click();
  await page.waitForURL(role === "IT_STAFF" ? "**/staff/dashboard" : role === "ADMINISTRATOR" ? "**/admin/dashboard" : "**/dashboard");
  await expect(page.getByTestId("dashboard-page")).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}
test.beforeAll(async () => {
  const passwordHash = await hashPassword(password);
  for (const role of ["REQUESTER", "IT_STAFF", "ADMINISTRATOR", "EMPTY"] as const) {
    const u = await prisma.user.create({ data: { email: `dash-${role}-${run}@test.local`, name: `Dashboard ${role}`, role: role === "EMPTY" ? "REQUESTER" : role, passwordHash, isActive: true, mustChangePassword: false, department: "Test" } });
    ids.push(u.id); users[role] = u;
  }
  const category = await prisma.category.findFirstOrThrow(), system = await prisma.relatedSystem.findFirstOrThrow();
  const statuses = ["NEW", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "CANCELLED", "OPEN", "REOPENED"] as const;
  for (let i = 0; i < statuses.length; i++) {
    const ticket = await prisma.ticket.create({ data: { ticketNo: `DASH-${run}-${i}`, summary: `Dashboard fixture ${i}`, description: "Safe owned ticket", currentStatus: statuses[i], requestedPriority: "MEDIUM", itPriority: i % 2 ? "HIGH" : "LOW", requesterId: users.REQUESTER.id, ticketOwnerId: i % 2 ? users.IT_STAFF.id : null, categoryId: category.id, relatedSystemId: system.id } });
    tickets.push(ticket.id);
  }
  await prisma.actionTaken.create({ data: { ticketId: tickets[1], actionDescription: "Dashboard performer feed", result: "Device works", createdById: users.ADMINISTRATOR.id, performedById: users.IT_STAFF.id, assigneeId: users.ADMINISTRATOR.id, status: "COMPLETED" } });
});
test.afterAll(async () => {
  await prisma.ticket.deleteMany({ where: { id: { in: tickets } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
});

for (const role of ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"]) test(`F3 ${role}: card/list parity, URL reload/Back, detail links and responsive layout`, async ({ page }, info) => {
  await login(page, role); await noOverflow(page);
  const endpoint = role === "REQUESTER" ? "requester" : role === "IT_STAFF" ? "staff" : "admin";
  const res = await page.request.get(`${api}/api/dashboard/${endpoint}`); expect(res.status()).toBe(200); const data = await res.json();
  const metrics = role === "ADMINISTRATOR" ? data.staffMetrics : data.metrics;
  const keys = role === "REQUESTER" ? ["totalOpenTickets", "ticketsWaitingForRequester", "recentlyUpdatedTicketsCount", "recentlyResolvedTicketsCount"] : ["unassignedTickets", "myAssignedTickets", "openQueueTickets", "ticketsWaitingForRequester"];
  const shotDir = path.join(process.env.SCREENSHOT_DIR!, info.project.name);
  fs.mkdirSync(shotDir, { recursive: true }); await page.screenshot({ path: path.join(shotDir, `f3-${role.toLowerCase()}.png`), fullPage: true });
  for (let i = 0; i < keys.length; i++) {
    const card = page.getByTestId(`dashboard-metric-${i}`); await expect(card.locator("strong")).toHaveText(String(metrics[keys[i]]));
    const href = (await card.getAttribute("href"))!;
    const response = page.waitForResponse(r => r.url().includes(role === "REQUESTER" ? "/api/tickets?" : "/api/staff/tickets?") && r.status() === 200);
    await card.click(); const list = await (await response).json();
    expect(new URL(page.url()).pathname + new URL(page.url()).search).toBe(href);
    expect(role === "REQUESTER" ? list.pagination.totalItems : list.pagination.total).toBe(metrics[keys[i]]);
    await noOverflow(page); await page.reload();
    await expect(page.getByTestId(role === "REQUESTER" ? "my-tickets-page" : "staff-ticket-queue-page")).toBeVisible();
    await page.goBack(); await expect(page.getByTestId("dashboard-page")).toBeVisible();
  }
  if (role !== "REQUESTER") {
    await expect(page.getByTestId("status-breakdown").locator(":scope > span")).toHaveCount(8);
    await expect(page.getByTestId("priority-breakdown").locator(":scope > span")).toHaveCount(3);
    expect(Object.values(metrics.ticketsByPriority).reduce((sum: number, count: any) => sum + count, 0)).toBe(metrics.openQueueTickets);
    if (role === "IT_STAFF") { await expect(page.getByText("Dashboard performer feed")).toBeVisible(); await expect(page.getByTestId("dashboard-metric-4").locator("strong")).toHaveText("1"); }
    else { await expect(page.getByText("User Directory Summary")).toBeVisible(); await expect(page.getByTestId("dashboard-metric-4").locator("strong")).toHaveText("0"); }
  }
  const ticketLink = page.getByTestId("dashboard-page").locator("a").filter({ has: page.locator("strong") }).filter({ hasText: "DASH-" }).first();
  await ticketLink.click(); await expect(page).toHaveURL(new RegExp(role === "REQUESTER" ? "/tickets/\\d+$" : role === "IT_STAFF" ? "/staff/tickets/\\d+$" : "/admin/tickets/\\d+$"));
  await expect(page.getByTestId("actions-taken-section")).toBeVisible();
  if (role === "ADMINISTRATOR") {
    await expect(page.getByTestId("staff-operations-panel")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "+ Log Action", exact: true })).toBeVisible();
  }
});

test("F3 review fix: all roles keyboard home/card navigation and visible focus", async ({ page }) => {
  for (const role of ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"]) {
    await page.context().clearCookies();
    await login(page, role);
    const home = role === "REQUESTER" ? "/dashboard" : role === "IT_STAFF" ? "/staff/dashboard" : "/admin/dashboard";
    const brand = page.getByRole("link", { name: /TokTickIT/ });
    await expect(brand).toHaveAttribute("href", home);
    await page.keyboard.press("Tab");
    await brand.focus(); await expect(brand).toBeFocused();
    expect(await brand.evaluate(element => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(3);
    await page.keyboard.press("Enter"); await expect(page).toHaveURL(new RegExp(`${home}$`));
    const card = page.getByTestId("dashboard-metric-0");
    const href = (await card.getAttribute("href"))!;
    await card.focus(); await expect(card).toBeFocused();
    expect(await card.evaluate(element => parseFloat(getComputedStyle(element).outlineWidth))).toBeGreaterThanOrEqual(3);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
    await noOverflow(page);
    await brand.focus(); await page.keyboard.press("Enter"); await expect(page).toHaveURL(new RegExp(`${home}$`));
  }
});

test("F3 empty account, zero-result drill-down, Clear Filters and account switching", async ({ page }) => {
  await login(page, "REQUESTER"); await page.getByTestId("sign-out-button").click(); await page.waitForURL("**/login");
  await login(page, "EMPTY"); await expect(page.getByText("No recent tickets yet.")).toBeVisible();
  for (let i = 0; i < 4; i++) await expect(page.getByTestId(`dashboard-metric-${i}`).locator("strong")).toHaveText("0");
  await expect(page.getByText("Dashboard fixture 7")).toHaveCount(0);
  await page.getByTestId("dashboard-metric-3").click(); await expect(page.getByText("No tickets match your filters")).toBeVisible();
  await page.getByRole("button", { name: "Clear Filters", exact: true }).first().click(); expect(new URL(page.url()).search).toBe("");
  await expect(page.getByText("No tickets submitted yet")).toBeVisible(); await noOverflow(page);
});

test("F3 network failure hides metrics, Retry restores real dashboard", async ({ page }) => {
  await page.route("**/api/dashboard/requester", route => route.abort());
  await page.goto("/login"); await page.getByTestId("login-email-input").fill(users.REQUESTER.email); await page.getByTestId("login-password-input").fill(password); await page.getByTestId("login-submit-button").click();
  await page.waitForURL("**/dashboard"); await expect(page.getByRole("alert")).toBeVisible(); await expect(page.getByTestId("dashboard-metric-0")).toHaveCount(0);
  await page.unroute("**/api/dashboard/requester"); await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByTestId("dashboard-metric-0").locator("strong")).toHaveText("5"); await noOverflow(page);
});
