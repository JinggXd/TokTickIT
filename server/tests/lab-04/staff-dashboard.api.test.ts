import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { Prisma } from "@prisma/client";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionHeaders } from "../helpers/session.js";

describe("F3 staff/admin dashboard (API-L4-29/30/31/33a)", () => {
  const p = getPrisma();
  let staff: any, admin: any, req: any;
  let hs: Record<string, string>, ha: Record<string, string>, hr: Record<string, string>;
  const tickets: number[] = [], actions: number[] = [];
  beforeAll(async () => {
    staff = await p.user.findFirstOrThrow({ where: { email: "staff1@example.com" } });
    admin = await p.user.findFirstOrThrow({ where: { email: "admin@example.com" } });
    req = await p.user.findFirstOrThrow({ where: { email: "jennifer.a@example.com" } });
    hs = await sessionHeaders(staff.id); ha = await sessionHeaders(admin.id); hr = await sessionHeaders(req.id);
    const category = await p.category.findFirstOrThrow(), system = await p.relatedSystem.findFirstOrThrow();
    const suffix = Date.now();
    const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"] as const;
    for (let i = 0; i < statuses.length; i++) {
      const t = await p.ticket.create({ data: { ticketNo: `DSTAFF-${suffix}-${i}`, summary: `Queue ${i}`, description: "Do not leak this", requesterId: req.id, categoryId: category.id, relatedSystemId: system.id, requestedPriority: "LOW", itPriority: i % 3 === 0 ? "HIGH" : "LOW", currentStatus: statuses[i], ticketOwnerId: i % 2 ? staff.id : null } });
      tickets.push(t.id);
    }
    for (let i = 0; i < 7; i++) {
      const a = await p.actionTaken.create({ data: { ticketId: tickets[0], actionDescription: `Personal action ${i}`, result: "Done", createdById: staff.id, performedById: staff.id, assigneeId: admin.id, status: "COMPLETED", actionDateTime: new Date(Date.now() - 1000) } });
      actions.push(a.id);
    }
    const a = await p.actionTaken.create({ data: { ticketId: tickets[0], actionDescription: "Assigned to staff but done by admin", createdById: admin.id, performedById: admin.id, assigneeId: staff.id, result: "Done" } });
    actions.push(a.id);
  });
  afterAll(async () => { await p.ticket.deleteMany({ where: { id: { in: tickets } } }); });
  it("API-L4-29: metrics equal independent SQL; urgent rows and actions have stable order and limits", async () => {
    const res = await request(app).get("/api/dashboard/staff").set(hs);
    expect(res.status).toBe(200);
    const [sql]: any[] = await p.$queryRaw(Prisma.sql`SELECT
      count(*) FILTER (WHERE "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED') AND "ticketOwnerId" IS NULL)::int AS unassigned,
      count(*) FILTER (WHERE "currentStatus" NOT IN ('CLOSED','CANCELLED') AND "ticketOwnerId" = ${staff.id})::int AS mine,
      count(*) FILTER (WHERE "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED'))::int AS open,
      count(*) FILTER (WHERE "currentStatus" = 'WAITING_FOR_REQUESTER')::int AS waiting FROM "Ticket"`);
    expect(res.body.metrics).toMatchObject({ unassignedTickets: sql.unassigned, myAssignedTickets: sql.mine, openQueueTickets: sql.open, ticketsWaitingForRequester: sql.waiting });
    expect(res.body.metrics.myActionsTakenCount).toBe(await p.actionTaken.count({ where: { performedById: staff.id, status: "COMPLETED" } }));
    const statusRows: any[] = await p.$queryRaw`SELECT "currentStatus", count(*)::int AS n FROM "Ticket" GROUP BY "currentStatus"`;
    const priorityRows: any[] = await p.$queryRaw`SELECT "itPriority", count(*)::int AS n FROM "Ticket" WHERE "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED') GROUP BY "itPriority"`;
    for (const row of statusRows) expect(res.body.metrics.ticketsByStatus[row.currentStatus]).toBe(row.n);
    for (const row of priorityRows) expect(res.body.metrics.ticketsByPriority[row.itPriority]).toBe(row.n);
    // D05 defines the priority strip over open tickets, excluding resolved/closed/cancelled.
    expect(Object.values(res.body.metrics.ticketsByPriority).reduce((sum: number, count: any) => sum + count, 0)).toBe(sql.open);
    const ids: any[] = await p.$queryRaw`SELECT id FROM "Ticket" WHERE "currentStatus" IN ('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED') ORDER BY ("itPriority" = 'HIGH') DESC, "updatedAt" DESC, id DESC LIMIT 5`;
    expect(res.body.recentOrUrgentTickets.map((t: any) => t.id)).toEqual(ids.map(t => t.id));
    expect(res.body.myRecentActions.map((a: any) => a.id)).toEqual(actions.slice(0, 7).reverse().slice(0, 5));
    expect(JSON.stringify(res.body)).not.toContain("Do not leak this");
    expect(Object.keys(res.body.myRecentActions[0]).sort()).toEqual(["id", "ticketId", "ticketNo", "actionDescription", "status", "actionDateTime"].sort());
  });
  it("API-L4-30: admin gets staff metrics plus all user count/role breakdowns", async () => {
    const res = await request(app).get("/api/dashboard/admin").set(ha);
    expect(res.status).toBe(200);
    expect(res.body.userMetrics.totalUsers).toBe(await p.user.count());
    expect(res.body.userMetrics.activeUsers).toBe(await p.user.count({ where: { isActive: true } }));
    expect(res.body.userMetrics.inactiveUsers).toBe(await p.user.count({ where: { isActive: false } }));
    for (const role of ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const) expect(res.body.userMetrics.usersByRole[role]).toBe(await p.user.count({ where: { role } }));
    expect(res.body.staffMetrics.myActionsTakenCount).toBe(await p.actionTaken.count({ where: { performedById: admin.id, status: "COMPLETED" } }));
    expect((await request(app).get("/api/dashboard/staff").set(ha)).status).toBe(200);
  });
  it("API-L4-31: anonymous and foreign roles cannot access dashboards", async () => {
    for (const role of ["requester", "staff", "admin"]) expect((await request(app).get(`/api/dashboard/${role}`)).status).toBe(401);
    for (const path of ["staff", "admin"]) expect((await request(app).get(`/api/dashboard/${path}`).set(hr)).status).toBe(403);
    expect((await request(app).get("/api/dashboard/requester").set(hs)).status).toBe(403);
    expect((await request(app).get("/api/dashboard/admin").set(hs)).status).toBe(403);
  });
  it("API-L4-33a: Staff and Admin dashboard counts match all four queue drill-downs", async () => {
    for (const headers of [hs, ha]) {
      const dash = await request(app).get("/api/dashboard/staff").set(headers);
      expect(dash.status).toBe(200);
      for (const [query, key] of [["owner=unassigned&statusGroup=open", "unassignedTickets"], ["owner=me&statusGroup=active", "myAssignedTickets"], ["statusGroup=open", "openQueueTickets"], ["status=WAITING_FOR_REQUESTER", "ticketsWaitingForRequester"]]) {
        const list = await request(app).get(`/api/staff/tickets?${query}`).set(headers);
        expect(list.status).toBe(200); expect(list.body.pagination.total).toBe(dash.body.metrics[key]);
      }
    }
    expect((await request(app).get("/api/staff/tickets?statusGroup=invalid").set(hs)).status).toBe(400);
    expect((await request(app).patch(`/api/staff/tickets/${tickets[0]}/status`).set(ha).send({ status: "OPEN", expectedVersion: 1 })).status).toBe(403);
  });
});
