import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionHeaders } from "../helpers/session.js";
import { requireTestEnvironment } from "../../src/config/testEnvironment.js";

describe("IT Staff Ticket Detail & Operations (AC-28 to AC-33, BR-11, BR-14, BR-15, BR-16, API-11 to API-15)", () => {
  const prisma = getPrisma();
  let staffAlex: any;
  let staffBrian: any;
  let adminUser: any;
  let requesterUser: any;

  let alexHeaders: Record<string, string>;
  let brianHeaders: Record<string, string>;
  let adminHeaders: Record<string, string>;
  let requesterHeaders: Record<string, string>;

  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    requireTestEnvironment();

    staffAlex = await prisma.user.findFirstOrThrow({
      where: { role: "IT_STAFF", email: "staff1@example.com" },
    });
    staffBrian = await prisma.user.findFirstOrThrow({
      where: { role: "IT_STAFF", email: "staff2@example.com" },
    });
    adminUser = await prisma.user.findFirstOrThrow({
      where: { role: "ADMINISTRATOR", email: "admin@example.com" },
    });
    requesterUser = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", email: "jennifer.a@example.com" },
    });

    alexHeaders = await sessionHeaders(staffAlex.id);
    brianHeaders = await sessionHeaders(staffBrian.id);
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

  async function createFixture(overrides: Record<string, any> = {}) {
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-OP-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        summary: overrides.summary ?? "Operational Test Ticket",
        description: overrides.description ?? "Testing staff operations",
        categoryId: overrides.categoryId ?? category.id,
        relatedSystemId: overrides.relatedSystemId ?? system.id,
        requesterId: overrides.requesterId ?? requesterUser.id,
        requestedPriority: overrides.requestedPriority ?? "MEDIUM",
        itPriority: overrides.itPriority ?? "MEDIUM",
        currentStatus: overrides.currentStatus ?? "NEW",
        ticketOwnerId: overrides.ticketOwnerId ?? null,
        version: overrides.version ?? 1,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  // -------------------------------------------------------------------------
  // API-11: Detail Access Control (AC-28, R18)
  // -------------------------------------------------------------------------
  describe("API-11: GET /api/staff/tickets/:id and /api/admin/tickets/:id", () => {
    it("returns full operational detail to IT_STAFF", async () => {
      const ticket = await createFixture({ ticketOwnerId: staffAlex.id });

      const res = await request(app)
        .get(`/api/staff/tickets/${ticket.id}`)
        .set(alexHeaders);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ticket.id);
      expect(res.body.ticketNo).toBe(ticket.ticketNo);
      expect(res.body.requester.name).toBe(requesterUser.name);
      expect(res.body.ticketOwner.name).toBe(staffAlex.name);
      expect(res.body.version).toBe(ticket.version);
    });

    it("returns detail to ADMINISTRATOR via /api/admin/tickets/:id", async () => {
      const ticket = await createFixture();

      const res = await request(app)
        .get(`/api/admin/tickets/${ticket.id}`)
        .set(adminHeaders);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ticket.id);
    });

    it("denies REQUESTER with 403 Forbidden", async () => {
      const ticket = await createFixture();

      const res = await request(app)
        .get(`/api/staff/tickets/${ticket.id}`)
        .set(requesterHeaders);

      expect(res.status).toBe(403);
    });

    it("returns 404 for nonexistent ticket", async () => {
      const res = await request(app)
        .get("/api/staff/tickets/9999999")
        .set(alexHeaders);

      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // API-12 & API-13: Claim & Concurrency (AC-29, AC-30, BR-11, BR-16)
  // -------------------------------------------------------------------------
  describe("API-12 & API-13: POST /api/staff/tickets/:id/claim", () => {
    it("allows IT_STAFF to claim unassigned ticket and increments version", async () => {
      const ticket = await createFixture({ ticketOwnerId: null, version: 1 });

      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/claim`)
        .set(alexHeaders)
        .send({ expectedVersion: 1 });

      expect(res.status).toBe(200);
      expect(res.body.ticketOwner.id).toBe(staffAlex.id);
      expect(res.body.version).toBe(2);

      // Verify in DB
      const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(updated.ticketOwnerId).toBe(staffAlex.id);
      expect(updated.version).toBe(2);
    });

    it("returns 409 Conflict if ticket is already claimed", async () => {
      const ticket = await createFixture({ ticketOwnerId: staffAlex.id, version: 2 });

      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/claim`)
        .set(brianHeaders) // Brian tries to claim Alex's ticket
        .send({ expectedVersion: 2 });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("CONFLICT");
      expect(res.body.message).toContain("already assigned");
    });

    it("returns 409 Conflict if expectedVersion does not match current version", async () => {
      const ticket = await createFixture({ ticketOwnerId: null, version: 5 });

      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/claim`)
        .set(alexHeaders)
        .send({ expectedVersion: 4 }); // Stale version

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("CONFLICT");
      expect(res.body.currentVersion).toBe(5);
    });

    it("returns 400 if expectedVersion is missing or invalid", async () => {
      const ticket = await createFixture();

      const res = await request(app)
        .post(`/api/staff/tickets/${ticket.id}/claim`)
        .set(alexHeaders)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.details?.expectedVersion).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // Reassign Owner: PATCH /api/staff/tickets/:id/owner (AC-29, BR-11, BR-13)
  // -------------------------------------------------------------------------
  describe("PATCH /api/staff/tickets/:id/owner", () => {
    it("reassigns ticket to another active IT_STAFF member", async () => {
      const ticket = await createFixture({ ticketOwnerId: staffAlex.id, version: 2 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set(alexHeaders)
        .send({ ownerId: staffBrian.id, expectedVersion: 2 });

      expect(res.status).toBe(200);
      expect(res.body.ticketOwner.id).toBe(staffBrian.id);
      expect(res.body.version).toBe(3);
    });

    it("rejects assigning to a REQUESTER with 400", async () => {
      const ticket = await createFixture({ ticketOwnerId: staffAlex.id, version: 2 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/owner`)
        .set(alexHeaders)
        .send({ ownerId: requesterUser.id, expectedVersion: 2 });

      expect(res.status).toBe(400);
      expect(res.body.details?.ownerId).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // API-14: Update itPriority (AC-31, R07)
  // -------------------------------------------------------------------------
  describe("API-14: PATCH /api/staff/tickets/:id/it-priority", () => {
    it("updates itPriority without modifying requestedPriority", async () => {
      const ticket = await createFixture({
        requestedPriority: "LOW",
        itPriority: "LOW",
        version: 1,
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/it-priority`)
        .set(alexHeaders)
        .send({ itPriority: "HIGH", expectedVersion: 1 });

      expect(res.status).toBe(200);
      expect(res.body.itPriority).toBe("HIGH");
      expect(res.body.requestedPriority).toBe("LOW"); // immutable
      expect(res.body.version).toBe(2);

      const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(updated.itPriority).toBe("HIGH");
      expect(updated.requestedPriority).toBe("LOW");
    });

    it("rejects invalid priority string with 400", async () => {
      const ticket = await createFixture({ version: 1 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/it-priority`)
        .set(alexHeaders)
        .send({ itPriority: "SUPER_URGENT", expectedVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.details?.itPriority).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // API-15: Status Transitions (AC-32, R08, BR-14, BR-15)
  // -------------------------------------------------------------------------
  describe("API-15: PATCH /api/staff/tickets/:id/status", () => {
    it("allows valid status transition (NEW -> OPEN) with assigned owner", async () => {
      const ticket = await createFixture({
        currentStatus: "NEW",
        ticketOwnerId: staffAlex.id,
        version: 1,
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set(alexHeaders)
        .send({ status: "OPEN", expectedVersion: 1 });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("OPEN");
      expect(res.body.version).toBe(2);
    });

    it("rejects illegal status transition (NEW -> RESOLVED) with 400 ILLEGAL_STATUS_TRANSITION", async () => {
      const ticket = await createFixture({
        currentStatus: "NEW",
        ticketOwnerId: staffAlex.id,
        version: 1,
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set(alexHeaders)
        .send({ status: "RESOLVED", expectedVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("ILLEGAL_STATUS_TRANSITION");
      expect(res.body.message).toContain("Cannot transition status from 'NEW' directly to 'RESOLVED'");
    });

    it("rejects transition to OPEN without an assigned owner (BR-15)", async () => {
      const ticket = await createFixture({
        currentStatus: "NEW",
        ticketOwnerId: null, // Unassigned
        version: 1,
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set(alexHeaders)
        .send({ status: "OPEN", expectedVersion: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("ELIGIBLE_OWNER_REQUIRED");
      expect(res.body.message).toBe("Assign an active IT Staff or Administrator before this transition.");
    });

    it("clears appearsResolved fields when transitioning to REOPENED (BR-15)", async () => {
      const ticket = await createFixture({
        currentStatus: "RESOLVED",
        ticketOwnerId: staffAlex.id,
        version: 3,
      });

      // Mark appears resolved
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: { appearsResolvedAt: new Date(), appearsResolvedById: requesterUser.id },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set(alexHeaders)
        .send({ status: "REOPENED", expectedVersion: 3 });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("REOPENED");

      const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(updated.appearsResolvedAt).toBeNull();
      expect(updated.appearsResolvedById).toBeNull();
    });
  });
});
