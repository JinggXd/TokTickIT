import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Phase 6: Ownership Hardening Pass (API-35, BR-04, BR-06, AC-08, AC-18)", () => {
  const prisma = getPrisma();

  let requesterA: { id: number; email: string };
  let requesterB: { id: number; email: string };
  let requesterInactive: { id: number; email: string };
  let categoryHardware: { id: number; name: string };
  let systemLaptop: { id: number; name: string };

  let ticketAId: number;
  let attachmentAId: number;

  const createdTicketIds: number[] = [];
  const createdAttachmentIds: number[] = [];
  const createdRequesterIds: number[] = [];

  const validPdfBuffer = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(100)]);

  beforeAll(async () => {
    // 1. Reference data
    const catH = await prisma.category.findFirst({ where: { name: "Hardware" } });
    const sysL = await prisma.relatedSystem.findFirst({ where: { name: "Corporate Laptop" } });
    expect(catH).toBeTruthy();
    expect(sysL).toBeTruthy();
    categoryHardware = catH!;
    systemLaptop = sysL!;

    // 2. Requesters
    requesterA = await prisma.requesterUser.create({
      data: {
        name: "Hardening Owner A",
        email: `h.owner.a.${Date.now()}@test.local`,
        department: "SecOps",
        isActive: true,
      },
    });
    createdRequesterIds.push(requesterA.id);

    requesterB = await prisma.requesterUser.create({
      data: {
        name: "Hardening Attacker B",
        email: `h.attacker.b.${Date.now()}@test.local`,
        department: "Sales",
        isActive: true,
      },
    });
    createdRequesterIds.push(requesterB.id);

    requesterInactive = await prisma.requesterUser.create({
      data: {
        name: "Hardening Inactive C",
        email: `h.inactive.c.${Date.now()}@test.local`,
        department: "Archived",
        isActive: false,
      },
    });
    createdRequesterIds.push(requesterInactive.id);

    // 3. Ticket owned by Requester A
    const ticketA = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        summary: "Owner A confidential ticket",
        description: "Confidential infrastructure report that must never be accessible to other requesters.",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "NEW",
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        requesterId: requesterA.id,
      },
    });
    ticketAId = ticketA.id;
    createdTicketIds.push(ticketA.id);

    // 4. Attachment owned by Requester A
    const attA = await prisma.attachment.create({
      data: {
        ticketId: ticketAId,
        uploadedByRequesterId: requesterA.id,
        fileName: "confidential_audit.pdf",
        storedFileName: `test_confidential_${Date.now()}.pdf`,
        fileSize: validPdfBuffer.length,
        mimeType: "application/pdf",
      },
    });
    attachmentAId = attA.id;
    createdAttachmentIds.push(attA.id);
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
    if (createdRequesterIds.length > 0) {
      await prisma.requesterUser.deleteMany({
        where: { id: { in: createdRequesterIds } },
      });
    }
  });

  // =========================================================================
  // Section 1: Error Scenario Matrix — X-Requester-Id on ALL Scoped Endpoints
  // =========================================================================
  describe("Error Scenario Matrix: X-Requester-Id validation across all endpoints", () => {
    const testCases = [
      {
        name: "GET /api/tickets",
        invoke: (headers: Record<string, string>) =>
          request(app).get("/api/tickets").set(headers),
      },
      {
        name: "GET /api/tickets/:id",
        invoke: (headers: Record<string, string>) =>
          request(app).get(`/api/tickets/${ticketAId}`).set(headers),
      },
      {
        name: "POST /api/tickets/:id/attachments",
        invoke: (headers: Record<string, string>) =>
          request(app)
            .post(`/api/tickets/${ticketAId}/attachments`)
            .set(headers)
            .attach("file", validPdfBuffer, "sample.pdf"),
      },
      {
        name: "GET /api/attachments/:id/download",
        invoke: (headers: Record<string, string>) =>
          request(app).get(`/api/attachments/${attachmentAId}/download`).set(headers),
      },
      {
        name: "DELETE /api/attachments/:id",
        invoke: (headers: Record<string, string>) =>
          request(app)
            .delete(`/api/attachments/${attachmentAId}`)
            .set(headers)
            .send({ removalReason: "Testing middleware" }),
      },
    ];

    for (const { name, invoke } of testCases) {
      it(`${name}: rejects missing X-Requester-Id with 401 and generic message`, async () => {
        const res = await invoke({});
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Requester context is missing or invalid" });
        expect(res.body).not.toHaveProperty("details");
      });

      it(`${name}: rejects empty X-Requester-Id ('') with 400 without details`, async () => {
        const res = await invoke({ "X-Requester-Id": "" });
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Bad Request: Malformed X-Requester-Id header" });
        expect(res.body).not.toHaveProperty("details");
      });

      it(`${name}: rejects malformed X-Requester-Id ('abc') with 400 without details`, async () => {
        const res = await invoke({ "X-Requester-Id": "abc" });
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "Bad Request: Malformed X-Requester-Id header" });
        expect(res.body).not.toHaveProperty("details");
      });

      it(`${name}: rejects unknown X-Requester-Id ('99999999') with 401`, async () => {
        const res = await invoke({ "X-Requester-Id": "99999999" });
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Requester context is missing or invalid" });
        expect(res.body).not.toHaveProperty("details");
      });

      it(`${name}: rejects out-of-range integer X-Requester-Id ('2147483648') with 401 (not 500)`, async () => {
        const res = await invoke({ "X-Requester-Id": "2147483648" });
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Requester context is missing or invalid" });
        expect(res.body).not.toHaveProperty("details");
      });

      it(`${name}: rejects inactive X-Requester-Id with 401`, async () => {
        const res = await invoke({ "X-Requester-Id": String(requesterInactive.id) });
        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Requester context is missing or invalid" });
        expect(res.body).not.toHaveProperty("details");
      });
    }
  });

  // =========================================================================
  // Section 2: Cross-Requester Ownership Boundary Enforcement (BR-04, AC-08)
  // =========================================================================
  describe("Cross-Requester Ownership Protection (BR-04, AC-08)", () => {
    it("POST /api/tickets: body requesterId spoofing is ignored; ticket is strictly bound to X-Requester-Id", async () => {
      // Requester A attempts to spoof ownership to Requester B by passing requesterId in body
      const res = await request(app)
        .post("/api/tickets")
        .set("X-Requester-Id", String(requesterA.id))
        .send({
          summary: "Spoof attempt ticket",
          description: "Attempting to create a ticket on behalf of another requester via body payload.",
          categoryId: categoryHardware.id,
          relatedSystemId: systemLaptop.id,
          requestedPriority: "MEDIUM",
          requesterId: requesterB.id, // spoofing attempt
        });

      expect(res.status).toBe(201);
      // Server must bind ticket strictly to Requester A (from header)
      expect(res.body.requesterId).toBe(requesterA.id);
      expect(res.body.requesterId).not.toBe(requesterB.id);

      createdTicketIds.push(res.body.id);
    });

    it("GET /api/tickets: lists only owned tickets; completely hides other requesters' tickets", async () => {
      // Requester B lists tickets
      const res = await request(app)
        .get("/api/tickets")
        .set("X-Requester-Id", String(requesterB.id));

      expect(res.status).toBe(200);
      const ticketIds = res.body.data.map((t: any) => t.id);
      expect(ticketIds).not.toContain(ticketAId);
    });

    it("GET /api/tickets/:id: cross-requester access returns 403 Forbidden with no data leaked", async () => {
      // Requester B attempts to view ticket owned by Requester A
      const res = await request(app)
        .get(`/api/tickets/${ticketAId}`)
        .set("X-Requester-Id", String(requesterB.id));

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied: You do not own this ticket" });
      expect(res.body.ticketNo).toBeUndefined();
      expect(res.body.summary).toBeUndefined();
      expect(res.body.description).toBeUndefined();
      expect(res.body.attachments).toBeUndefined();
    });

    it("POST /api/tickets/:id/attachments: cross-requester upload returns 403 Forbidden and creates no attachment", async () => {
      const countBefore = await prisma.attachment.count({ where: { ticketId: ticketAId } });

      const res = await request(app)
        .post(`/api/tickets/${ticketAId}/attachments`)
        .set("X-Requester-Id", String(requesterB.id))
        .attach("file", validPdfBuffer, "malicious_upload.pdf");

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied: You do not own this ticket" });

      const countAfter = await prisma.attachment.count({ where: { ticketId: ticketAId } });
      expect(countAfter).toBe(countBefore);
    });

    it("GET /api/attachments/:id/download: cross-requester download returns 403 Forbidden with no bytes streamed", async () => {
      const res = await request(app)
        .get(`/api/attachments/${attachmentAId}/download`)
        .set("X-Requester-Id", String(requesterB.id));

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied: You do not own this attachment" });
    });

    it("DELETE /api/attachments/:id: cross-requester soft-remove returns 403 Forbidden and preserves attachment", async () => {
      const res = await request(app)
        .delete(`/api/attachments/${attachmentAId}`)
        .set("X-Requester-Id", String(requesterB.id))
        .send({ removalReason: "Malicious attempt to remove" });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "Access denied: You do not own this attachment" });

      // Attachment remains active in DB
      const att = await prisma.attachment.findUnique({ where: { id: attachmentAId } });
      expect(att?.removedAt).toBeNull();
      expect(att?.removalReason).toBeNull();
    });
  });

  // =========================================================================
  // Section 3: Seeded Development Requesters Verification (Phase 6 Item 2)
  // =========================================================================
  describe("Seeded Development Requesters Cross-Access Verification", () => {
    it("Seeded Requester 2 (Sarah Johnson) cannot view, download, or remove seeded Requester 1's items", async () => {
      const req1 = await prisma.requesterUser.findUnique({ where: { email: "jennifer.a@example.com" } });
      const req2 = await prisma.requesterUser.findUnique({ where: { email: "sarah.j@example.com" } });

      expect(req1).toBeTruthy();
      expect(req2).toBeTruthy();

      // Create a test ticket for seeded Requester 1
      const seededTicket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
          summary: "Seeded Jennifer Anderson ticket",
          description: "Confidential hardware request for Jennifer Anderson.",
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          currentStatus: "NEW",
          categoryId: categoryHardware.id,
          relatedSystemId: systemLaptop.id,
          requesterId: req1!.id,
        },
      });
      createdTicketIds.push(seededTicket.id);

      const seededAttachment = await prisma.attachment.create({
        data: {
          ticketId: seededTicket.id,
          uploadedByRequesterId: req1!.id,
          fileName: "jennifer_specs.pdf",
          storedFileName: `test_jennifer_${Date.now()}.pdf`,
          fileSize: validPdfBuffer.length,
          mimeType: "application/pdf",
        },
      });
      createdAttachmentIds.push(seededAttachment.id);

      // 1. Seeded Requester 2 tries to view Requester 1's ticket -> 403 Forbidden
      const resView = await request(app)
        .get(`/api/tickets/${seededTicket.id}`)
        .set("X-Requester-Id", String(req2!.id));
      expect(resView.status).toBe(403);
      expect(resView.body).toEqual({ error: "Access denied: You do not own this ticket" });

      // 2. Seeded Requester 2 tries to download Requester 1's attachment -> 403 Forbidden
      const resDownload = await request(app)
        .get(`/api/attachments/${seededAttachment.id}/download`)
        .set("X-Requester-Id", String(req2!.id));
      expect(resDownload.status).toBe(403);
      expect(resDownload.body).toEqual({ error: "Access denied: You do not own this attachment" });

      // 3. Seeded Requester 2 tries to remove Requester 1's attachment -> 403 Forbidden
      const resRemove = await request(app)
        .delete(`/api/attachments/${seededAttachment.id}`)
        .set("X-Requester-Id", String(req2!.id))
        .send({ removalReason: "Cross-requester deletion attempt" });
      expect(resRemove.status).toBe(403);
      expect(resRemove.body).toEqual({ error: "Access denied: You do not own this attachment" });

      // Confirm attachment remains intact in DB
      const dbAtt = await prisma.attachment.findUnique({ where: { id: seededAttachment.id } });
      expect(dbAtt?.removedAt).toBeNull();
    });
  });
});
