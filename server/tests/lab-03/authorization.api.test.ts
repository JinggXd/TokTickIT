import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/utils/password.js";

describe("Phase F2 / P05 Authorization & RBAC API (SEC-01, SEC-04, SEC-05, SEC-06, SEC-10, SEC-11, SEC-12)", () => {
  const DEFAULT_ORIGIN = "http://localhost:5173";

  let user1Cookie: string;
  let user1CsrfToken: string;
  let user1Id: number;

  let user2Cookie: string;
  let user2CsrfToken: string;
  let user2Id: number;

  let deactivatedUserCookie: string;
  let deactivatedUserId: number;

  let createdTicketIds: number[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();

    // User 1 (Requester)
    const pass1 = await hashPassword("User1Pass12345!");
    const u1 = await prisma.user.upsert({
      where: { email: "authz.user1@example.com" },
      update: {
        isActive: true,
        mustChangePassword: false,
        passwordHash: pass1,
        role: "REQUESTER",
      },
      create: {
        email: "authz.user1@example.com",
        name: "Authz User One",
        department: "Sales",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
        passwordHash: pass1,
      },
    });
    user1Id = u1.id;

    const u1Login = await request(app)
      .post("/api/auth/login")
      .set("Origin", DEFAULT_ORIGIN)
      .send({ email: "authz.user1@example.com", password: "User1Pass12345!" });
    user1Cookie = u1Login.headers["set-cookie"];

    const u1Csrf = await request(app).get("/api/auth/csrf").set("Cookie", user1Cookie);
    user1CsrfToken = u1Csrf.body.csrfToken;

    // User 2 (Requester)
    const pass2 = await hashPassword("User2Pass12345!");
    const u2 = await prisma.user.upsert({
      where: { email: "authz.user2@example.com" },
      update: {
        isActive: true,
        mustChangePassword: false,
        passwordHash: pass2,
        role: "REQUESTER",
      },
      create: {
        email: "authz.user2@example.com",
        name: "Authz User Two",
        department: "Marketing",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
        passwordHash: pass2,
      },
    });
    user2Id = u2.id;

    const u2Login = await request(app)
      .post("/api/auth/login")
      .set("Origin", DEFAULT_ORIGIN)
      .send({ email: "authz.user2@example.com", password: "User2Pass12345!" });
    user2Cookie = u2Login.headers["set-cookie"];

    const u2Csrf = await request(app).get("/api/auth/csrf").set("Cookie", user2Cookie);
    user2CsrfToken = u2Csrf.body.csrfToken;

    // User 3 (Active initially, then deactivated)
    const pass3 = await hashPassword("User3Pass12345!");
    const u3 = await prisma.user.upsert({
      where: { email: "authz.user3.deactivate@example.com" },
      update: {
        isActive: true,
        mustChangePassword: false,
        passwordHash: pass3,
        role: "REQUESTER",
      },
      create: {
        email: "authz.user3.deactivate@example.com",
        name: "Authz User Three",
        department: "Finance",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
        passwordHash: pass3,
      },
    });
    deactivatedUserId = u3.id;

    const u3Login = await request(app)
      .post("/api/auth/login")
      .set("Origin", DEFAULT_ORIGIN)
      .send({ email: "authz.user3.deactivate@example.com", password: "User3Pass12345!" });
    deactivatedUserCookie = u3Login.headers["set-cookie"];

    // Deactivate User 3 directly in DB
    await prisma.user.update({
      where: { id: deactivatedUserId },
      data: { isActive: false },
    });
  });

  afterAll(async () => {
    const prisma = getPrisma();
    const testEmails = [
      "authz.user1@example.com",
      "authz.user2@example.com",
      "authz.user3.deactivate@example.com",
    ];
    const testUsers = await prisma.user.findMany({
      where: { email: { in: testEmails } },
      select: { id: true },
    });
    const testUserIds = testUsers.map((u) => u.id);
    if (testUserIds.length > 0) {
      const tickets = await prisma.ticket.findMany({
        where: { requesterId: { in: testUserIds } },
        select: { id: true },
      });
      const ticketIds = tickets.map((t) => t.id);
      if (ticketIds.length > 0) {
        await prisma.attachment.deleteMany({ where: { ticketId: { in: ticketIds } } });
        await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
      }
      await prisma.session.deleteMany({ where: { userId: { in: testUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: testUserIds } } });
    }
  });

  // -------------------------------------------------------------------------
  // SEC-01: Spoofed X-Requester-Id is strictly ignored
  // -------------------------------------------------------------------------
  describe("SEC-01: Identity Spoofing Protection", () => {
    it("ignores spoofed X-Requester-Id header; ticket is strictly attributed to authenticated session user", async () => {
      const cat = await getPrisma().category.findFirst({ where: { isActive: true } });
      const sys = await getPrisma().relatedSystem.findFirst({ where: { isActive: true } });

      const res = await request(app)
        .post("/api/tickets")
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", user1Cookie)
        .set("X-CSRF-Token", user1CsrfToken)
        .set("X-Requester-Id", String(user2Id)) // Spoofed header
        .send({
          summary: "Legitimate ticket from User 1",
          description: "Detailed description for the ticket created by user 1.",
          categoryId: cat?.id || 1,
          relatedSystemId: sys?.id || 1,
          requestedPriority: "MEDIUM",
        });

      expect(res.status).toBe(201);
      expect(res.body.requesterId).toBe(user1Id);
      expect(res.body.requesterId).not.toBe(user2Id);
      createdTicketIds.push(res.body.id);
    });

    it("calling /api/tickets with spoofed X-Requester-Id but NO session returns 401 Unauthorized", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Origin", DEFAULT_ORIGIN)
        .set("X-Requester-Id", String(user1Id))
        .send({
          summary: "Unauthenticated attempt with header",
          description: "This should fail because session cookie is missing.",
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
        });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication required" });
    });
  });

  // -------------------------------------------------------------------------
  // SEC-05: Deactivated user session rejection
  // -------------------------------------------------------------------------
  describe("SEC-05: Deactivated User Session Revocation", () => {
    it("immediately rejects API calls from previously active cookie if account is deactivated", async () => {
      const res = await request(app).get("/api/auth/me").set("Cookie", deactivatedUserCookie);

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication required" });
    });
  });

  // -------------------------------------------------------------------------
  // SEC-06 & Cross-Requester Isolation
  // -------------------------------------------------------------------------
  describe("SEC-06: Cross-Requester Resource Isolation", () => {
    let user1TicketId: number;

    beforeAll(async () => {
      const cat = await getPrisma().category.findFirst({ where: { isActive: true } });
      const sys = await getPrisma().relatedSystem.findFirst({ where: { isActive: true } });

      const tRes = await request(app)
        .post("/api/tickets")
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", user1Cookie)
        .set("X-CSRF-Token", user1CsrfToken)
        .send({
          summary: "User 1 Private Ticket",
          description: "Ticket that should be forbidden to User 2.",
          categoryId: cat?.id || 1,
          relatedSystemId: sys?.id || 1,
          requestedPriority: "HIGH",
        });
      user1TicketId = tRes.body.id;
      createdTicketIds.push(user1TicketId);
    });

    it("User 2 cannot read User 1 ticket details (returns 403)", async () => {
      const res = await request(app)
        .get(`/api/tickets/${user1TicketId}`)
        .set("Cookie", user2Cookie);

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied: You do not own this ticket" });
    });

    it("User 2 cannot add attachment to User 1 ticket (returns 403)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${user1TicketId}/attachments`)
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", user2Cookie)
        .set("X-CSRF-Token", user2CsrfToken)
        .attach("file", Buffer.from("%PDF-1.4 test"), "user2.pdf");

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied: You do not own this ticket" });
    });

    it("User 2 cannot flag appears-resolved on User 1 ticket (returns 403)", async () => {
      const res = await request(app)
        .post(`/api/tickets/${user1TicketId}/appears-resolved`)
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", user2Cookie)
        .set("X-CSRF-Token", user2CsrfToken)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied: You do not own this ticket" });
    });
  });

  // -------------------------------------------------------------------------
  // SEC-12: CSRF Origin Rules and Port 5174 E2E Support
  // -------------------------------------------------------------------------
  describe("SEC-12: CSRF Origin Enforcement and E2E Port Allowlist", () => {
    it("rejects state-changing request without Origin header with 403 CSRF_INVALID", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Cookie", user1Cookie)
        .set("X-CSRF-Token", user1CsrfToken)
        .send({ summary: "No origin header", categoryId: 1, relatedSystemId: 1, requestedPriority: "LOW" });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: "CSRF_INVALID",
        message: "Refresh the page and try again.",
      });
    });

    it("rejects state-changing request with untrusted Origin header with 403 CSRF_INVALID", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Origin", "http://malicious-site.com")
        .set("Cookie", user1Cookie)
        .set("X-CSRF-Token", user1CsrfToken)
        .send({ summary: "Malicious origin", categoryId: 1, relatedSystemId: 1, requestedPriority: "LOW" });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({
        error: "CSRF_INVALID",
        message: "Refresh the page and try again.",
      });
    });

    it("accepts requests from E2E test client port 5174 (http://localhost:5174)", async () => {
      const cat = await getPrisma().category.findFirst({ where: { isActive: true } });
      const sys = await getPrisma().relatedSystem.findFirst({ where: { isActive: true } });

      const res = await request(app)
        .post("/api/tickets")
        .set("Origin", "http://localhost:5174")
        .set("Cookie", user1Cookie)
        .set("X-CSRF-Token", user1CsrfToken)
        .send({
          summary: "E2E Port 5174 Origin Test",
          description: "Testing that port 5174 is in trusted origins allowlist.",
          categoryId: cat?.id || 1,
          relatedSystemId: sys?.id || 1,
          requestedPriority: "LOW",
        });

      expect(res.status).toBe(201);
      expect(res.body.summary).toBe("E2E Port 5174 Origin Test");
      createdTicketIds.push(res.body.id);
    });
  });

  // -------------------------------------------------------------------------
  // SEC-10: Safe Error Handling (no leaks)
  // -------------------------------------------------------------------------
  describe("SEC-10: Safe server error handling", () => {
    it("returns clean JSON errors without leaking stack traces or database internal schema", async () => {
      const res = await request(app).get("/api/tickets/999999999").set("Cookie", user1Cookie);
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Ticket not found" });
      expect(res.body.stack).toBeUndefined();
    });
  });
});
