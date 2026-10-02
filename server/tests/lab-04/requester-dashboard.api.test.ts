import { beforeAll, afterAll, describe, it, expect, vi } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionHeaders } from "../helpers/session.js";

describe("F3 requester dashboard (API-L4-27/28/32/33b)", () => {
  const p = getPrisma();
  const now = new Date();
  const cutoff = now.getTime() - 7 * 86400000;
  const users: number[] = [], tickets: number[] = [];
  let headers: Record<string, string>, emptyHeaders: Record<string, string>;
  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const u = await p.user.create({ data: { name: `Dashboard requester ${i}`, email: `dash-req-${i}-${suffix}@test.local`, role: "REQUESTER", isActive: true, mustChangePassword: false } });
      users.push(u.id);
    }
    headers = await sessionHeaders(users[0]); emptyHeaders = await sessionHeaders(users[1]);
    const category = await p.category.findFirstOrThrow(), system = await p.relatedSystem.findFirstOrThrow();
    const statuses = ["NEW", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "CANCELLED", "REOPENED", "IN_PROGRESS", "OPEN", "RESOLVED"] as const;
    for (let i = 0; i < statuses.length; i++) {
      const updatedAt = new Date(i === 0 || i === 8 ? cutoff - 1000 : i === 1 ? cutoff : i === 2 ? cutoff + 1000 : now);
      const t = await p.ticket.create({ data: { ticketNo: `DREQ-${suffix}-${i}`, summary: `Owned ${i}`, description: "Private requester fixture", requesterId: users[0], categoryId: category.id, relatedSystemId: system.id, requestedPriority: "HIGH", itPriority: "MEDIUM", currentStatus: statuses[i], updatedAt } });
      tickets.push(t.id);
    }
    const foreign = await p.ticket.create({ data: { ticketNo: `DREQ-${suffix}-foreign`, summary: "Foreign secret", description: "Not visible", requesterId: users[2], categoryId: category.id, relatedSystemId: system.id, requestedPriority: "HIGH", itPriority: "HIGH" } });
    tickets.push(foreign.id);
    vi.spyOn(Date, "now").mockReturnValue(now.getTime());
  });
  afterAll(async () => {
    vi.restoreAllMocks();
    await p.ticket.deleteMany({ where: { id: { in: tickets } } });
    await p.session.deleteMany({ where: { userId: { in: users } } });
    await p.user.deleteMany({ where: { id: { in: users } } });
  });
  it("API-L4-27/28: scopes metrics, includes exact 7-day boundary, limits and orders safe projections", async () => {
    const res = await request(app).get("/api/dashboard/requester").set(headers);
    expect(res.status).toBe(200);
    expect(res.body.metrics).toEqual({ totalOpenTickets: 5, ticketsWaitingForRequester: 1, recentlyUpdatedTicketsCount: 7, recentlyResolvedTicketsCount: 1 });
    expect(res.body.recentTickets.map((t: any) => t.id)).toEqual(tickets.slice(3, 8).reverse());
    expect(Object.keys(res.body.recentTickets[0]).sort()).toEqual(["id", "ticketNo", "summary", "currentStatus", "requestedPriority", "updatedAt"].sort());
    expect(JSON.stringify(res.body)).not.toContain("Foreign secret");
  });
  it("API-L4-32: zero-ticket account receives zero metrics and empty rows", async () => {
    const res = await request(app).get("/api/dashboard/requester").set(emptyHeaders);
    expect(res.status).toBe(200);
    expect(Object.values(res.body.metrics)).toEqual([0, 0, 0, 0]);
    expect(res.body.recentTickets).toEqual([]);
  });
  it("API-L4-33b: each dashboard count equals the drill-down pagination total", async () => {
    const dashboard = await request(app).get("/api/dashboard/requester").set(headers);
    expect(dashboard.status).toBe(200);
    const cases = [["statusGroup=open", "totalOpenTickets"], ["status=WAITING_FOR_REQUESTER", "ticketsWaitingForRequester"], ["recent=7d", "recentlyUpdatedTicketsCount"], ["status=RESOLVED&recent=7d", "recentlyResolvedTicketsCount"]];
    for (const [query, key] of cases) {
      const list = await request(app).get(`/api/tickets?${query}`).set(headers);
      expect(list.status).toBe(200);
      expect(list.body.pagination.totalItems).toBe(dashboard.body.metrics[key]);
    }
  });
  it("rejects invalid/repeated recent and statusGroup filters, and intersects status with group", async () => {
    for (const query of ["recent=30d", "statusGroup=active", "recent=7d&recent=7d", "statusGroup=open&statusGroup=open"]) {
      expect((await request(app).get(`/api/tickets?${query}`).set(headers)).status).toBe(400);
    }
    const intersection = await request(app).get("/api/tickets?status=RESOLVED&statusGroup=open").set(headers);
    expect(intersection.status).toBe(200); expect(intersection.body.pagination.totalItems).toBe(0);
  });
});
