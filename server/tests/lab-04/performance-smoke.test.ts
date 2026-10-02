import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { requireTestEnvironment } from "../../src/config/testEnvironment.js";
import { sessionHeaders } from "../helpers/session.js";

describe("PERF-L4-01: dashboard performance with 500 tickets / 1000 actions", () => {
  const p = getPrisma();
  const users: number[] = [];
  let requesterId: number, staffId: number;
  let requesterHeaders: Record<string, string>, staffHeaders: Record<string, string>;
  const statuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED", "RESOLVED", "CLOSED", "CANCELLED"] as const;

  beforeAll(async () => {
    requireTestEnvironment();
    const suffix = randomUUID();
    for (const role of ["REQUESTER", "IT_STAFF"] as const) {
      const user = await p.user.create({ data: { name: `Performance ${role}`, email: `perf-${role}-${suffix}@test.local`, role, mustChangePassword: false } });
      users.push(user.id);
    }
    [requesterId, staffId] = users;
    requesterHeaders = await sessionHeaders(requesterId);
    staffHeaders = await sessionHeaders(staffId);
    const category = await p.category.findFirstOrThrow();
    const system = await p.relatedSystem.findFirstOrThrow();
    await p.ticket.createMany({ data: Array.from({ length: 500 }, (_, i) => ({
      ticketNo: `PERF-${suffix}-${i}`, summary: `Performance ticket ${i}`, description: "Isolated performance fixture",
      requesterId, categoryId: category.id, relatedSystemId: system.id,
      requestedPriority: "MEDIUM" as const, itPriority: (["HIGH", "MEDIUM", "LOW"] as const)[i % 3],
      currentStatus: statuses[i % statuses.length], ticketOwnerId: i % 2 ? staffId : null,
    })) });
    const tickets = await p.ticket.findMany({ where: { requesterId }, orderBy: { id: "asc" }, select: { id: true } });
    expect(tickets).toHaveLength(500);
    await p.actionTaken.createMany({ data: tickets.flatMap((ticket, i) => [0, 1].map(j => {
      const status = (["COMPLETED", "PENDING", "CANCELLED"] as const)[(i * 2 + j) % 3];
      return { ticketId: ticket.id, createdById: staffId, performedById: status === "COMPLETED" ? staffId : null,
        assigneeId: staffId, status, actionDescription: `Performance action ${i}-${j}`,
        result: status === "COMPLETED" ? "Completed diagnostic work" : null };
    })) });
    expect(await p.actionTaken.count({ where: { ticket: { requesterId } } })).toBe(1000);
  }, 60000);

  afterAll(async () => {
    if (requesterId) await p.ticket.deleteMany({ where: { requesterId } });
    await p.session.deleteMany({ where: { userId: { in: users } } });
    await p.user.deleteMany({ where: { id: { in: users } } });
  });

  it.each(["staff", "requester"] as const)("%s: 5 warm-ups + 50 samples, p95 < 200ms", async role => {
    const headers = role === "staff" ? staffHeaders : requesterHeaders;
    const sample = async () => {
      const started = performance.now();
      const response = await request(app).get(`/api/dashboard/${role}`).set(headers);
      const elapsed = performance.now() - started;
      expect(response.status).toBe(200);
      expect(response.body.metrics).toBeDefined();
      return elapsed;
    };
    for (let i = 0; i < 5; i++) await sample();
    const samples: number[] = [];
    for (let i = 0; i < 50; i++) samples.push(await sample());
    const sorted = [...samples].sort((a, b) => a - b);
    const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
    console.log("PERF-L4-01", JSON.stringify({ role, fixtureTickets: 500, fixtureActions: 1000, warmups: 5,
      samples: samples.length, p95Ms: p95, maxMs: sorted.at(-1), sampleMs: samples }));
    expect(p95, `${role} p95 response latency`).toBeLessThan(200);
  }, 60000);
});
