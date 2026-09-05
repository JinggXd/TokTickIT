import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/tickets/:id (API-10, API-11, API-12)", () => {
  const prisma = getPrisma();

  let requesterOwner: { id: number; email: string };
  let requesterOther: { id: number; email: string };
  let categoryHardware: { id: number; name: string };
  let systemLaptop: { id: number; name: string };
  let ownedTicketId: number;
  let ownedTicketNo: string;

  const createdAttachmentIds: number[] = [];
  const createdTicketIds: number[] = [];
  const createdRequesterIds: number[] = [];

  beforeAll(async () => {
    // 1. Reference data
    const catH = await prisma.category.findFirst({ where: { name: "Hardware" } });
    const sysL = await prisma.relatedSystem.findFirst({ where: { name: "Corporate Laptop" } });
    expect(catH).toBeTruthy();
    expect(sysL).toBeTruthy();
    categoryHardware = catH!;
    systemLaptop = sysL!;

    // 2. Create isolated Requesters
    requesterOwner = await prisma.requesterUser.create({
      data: {
        name: "Owner Requester",
        email: `owner.${Date.now()}@test.local`,
        department: "Engineering",
        isActive: true,
      },
    });
    createdRequesterIds.push(requesterOwner.id);

    requesterOther = await prisma.requesterUser.create({
      data: {
        name: "Other Requester",
        email: `other.${Date.now()}@test.local`,
        department: "Marketing",
        isActive: true,
      },
    });
    createdRequesterIds.push(requesterOther.id);

    // 3. Create owned ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        summary: "Laptop battery drains quickly",
        description: "My laptop battery drains in less than an hour after the update.",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        requesterId: requesterOwner.id,
      },
    });
    ownedTicketId = ticket.id;
    ownedTicketNo = ticket.ticketNo;
    createdTicketIds.push(ticket.id);

    // 4. Attach sample active and removed attachments
    const attActive = await prisma.attachment.create({
      data: {
        ticketId: ownedTicketId,
        uploadedByRequesterId: requesterOwner.id,
        fileName: "battery_report.pdf",
        storedFileName: "20260901-test-battery-report.pdf",
        fileSize: 214532,
        mimeType: "application/pdf",
      },
    });
    createdAttachmentIds.push(attActive.id);

    const attRemoved = await prisma.attachment.create({
      data: {
        ticketId: ownedTicketId,
        uploadedByRequesterId: requesterOwner.id,
        fileName: "screenshot.png",
        storedFileName: "20260901-test-screenshot.png",
        fileSize: 88210,
        mimeType: "image/png",
        removedAt: new Date("2026-08-29T11:00:00.000Z"),
        removalReason: "Uploaded the wrong screenshot",
      },
    });
    createdAttachmentIds.push(attRemoved.id);
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

  it("API-10: GET /api/tickets/:id cross-Requester access returns 403 Forbidden with no ticket fields", async () => {
    // requesterOther tries to view ticket owned by requesterOwner
    const res = await request(app)
      .get(`/api/tickets/${ownedTicketId}`)
      .set("X-Requester-Id", String(requesterOther.id));

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: "Access denied: You do not own this ticket",
    });
    // Critical: No ticket details leaked
    expect(res.body.ticketNo).toBeUndefined();
    expect(res.body.summary).toBeUndefined();
    expect(res.body.description).toBeUndefined();
    expect(res.body.attachments).toBeUndefined();
  });

  it("API-11: GET /api/tickets/:id nonexistent ID returns 404 Not Found", async () => {
    const nonExistentId = 99999999;
    const res = await request(app)
      .get(`/api/tickets/${nonExistentId}`)
      .set("X-Requester-Id", String(requesterOwner.id));

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: "Ticket not found",
    });
  });

  it("API-12: GET /api/tickets/:id owned ticket returns 200 OK with full attachments array", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ownedTicketId}`)
      .set("X-Requester-Id", String(requesterOwner.id));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: ownedTicketId,
      ticketNo: ownedTicketNo,
      summary: "Laptop battery drains quickly",
      description: "My laptop battery drains in less than an hour after the update.",
      categoryName: "Hardware",
      relatedSystemName: "Corporate Laptop",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      ticketOwnerName: "Unassigned",
      requesterId: requesterOwner.id,
    });
    expect(res.body.createdAt).toBeDefined();
    expect(res.body.updatedAt).toBeDefined();
    expect(Array.isArray(res.body.attachments)).toBe(true);
    expect(res.body.attachments).toHaveLength(2);

    const active = res.body.attachments.find((a: any) => a.fileName === "battery_report.pdf");
    expect(active).toBeDefined();
    expect(active.fileSize).toBe(214532);
    expect(active.mimeType).toBe("application/pdf");
    expect(active.removedAt).toBeNull();
    expect(active.removalReason).toBeNull();

    const removed = res.body.attachments.find((a: any) => a.fileName === "screenshot.png");
    expect(removed).toBeDefined();
    expect(removed.fileSize).toBe(88210);
    expect(removed.mimeType).toBe("image/png");
    expect(removed.removedAt).toBeDefined();
    expect(removed.removalReason).toBe("Uploaded the wrong screenshot");
  });

  it("GET /api/tickets/:id with invalid/malformed ID returns 400 Bad Request", async () => {
    const res = await request(app)
      .get("/api/tickets/abc")
      .set("X-Requester-Id", String(requesterOwner.id));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Invalid ticket ID",
    });
  });

  it("GET /api/tickets/:id with missing X-Requester-Id returns 401", async () => {
    const res = await request(app).get(`/api/tickets/${ownedTicketId}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: "Requester context is missing or invalid",
    });
  });
});
