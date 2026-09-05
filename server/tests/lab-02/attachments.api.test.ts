import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import fs from "fs";
import path from "path";

describe("Attachment API (API-13 to API-20, API-23 to API-25, API-32 to API-34)", () => {
  const prisma = getPrisma();

  let requesterOwner: { id: number; email: string };
  let requesterOther: { id: number; email: string };
  let categoryHardware: { id: number; name: string };
  let systemLaptop: { id: number; name: string };
  let testTicketId: number;

  const createdAttachmentIds: number[] = [];
  const createdTicketIds: number[] = [];
  const createdRequesterIds: number[] = [];
  const createdDiskFiles: string[] = [];

  // Minimal valid file buffers for testing
  const validPdfBuffer = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(100)]);
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

  beforeAll(async () => {
    const catH = await prisma.category.findFirst({ where: { name: "Hardware" } });
    const sysL = await prisma.relatedSystem.findFirst({ where: { name: "Corporate Laptop" } });
    expect(catH).toBeTruthy();
    expect(sysL).toBeTruthy();
    categoryHardware = catH!;
    systemLaptop = sysL!;

    requesterOwner = await prisma.requesterUser.create({
      data: {
        name: "Attach Owner",
        email: `attach.owner.${Date.now()}@test.local`,
        department: "Operations",
        isActive: true,
      },
    });
    createdRequesterIds.push(requesterOwner.id);

    requesterOther = await prisma.requesterUser.create({
      data: {
        name: "Attach Other",
        email: `attach.other.${Date.now()}@test.local`,
        department: "Support",
        isActive: true,
      },
    });
    createdRequesterIds.push(requesterOther.id);

    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        summary: "Attachment Testing Ticket",
        description: "Ticket created to thoroughly test attachment lifecycle.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        requesterId: requesterOwner.id,
      },
    });
    testTicketId = ticket.id;
    createdTicketIds.push(ticket.id);
  });

  afterAll(async () => {
    // Clean DB records
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

    // Clean any disk files written to server/uploads
    for (const file of createdDiskFiles) {
      if (fs.existsSync(file)) {
        try {
          fs.unlinkSync(file);
        } catch {
          // ignore
        }
      }
    }
  });

  // -------------------------------------------------------------------------
  // API-13: File > 5 MB rejected with 400
  // -------------------------------------------------------------------------
  it("API-13: POST /api/tickets/:id/attachments with file > 5 MB returns 400 Bad Request", async () => {
    const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024); // 5 MB + 1 KB

    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", String(requesterOwner.id))
      .attach("file", oversizedBuffer, "large.pdf");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Validation failed",
      details: {
        file: "File exceeds the 5 MB size limit",
      },
    });
  });

  // -------------------------------------------------------------------------
  // API-14: Disallowed type or spoofed extension rejected with 400
  // -------------------------------------------------------------------------
  it("API-14: POST /api/tickets/:id/attachments with disallowed extension returns 400 Bad Request", async () => {
    const textBuffer = Buffer.from("console.log('hello');");

    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", String(requesterOwner.id))
      .attach("file", textBuffer, "script.js");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Validation failed",
      details: {
        file: "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed",
      },
    });
  });

  it("API-14: POST /api/tickets/:id/attachments with spoofed content returns 400 Bad Request", async () => {
    // Named as .pdf but body is random text bytes (not %PDF)
    const spoofedBuffer = Buffer.from("NOT_A_REAL_PDF_HEADER_JUST_RANDOM_TEXT");

    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", String(requesterOwner.id))
      .attach("file", spoofedBuffer, "malicious.pdf");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Validation failed",
      details: {
        file: "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed",
      },
    });
  });

  it("API-14: POST /api/tickets/:id/attachments with short file (< 4 bytes) returns 400 Bad Request", async () => {
    const shortBuffer = Buffer.from("hi"); // 2 bytes

    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", String(requesterOwner.id))
      .attach("file", shortBuffer, "tiny.pdf");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Validation failed",
      details: {
        file: "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed",
      },
    });
  });

  // -------------------------------------------------------------------------
  // API-23: Cross-Requester upload attempt returns 403 Forbidden
  // -------------------------------------------------------------------------
  it("API-23: POST /api/tickets/:id/attachments cross-Requester upload returns 403 Forbidden", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", String(requesterOther.id))
      .attach("file", validPdfBuffer, "report.pdf");

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "Access denied: You do not own this ticket",
    });
  });

  // -------------------------------------------------------------------------
  // API-16: Valid file uploaded, returns 201 Created
  // -------------------------------------------------------------------------
  let uploadedAttachmentId: number;
  let storedDiskFileName: string;

  it("API-16: POST /api/tickets/:id/attachments valid file returns 201 Created and saves record", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", String(requesterOwner.id))
      .attach("file", validPdfBuffer, "diagnostic_log.pdf");

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      ticketId: testTicketId,
      fileName: "diagnostic_log.pdf",
      fileSize: validPdfBuffer.length,
      mimeType: "application/pdf",
      removedAt: null,
      removalReason: null,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.createdAt).toBeDefined();

    uploadedAttachmentId = res.body.id;
    createdAttachmentIds.push(uploadedAttachmentId);

    // Verify record in database
    const dbRecord = await prisma.attachment.findUnique({
      where: { id: uploadedAttachmentId },
    });
    expect(dbRecord).toBeTruthy();
    expect(dbRecord?.storedFileName).toBeDefined();
    storedDiskFileName = dbRecord!.storedFileName;

    // Track disk file for cleanup
    const diskPath = path.join(process.cwd(), "uploads", storedDiskFileName);
    const serverDiskPath = path.join(process.cwd(), "server", "uploads", storedDiskFileName);
    createdDiskFiles.push(diskPath, serverDiskPath);
  });

  // -------------------------------------------------------------------------
  // API-15: 6th active file rejected with 400
  // -------------------------------------------------------------------------
  it("API-15: POST /api/tickets/:id/attachments 6th active file rejected with 400", async () => {
    // Currently testTicketId has 1 active attachment. Upload 4 more to reach 5 active attachments.
    for (let i = 2; i <= 5; i++) {
      const res = await request(app)
        .post(`/api/tickets/${testTicketId}/attachments`)
        .set("X-Requester-Id", String(requesterOwner.id))
        .attach("file", validPngBuffer, `image_${i}.png`);

      expect(res.status).toBe(201);
      createdAttachmentIds.push(res.body.id);
    }

    // Attempting to upload the 6th active file
    const res6 = await request(app)
        .post(`/api/tickets/${testTicketId}/attachments`)
        .set("X-Requester-Id", String(requesterOwner.id))
        .attach("file", validPngBuffer, "image_6.png");

    expect(res6.status).toBe(400);
    expect(res6.body).toEqual({
      error: "Validation failed",
      details: {
        file: "This ticket already has 5 active attachments",
      },
    });
  });

  it("API-15 (concurrent): Concurrent uploads cannot exceed 5 active attachments limit", async () => {
    // Create a new ticket with 4 active attachments
    const concurrentTicket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        summary: "Concurrent Attachment Ticket",
        description: "Ticket to test race conditions during concurrent file uploads.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        requesterId: requesterOwner.id,
      },
    });
    createdTicketIds.push(concurrentTicket.id);

    // Seed 4 active attachments
    for (let i = 1; i <= 4; i++) {
      const att = await prisma.attachment.create({
        data: {
          ticketId: concurrentTicket.id,
          uploadedByRequesterId: requesterOwner.id,
          fileName: `existing_${i}.png`,
          fileSize: validPngBuffer.length,
          mimeType: "image/png",
          storedFileName: `test_existing_${i}.png`,
        },
      });
      createdAttachmentIds.push(att.id);
    }

    // Attempt 2 concurrent uploads at the same time
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/tickets/${concurrentTicket.id}/attachments`)
        .set("X-Requester-Id", String(requesterOwner.id))
        .attach("file", validPngBuffer, "concurrent_a.png"),
      request(app)
        .post(`/api/tickets/${concurrentTicket.id}/attachments`)
        .set("X-Requester-Id", String(requesterOwner.id))
        .attach("file", validPngBuffer, "concurrent_b.png"),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 400]);

    const successRes = resA.status === 201 ? resA : resB;
    const failedRes = resA.status === 400 ? resA : resB;

    createdAttachmentIds.push(successRes.body.id);
    if (successRes.body.storedFileName) {
      createdDiskFiles.push(
        path.join(process.cwd(), "uploads", successRes.body.storedFileName),
        path.join(process.cwd(), "server", "uploads", successRes.body.storedFileName)
      );
    }

    expect(failedRes.body).toEqual({
      error: "Validation failed",
      details: {
        file: "This ticket already has 5 active attachments",
      },
    });

    const activeCount = await prisma.attachment.count({
      where: { ticketId: concurrentTicket.id, removedAt: null },
    });
    expect(activeCount).toBe(5);
  });


  // -------------------------------------------------------------------------
  // API-32: GET /api/attachments/:id/download owned active file
  // -------------------------------------------------------------------------
  it("API-32: GET /api/attachments/:id/download owned active file streams bytes with Content-Disposition", async () => {
    const res = await request(app)
      .get(`/api/attachments/${uploadedAttachmentId}/download`)
      .set("X-Requester-Id", String(requesterOwner.id));

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toBe('attachment; filename="diagnostic_log.pdf"');
    expect(res.body).toEqual(validPdfBuffer);
  });

  // -------------------------------------------------------------------------
  // API-20: GET /api/attachments/:id/download cross-Requester returns 403 Forbidden
  // -------------------------------------------------------------------------
  it("API-20: GET /api/attachments/:id/download cross-Requester download returns 403 Forbidden", async () => {
    const res = await request(app)
      .get(`/api/attachments/${uploadedAttachmentId}/download`)
      .set("X-Requester-Id", String(requesterOther.id));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "Access denied: You do not own this attachment",
    });
  });

  // -------------------------------------------------------------------------
  // API-24: DELETE /api/attachments/:id missing/short removalReason returns 400
  // -------------------------------------------------------------------------
  it("API-24: DELETE /api/attachments/:id with empty or short reason (< 3 chars) returns 400", async () => {
    // Missing body or empty reason
    const res1 = await request(app)
      .delete(`/api/attachments/${uploadedAttachmentId}`)
      .set("X-Requester-Id", String(requesterOwner.id))
      .send({ removalReason: "  " });

    expect(res1.status).toBe(400);
    expect(res1.body).toEqual({
      error: "Validation failed",
      details: {
        removalReason: "A removal reason is required (3–200 characters)",
      },
    });

    // 2 characters
    const res2 = await request(app)
      .delete(`/api/attachments/${uploadedAttachmentId}`)
      .set("X-Requester-Id", String(requesterOwner.id))
      .send({ removalReason: "ab" });

    expect(res2.status).toBe(400);
    expect(res2.body).toEqual({
      error: "Validation failed",
      details: {
        removalReason: "A removal reason is required (3–200 characters)",
      },
    });

    // Over 200 characters
    const res3 = await request(app)
      .delete(`/api/attachments/${uploadedAttachmentId}`)
      .set("X-Requester-Id", String(requesterOwner.id))
      .send({ removalReason: "x".repeat(201) });

    expect(res3.status).toBe(400);
    expect(res3.body).toEqual({
      error: "Validation failed",
      details: {
        removalReason: "A removal reason is required (3–200 characters)",
      },
    });
  });

  // -------------------------------------------------------------------------
  // API-25: DELETE /api/attachments/:id cross-Requester removal returns 403
  // -------------------------------------------------------------------------
  it("API-25: DELETE /api/attachments/:id cross-Requester removal returns 403 Forbidden", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${uploadedAttachmentId}`)
      .set("X-Requester-Id", String(requesterOther.id))
      .send({ removalReason: "Trying to remove someone else's attachment" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "Access denied: You do not own this attachment",
    });
  });

  // -------------------------------------------------------------------------
  // API-17: DELETE /api/attachments/:id valid removal returns 200
  // -------------------------------------------------------------------------
  it("API-17: DELETE /api/attachments/:id valid removal sets removedAt and removalReason, returns 200", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${uploadedAttachmentId}`)
      .set("X-Requester-Id", String(requesterOwner.id))
      .send({ removalReason: "No longer needed diagnostic" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: uploadedAttachmentId,
      removalReason: "No longer needed diagnostic",
    });
    expect(res.body.removedAt).toBeDefined();

    // Verify in database: row still exists, removedAt is set
    const dbRecord = await prisma.attachment.findUnique({
      where: { id: uploadedAttachmentId },
    });
    expect(dbRecord).toBeTruthy();
    expect(dbRecord?.removedAt).not.toBeNull();
    expect(dbRecord?.removalReason).toBe("No longer needed diagnostic");
  });

  // -------------------------------------------------------------------------
  // API-18: DELETE /api/attachments/:id double removal returns 409 Conflict
  // -------------------------------------------------------------------------
  it("API-18: DELETE /api/attachments/:id double removal returns 409 Conflict", async () => {
    const res = await request(app)
      .delete(`/api/attachments/${uploadedAttachmentId}`)
      .set("X-Requester-Id", String(requesterOwner.id))
      .send({ removalReason: "Attempting duplicate removal" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: "This attachment has already been removed",
    });
  });

  // -------------------------------------------------------------------------
  // API-19: GET /api/attachments/:id/download on removed file returns 410 Gone
  // -------------------------------------------------------------------------
  it("API-19: GET /api/attachments/:id/download on removed file returns 410 Gone with no binary stream", async () => {
    const res = await request(app)
      .get(`/api/attachments/${uploadedAttachmentId}/download`)
      .set("X-Requester-Id", String(requesterOwner.id));

    expect(res.status).toBe(410);
    expect(res.body).toEqual({
      error: "This attachment has been removed and cannot be downloaded",
    });
  });

  // -------------------------------------------------------------------------
  // API-33: Missing resource behavior returns 404
  // -------------------------------------------------------------------------
  it("API-33: Missing ticket ID on upload returns 404", async () => {
    const res = await request(app)
      .post("/api/tickets/999999/attachments")
      .set("X-Requester-Id", String(requesterOwner.id))
      .attach("file", validPdfBuffer, "report.pdf");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Ticket not found",
    });
  });

  it("API-33: Missing attachment ID on download returns 404", async () => {
    const res = await request(app)
      .get("/api/attachments/999999/download")
      .set("X-Requester-Id", String(requesterOwner.id));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Attachment not found",
    });
  });

  it("API-33: Missing attachment ID on delete returns 404", async () => {
    const res = await request(app)
      .delete("/api/attachments/999999")
      .set("X-Requester-Id", String(requesterOwner.id))
      .send({ removalReason: "Removing ghost" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Attachment not found",
    });
  });

  // -------------------------------------------------------------------------
  // API-34: Disk write failure returns safe 500 without damaging ticket
  // -------------------------------------------------------------------------
  it("API-34: Storage failure returns 500 without damaging ticket", async () => {
    // Mock fs.promises.writeFile or fs.writeFileSync to throw error
    const spy = vi.spyOn(fs.promises, "writeFile").mockRejectedValueOnce(new Error("Disk full simulation"));

    const countBefore = await prisma.attachment.count({ where: { ticketId: testTicketId } });

    const res = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("X-Requester-Id", String(requesterOwner.id))
      .attach("file", validPdfBuffer, "failing_write.pdf");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: "Unable to save the attachment. Please try again.",
    });

    // Ticket still exists
    const ticketStillExists = await prisma.ticket.findUnique({ where: { id: testTicketId } });
    expect(ticketStillExists).toBeTruthy();

    // No new attachment record added
    const countAfter = await prisma.attachment.count({ where: { ticketId: testTicketId } });
    expect(countAfter).toBe(countBefore);

    spy.mockRestore();
  });
});
