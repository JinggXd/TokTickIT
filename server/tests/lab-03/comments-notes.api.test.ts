import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionHeaders } from "../helpers/session.js";
import { requireTestEnvironment } from "../../src/config/testEnvironment.js";

describe("Communication Endpoints: Public Comments & Internal Notes (AC-35 to AC-38, BR-07 to BR-10, API-17, API-18, API-19)", () => {
  const prisma = getPrisma();
  let requesterA: any;
  let requesterB: any;
  let staffAlex: any;
  let adminUser: any;

  let headersA: Record<string, string>;
  let headersB: Record<string, string>;
  let staffHeaders: Record<string, string>;
  let adminHeaders: Record<string, string>;

  const createdTicketIds: number[] = [];
  const createdCommentIds: number[] = [];
  const createdNoteIds: number[] = [];

  beforeAll(async () => {
    requireTestEnvironment();

    requesterA = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", email: "jennifer.a@example.com" },
    });
    requesterB = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", email: "sarah.j@example.com" },
    });
    staffAlex = await prisma.user.findFirstOrThrow({
      where: { role: "IT_STAFF", email: "staff1@example.com" },
    });
    adminUser = await prisma.user.findFirstOrThrow({
      where: { role: "ADMINISTRATOR", email: "admin@example.com" },
    });

    headersA = await sessionHeaders(requesterA.id);
    headersB = await sessionHeaders(requesterB.id);
    staffHeaders = await sessionHeaders(staffAlex.id);
    adminHeaders = await sessionHeaders(adminUser.id);
  });

  afterAll(async () => {
    if (createdCommentIds.length > 0) {
      await prisma.publicComment.deleteMany({
        where: { id: { in: createdCommentIds } },
      });
    }
    if (createdNoteIds.length > 0) {
      await prisma.internalNote.deleteMany({
        where: { id: { in: createdNoteIds } },
      });
    }
    if (createdTicketIds.length > 0) {
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
  });

  async function createFixture(requesterId: number) {
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-COMM-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        summary: "Communication Test Ticket",
        description: "Testing public comments and internal notes",
        categoryId: category.id,
        relatedSystemId: system.id,
        requesterId,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "OPEN",
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  // -------------------------------------------------------------------------
  // API-17: Public Comments (AC-35, AC-38, BR-07, BR-08)
  // -------------------------------------------------------------------------
  describe("API-17: Public Comments Lifecycle & Validation", () => {
    it("allows ticket owner and IT Staff to post public comments", async () => {
      const ticket = await createFixture(requesterA.id);

      // Requester A posts
      const res1 = await request(app)
        .post(`/api/tickets/${ticket.id}/public-comments`)
        .set(headersA)
        .send({ body: "Hello, I am experiencing this issue." });

      expect(res1.status).toBe(201);
      expect(res1.body.body).toBe("Hello, I am experiencing this issue.");
      expect(res1.body.author.id).toBe(requesterA.id);
      expect(res1.body.author.role).toBe("REQUESTER");
      createdCommentIds.push(res1.body.id);

      // Staff Alex posts
      const res2 = await request(app)
        .post(`/api/tickets/${ticket.id}/public-comments`)
        .set(staffHeaders)
        .send({ body: "Understood, investigating now." });

      expect(res2.status).toBe(201);
      expect(res2.body.author.id).toBe(staffAlex.id);
      expect(res2.body.author.role).toBe("IT_STAFF");
      createdCommentIds.push(res2.body.id);

      // Verify list
      const listRes = await request(app)
        .get(`/api/tickets/${ticket.id}/public-comments`)
        .set(headersA);

      expect(listRes.status).toBe(200);
      expect(listRes.body).toHaveLength(2);
      expect(listRes.body[0].body).toBe("Hello, I am experiencing this issue.");
      expect(listRes.body[1].body).toBe("Understood, investigating now.");
    });

    it("allows Administrator to view public comments", async () => {
      const ticket = await createFixture(requesterA.id);

      const listRes = await request(app)
        .get(`/api/tickets/${ticket.id}/public-comments`)
        .set(adminHeaders);

      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);
    });

    it("denies foreign requester from viewing or posting public comments with 403", async () => {
      const ticket = await createFixture(requesterA.id);

      // Requester B tries to post on Requester A's ticket
      const postRes = await request(app)
        .post(`/api/tickets/${ticket.id}/public-comments`)
        .set(headersB)
        .send({ body: "Snooping around" });
      expect(postRes.status).toBe(403);

      // Requester B tries to read Requester A's comments
      const getRes = await request(app)
        .get(`/api/tickets/${ticket.id}/public-comments`)
        .set(headersB);
      expect(getRes.status).toBe(403);
    });

    it("validates body length: empty body or >2000 chars returns 400", async () => {
      const ticket = await createFixture(requesterA.id);

      // Empty string
      const emptyRes = await request(app)
        .post(`/api/tickets/${ticket.id}/public-comments`)
        .set(headersA)
        .send({ body: "   " });
      expect(emptyRes.status).toBe(400);
      expect(emptyRes.body.details?.body).toBeDefined();

      // >2000 characters
      const longRes = await request(app)
        .post(`/api/tickets/${ticket.id}/public-comments`)
        .set(headersA)
        .send({ body: "a".repeat(2001) });
      expect(longRes.status).toBe(400);
      expect(longRes.body.details?.body).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // API-18: Internal Notes (AC-36, BR-09, BR-10)
  // -------------------------------------------------------------------------
  describe("API-18: Internal Notes Isolation & Role Visibility", () => {
    it("allows IT_STAFF to create and view internal notes", async () => {
      const ticket = await createFixture(requesterA.id);

      const postRes = await request(app)
        .post(`/api/tickets/${ticket.id}/internal-notes`)
        .set(staffHeaders)
        .send({ body: "Private note: check backend server logs" });

      expect(postRes.status).toBe(201);
      expect(postRes.body.body).toBe("Private note: check backend server logs");
      expect(postRes.body.author.id).toBe(staffAlex.id);
      createdNoteIds.push(postRes.body.id);

      const getRes = await request(app)
        .get(`/api/tickets/${ticket.id}/internal-notes`)
        .set(staffHeaders);

      expect(getRes.status).toBe(200);
      expect(getRes.body).toHaveLength(1);
      expect(getRes.body[0].body).toBe("Private note: check backend server logs");
    });

    it("allows Administrator to view internal notes (read-only)", async () => {
      const ticket = await createFixture(requesterA.id);

      const getRes = await request(app)
        .get(`/api/tickets/${ticket.id}/internal-notes`)
        .set(adminHeaders);

      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
    });

    it("strictly blocks Requester from reading or posting internal notes with 403", async () => {
      const ticket = await createFixture(requesterA.id);

      // Requester tries to post note
      const postRes = await request(app)
        .post(`/api/tickets/${ticket.id}/internal-notes`)
        .set(headersA)
        .send({ body: "Attempting to post internal note" });
      expect(postRes.status).toBe(403);

      // Requester tries to read notes
      const getRes = await request(app)
        .get(`/api/tickets/${ticket.id}/internal-notes`)
        .set(headersA);
      expect(getRes.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // API-19: Append-Only Invariant (AC-37)
  // -------------------------------------------------------------------------
  describe("API-19: Append-Only Enforcement (405 Method Not Allowed)", () => {
    it("rejects PUT, PATCH, DELETE on public comments with 405 Method Not Allowed", async () => {
      const ticket = await createFixture(requesterA.id);

      const putRes = await request(app)
        .put(`/api/tickets/${ticket.id}/public-comments`)
        .set(headersA)
        .send({ body: "edit" });
      expect(putRes.status).toBe(405);

      const patchRes = await request(app)
        .patch(`/api/tickets/${ticket.id}/public-comments`)
        .set(headersA)
        .send({ body: "edit" });
      expect(patchRes.status).toBe(405);

      const deleteRes = await request(app)
        .delete(`/api/tickets/${ticket.id}/public-comments`)
        .set(headersA);
      expect(deleteRes.status).toBe(405);
    });

    it("rejects PUT, PATCH, DELETE on internal notes with 405 Method Not Allowed", async () => {
      const ticket = await createFixture(requesterA.id);

      const putRes = await request(app)
        .put(`/api/tickets/${ticket.id}/internal-notes`)
        .set(staffHeaders)
        .send({ body: "edit" });
      expect(putRes.status).toBe(405);

      const patchRes = await request(app)
        .patch(`/api/tickets/${ticket.id}/internal-notes`)
        .set(staffHeaders)
        .send({ body: "edit" });
      expect(patchRes.status).toBe(405);

      const deleteRes = await request(app)
        .delete(`/api/tickets/${ticket.id}/internal-notes`)
        .set(staffHeaders);
      expect(deleteRes.status).toBe(405);
    });
  });
});
