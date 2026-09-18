import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionHeaders } from "../helpers/session.js";
import { requireTestEnvironment } from "../../src/config/testEnvironment.js";

describe("IT Staff Queue API (AC-23, AC-24, AC-25, AC-26, BR-06, BR-12, API-07 to API-10)", () => {
  const prisma = getPrisma();
  let staffUser: any;
  let adminUser: any;
  let requesterUser: any;

  let staffHeaders: Record<string, string>;
  let adminHeaders: Record<string, string>;
  let requesterHeaders: Record<string, string>;

  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    requireTestEnvironment();

    staffUser = await prisma.user.findFirstOrThrow({
      where: { role: "IT_STAFF", isActive: true, email: "staff1@example.com" },
    });
    adminUser = await prisma.user.findFirstOrThrow({
      where: { role: "ADMINISTRATOR", isActive: true, email: "admin@example.com" },
    });
    requesterUser = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", isActive: true, email: "jennifer.a@example.com" },
    });

    staffHeaders = await sessionHeaders(staffUser.id);
    adminHeaders = await sessionHeaders(adminUser.id);
    requesterHeaders = await sessionHeaders(requesterUser.id);
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
  });

  // Helper to create test ticket
  async function createFixture(overrides: Record<string, any> = {}) {
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-QUEUE-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        summary: overrides.summary ?? "Sample Queue Ticket",
        description: overrides.description ?? "Sample Queue Description",
        categoryId: overrides.categoryId ?? category.id,
        relatedSystemId: overrides.relatedSystemId ?? system.id,
        requesterId: overrides.requesterId ?? requesterUser.id,
        requestedPriority: overrides.requestedPriority ?? "MEDIUM",
        itPriority: overrides.itPriority ?? "MEDIUM",
        currentStatus: overrides.currentStatus ?? "NEW",
        ticketOwnerId: overrides.ticketOwnerId ?? null,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  // -------------------------------------------------------------------------
  // API-07: Access Control (AC-23, BR-06)
  // -------------------------------------------------------------------------
  describe("API-07: Access Control", () => {
    it("allows IT_STAFF to access /api/staff/tickets", async () => {
      const res = await request(app).get("/api/staff/tickets").set(staffHeaders);
      expect(res.status).toBe(200);
      expect(res.body.tickets).toBeDefined();
      expect(res.body.unfilteredTotal).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    it("denies REQUESTER with 403 Forbidden", async () => {
      const res = await request(app).get("/api/staff/tickets").set(requesterHeaders);
      expect(res.status).toBe(403);
    });

    it("denies ADMINISTRATOR with 403 Forbidden (Staff-only queue)", async () => {
      const res = await request(app).get("/api/staff/tickets").set(adminHeaders);
      expect(res.status).toBe(403);
    });

    it("denies unauthenticated request with 401", async () => {
      const res = await request(app).get("/api/staff/tickets");
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // API-08: Search & Filters (AC-24, R16)
  // -------------------------------------------------------------------------
  describe("API-08: Search & Multi-Filter Query Engine", () => {
    it("searches case-insensitively by summary or ticket number", async () => {
      const uniqueWord = `Alpha_${Date.now()}`;
      const ticket = await createFixture({ summary: `Printer issue ${uniqueWord}` });

      // Partial lowercase match
      const res = await request(app)
        .get(`/api/staff/tickets?search=${uniqueWord.toLowerCase()}`)
        .set(staffHeaders);

      expect(res.status).toBe(200);
      expect(res.body.tickets.some((t: any) => t.id === ticket.id)).toBe(true);

      // Search by ticketNo
      const res2 = await request(app)
        .get(`/api/staff/tickets?search=${ticket.ticketNo.toLowerCase()}`)
        .set(staffHeaders);

      expect(res2.status).toBe(200);
      expect(res2.body.tickets.some((t: any) => t.id === ticket.id)).toBe(true);
    });

    it("filters by owner: all, me, unassigned, and specific numeric ID", async () => {
      const unassignedTicket = await createFixture({ ticketOwnerId: null });
      const myTicket = await createFixture({ ticketOwnerId: staffUser.id });

      // owner=unassigned
      const unassignedRes = await request(app)
        .get("/api/staff/tickets?owner=unassigned")
        .set(staffHeaders);
      expect(unassignedRes.status).toBe(200);
      expect(unassignedRes.body.tickets.every((t: any) => t.ticketOwner === null)).toBe(true);
      expect(unassignedRes.body.tickets.some((t: any) => t.id === unassignedTicket.id)).toBe(true);

      // owner=me
      const meRes = await request(app)
        .get("/api/staff/tickets?owner=me")
        .set(staffHeaders);
      expect(meRes.status).toBe(200);
      expect(meRes.body.tickets.every((t: any) => t.ticketOwner?.id === staffUser.id)).toBe(true);
      expect(meRes.body.tickets.some((t: any) => t.id === myTicket.id)).toBe(true);

      // owner=<specific id>
      const idRes = await request(app)
        .get(`/api/staff/tickets?owner=${staffUser.id}`)
        .set(staffHeaders);
      expect(idRes.status).toBe(200);
      expect(idRes.body.tickets.every((t: any) => t.ticketOwner?.id === staffUser.id)).toBe(true);
    });

    it("preserves unfilteredTotal count across filtered queries", async () => {
      const allRes = await request(app).get("/api/staff/tickets").set(staffHeaders);
      const totalAll = allRes.body.unfilteredTotal;

      const filteredRes = await request(app)
        .get("/api/staff/tickets?status=NEW")
        .set(staffHeaders);

      expect(filteredRes.status).toBe(200);
      expect(filteredRes.body.unfilteredTotal).toBe(totalAll);
    });

    it("rejects unknown query parameters with 400 Bad Request", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?unknownParam=xyz")
        .set(staffHeaders);

      expect(res.status).toBe(400);
      expect(res.body.details?.unknownParam).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // API-09: Semantic Priority & Status Sorting (AC-25)
  // -------------------------------------------------------------------------
  describe("API-09: Semantic Sorting & Tie-Breaking", () => {
    it("sorts itPriority semantically: desc gives HIGH > MEDIUM > LOW", async () => {
      const tLow = await createFixture({ itPriority: "LOW" });
      const tMed = await createFixture({ itPriority: "MEDIUM" });
      const tHigh = await createFixture({ itPriority: "HIGH" });

      const res = await request(app)
        .get("/api/staff/tickets?sortBy=itPriority&sortOrder=desc&pageSize=50")
        .set(staffHeaders);

      expect(res.status).toBe(200);
      const priorityOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const returned = res.body.tickets;

      for (let i = 0; i < returned.length - 1; i++) {
        const currRank = priorityOrder[returned[i].itPriority];
        const nextRank = priorityOrder[returned[i + 1].itPriority];
        expect(currRank).toBeGreaterThanOrEqual(nextRank);
      }
    });

    it("sorts itPriority semantically: asc gives LOW > MEDIUM > HIGH", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?sortBy=itPriority&sortOrder=asc&pageSize=50")
        .set(staffHeaders);

      expect(res.status).toBe(200);
      const priorityOrder: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };
      const returned = res.body.tickets;

      for (let i = 0; i < returned.length - 1; i++) {
        const currRank = priorityOrder[returned[i].itPriority];
        const nextRank = priorityOrder[returned[i + 1].itPriority];
        expect(currRank).toBeLessThanOrEqual(nextRank);
      }
    });
  });

  // -------------------------------------------------------------------------
  // API-10: Pagination Boundaries (AC-26)
  // -------------------------------------------------------------------------
  describe("API-10: Pagination Boundaries", () => {
    it("returns empty tickets array for out-of-range page without clamping page", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?page=9999&pageSize=10")
        .set(staffHeaders);

      expect(res.status).toBe(200);
      expect(res.body.tickets).toEqual([]);
      expect(res.body.pagination.page).toBe(9999);
    });

    it("rejects invalid page number (negative or zero or non-int) with 400", async () => {
      const res1 = await request(app).get("/api/staff/tickets?page=0").set(staffHeaders);
      expect(res1.status).toBe(400);

      const res2 = await request(app).get("/api/staff/tickets?page=-5").set(staffHeaders);
      expect(res2.status).toBe(400);

      const res3 = await request(app).get("/api/staff/tickets?page=abc").set(staffHeaders);
      expect(res3.status).toBe(400);
    });

    it("rejects invalid pageSize with 400 (allowed: 10, 20, 50)", async () => {
      const res = await request(app).get("/api/staff/tickets?pageSize=15").set(staffHeaders);
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /api/staff/ticket-owners (AC-29, api-spec §5.7)
  // -------------------------------------------------------------------------
  describe("GET /api/staff/ticket-owners", () => {
    it("returns list of active IT_STAFF and ADMINISTRATOR users", async () => {
      const res = await request(app).get("/api/staff/ticket-owners").set(staffHeaders);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      for (const owner of res.body) {
        expect(owner.id).toBeDefined();
        expect(owner.name).toBeDefined();
        expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(owner.role);
        expect(owner.passwordHash).toBeUndefined(); // no credential leaks
        expect(owner.email).toBeUndefined(); // strictly name, id, role per contract
      }
    });

    it("denies REQUESTER access to ticket-owners with 403", async () => {
      const res = await request(app).get("/api/staff/ticket-owners").set(requesterHeaders);
      expect(res.status).toBe(403);
    });
  });
});
