import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionHeaders } from "../helpers/session.js";
import { requireTestEnvironment } from "../../src/config/testEnvironment.js";

describe("Requester Regression & Resolution Confirmation (AC-13, AC-20, AC-21, AC-34, BR-17, API-16, API-20, API-21)", () => {
  const prisma = getPrisma();
  let requesterA: any;
  let requesterB: any;
  let headersA: Record<string, string>;
  let headersB: Record<string, string>;

  const createdTicketIds: number[] = [];
  const createdAttachmentIds: number[] = [];

  beforeAll(async () => {
    requireTestEnvironment();

    requesterA = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", email: "jennifer.a@example.com" },
    });
    requesterB = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", email: "sarah.j@example.com" },
    });

    headersA = await sessionHeaders(requesterA.id);
    headersB = await sessionHeaders(requesterB.id);
  });

  afterAll(async () => {
    if (createdAttachmentIds.length > 0) {
      await prisma.attachment.deleteMany({
        where: { id: { in: createdAttachmentIds } },
      });
    }
    if (createdTicketIds.length > 0) {
      await prisma.ticket.deleteMany({
        where: { id: { in: createdTicketIds } },
      });
    }
  });

  // Helper to create test ticket
  async function createTestTicket(requesterId: number, status: any = "OPEN") {
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const system = await prisma.relatedSystem.findFirstOrThrow({ where: { isActive: true } });

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-TEST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        summary: "Regression test ticket",
        description: "Testing appears resolved and attachments",
        categoryId: category.id,
        relatedSystemId: system.id,
        requesterId,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: status,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  // -------------------------------------------------------------------------
  // API-16: POST /api/tickets/:id/appears-resolved (AC-34, BR-17)
  // -------------------------------------------------------------------------
  describe("API-16: POST /api/tickets/:id/appears-resolved", () => {
    it("marks ticket as appears resolved for permitted status (IN_PROGRESS)", async () => {
      const ticket = await createTestTicket(requesterA.id, "IN_PROGRESS");

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/appears-resolved`)
        .set(headersA)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ticket.id);
      expect(res.body.currentStatus).toBe("IN_PROGRESS");
      expect(res.body.appearsResolvedAt).toBeDefined();
      expect(res.body.appearsResolvedById).toBe(requesterA.id);
      expect(res.body.message).toContain("Problem noted as appears resolved");

      // Verify DB state
      const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(updated.appearsResolvedAt).not.toBeNull();
      expect(updated.appearsResolvedById).toBe(requesterA.id);
      expect(updated.currentStatus).toBe("IN_PROGRESS"); // formal status unchanged
    });

    it("succeeds for all permitted statuses: OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED", async () => {
      const permitted = ["OPEN", "WAITING_FOR_REQUESTER", "REOPENED"] as const;
      for (const status of permitted) {
        const ticket = await createTestTicket(requesterA.id, status);
        const res = await request(app)
          .post(`/api/tickets/${ticket.id}/appears-resolved`)
          .set(headersA)
          .send({});

        expect(res.status).toBe(200);
        expect(res.body.currentStatus).toBe(status);
        expect(res.body.appearsResolvedAt).toBeDefined();
      }
    });

    it("is idempotent: repeated invocation returns existing indicator without changing timestamp", async () => {
      const ticket = await createTestTicket(requesterA.id, "OPEN");

      const firstRes = await request(app)
        .post(`/api/tickets/${ticket.id}/appears-resolved`)
        .set(headersA)
        .send({});
      expect(firstRes.status).toBe(200);
      const firstTimestamp = firstRes.body.appearsResolvedAt;

      const secondRes = await request(app)
        .post(`/api/tickets/${ticket.id}/appears-resolved`)
        .set(headersA)
        .send({});
      expect(secondRes.status).toBe(200);
      expect(secondRes.body.appearsResolvedAt).toBe(firstTimestamp);
    });

    it("rejects non-permitted statuses: NEW, RESOLVED, CLOSED, CANCELLED with 400 APPEARS_RESOLVED_NOT_ALLOWED", async () => {
      const forbidden = ["NEW", "RESOLVED", "CLOSED", "CANCELLED"] as const;
      for (const status of forbidden) {
        const ticket = await createTestTicket(requesterA.id, status);
        const res = await request(app)
          .post(`/api/tickets/${ticket.id}/appears-resolved`)
          .set(headersA)
          .send({});

        expect(res.status).toBe(400);
        expect(res.body).toEqual({
          error: "APPEARS_RESOLVED_NOT_ALLOWED",
          message: "This ticket cannot be marked as appears resolved in its current status.",
        });
      }
    });

    it("returns 403 Forbidden when accessing a foreign ticket", async () => {
      const ticket = await createTestTicket(requesterA.id, "OPEN");

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/appears-resolved`)
        .set(headersB) // Sarah calls on Jennifer's ticket
        .send({});

      expect(res.status).toBe(403);
    });

    it("returns 404 Not Found for non-existent ticket ID", async () => {
      const res = await request(app)
        .post("/api/tickets/9999999/appears-resolved")
        .set(headersA)
        .send({});

      expect(res.status).toBe(404);
    });

    it("rejects forged actor, status, or timestamp fields with 400 field validation", async () => {
      const ticket = await createTestTicket(requesterA.id, "OPEN");

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/appears-resolved`)
        .set(headersA)
        .send({
          status: "RESOLVED",
          appearsResolvedAt: "2020-01-01T00:00:00.000Z",
          actor: "Admin",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });
  });

  // -------------------------------------------------------------------------
  // API-20 & API-21: Attachments under Session Authentication (AC-20, AC-21)
  // -------------------------------------------------------------------------
  describe("API-20 & API-21: Attachment Lifecycle & Security under Session Auth", () => {
    it("allows ticket owner to upload, download, and soft-remove an attachment", async () => {
      const ticket = await createTestTicket(requesterA.id, "OPEN");
      const pdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");

      // 1. Upload attachment
      const uploadRes = await request(app)
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set(headersA)
        .attach("file", pdfBuffer, "sample.pdf");

      expect(uploadRes.status).toBe(201);
      expect(uploadRes.body.fileName).toBe("sample.pdf");
      const attachmentId = uploadRes.body.id;
      createdAttachmentIds.push(attachmentId);

      // 2. Download attachment
      const downloadRes = await request(app)
        .get(`/api/attachments/${attachmentId}/download`)
        .set(headersA);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.body).toBeInstanceOf(Buffer);

      // 3. Soft-remove attachment
      const removeRes = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set(headersA)
        .send({ removalReason: "Uploaded by mistake" });

      expect(removeRes.status).toBe(200);
      expect(removeRes.body.removedAt).toBeDefined();
      expect(removeRes.body.removalReason).toBe("Uploaded by mistake");

      // 4. Subsequent download returns 410 Gone with 0 file bytes
      const goneRes = await request(app)
        .get(`/api/attachments/${attachmentId}/download`)
        .set(headersA);

      expect(goneRes.status).toBe(410);

      // 5. Subsequent soft-remove attempt returns 409 Conflict
      const conflictRes = await request(app)
        .delete(`/api/attachments/${attachmentId}`)
        .set(headersA)
        .send({ removalReason: "Attempting duplicate removal" });

      expect(conflictRes.status).toBe(409);
    });

    it("rejects foreign requester downloading active attachment with 403 Forbidden", async () => {
      const ticket = await createTestTicket(requesterA.id, "OPEN");
      const pdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF");

      const uploadRes = await request(app)
        .post(`/api/tickets/${ticket.id}/attachments`)
        .set(headersA)
        .attach("file", pdfBuffer, "secret.pdf");

      expect(uploadRes.status).toBe(201);
      const attachmentId = uploadRes.body.id;
      createdAttachmentIds.push(attachmentId);

      // Requester B attempts download
      const res = await request(app)
        .get(`/api/attachments/${attachmentId}/download`)
        .set(headersB);

      expect(res.status).toBe(403);
    });

    it("returns 404 for genuinely non-existent attachment", async () => {
      const res = await request(app)
        .get("/api/attachments/9999999/download")
        .set(headersA);

      expect(res.status).toBe(404);
    });
  });
});
