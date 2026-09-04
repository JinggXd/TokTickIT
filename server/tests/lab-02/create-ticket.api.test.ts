import request from "supertest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import * as ticketNumberUtil from "../../src/utils/ticketNumber.js";

describe("POST /api/tickets (API-01 to API-05, API-21, API-28, API-29)", () => {
  const prisma = getPrisma();

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // API-01 — AC-01, AC-03; BR-02, BR-16, BR-17: valid creation
  it("API-01: creates a new ticket with 201 Created and backend-issued fields", async () => {
    // Find an active requester, category, and related system
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    expect(requester).toBeTruthy();
    expect(category).toBeTruthy();
    expect(relatedSystem).toBeTruthy();

    const payload = {
      summary: "Printer in 4th floor finance cannot connect",
      description: "Finance department printer is offline and showing paper jam error since morning.",
      categoryId: category!.id,
      relatedSystemId: relatedSystem!.id,
      requestedPriority: "HIGH",
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requester!.id))
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(typeof res.body.id).toBe("number");
    expect(res.body.ticketNo).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.summary).toBe(payload.summary);
    expect(res.body.description).toBe(payload.description);
    expect(res.body.requestedPriority).toBe("HIGH");
    expect(res.body.itPriority).toBe("HIGH"); // BR-16: itPriority = requestedPriority
    expect(res.body.currentStatus).toBe("NEW"); // BR-02: always starts NEW
    expect(res.body.requesterId).toBe(requester!.id);
    expect(new Date(res.body.createdAt).toString()).not.toBe("Invalid Date");

    // Verify persisted in database
    const saved = await prisma.ticket.findUnique({ where: { id: res.body.id } });
    expect(saved).toBeTruthy();
    expect(saved?.ticketOwnerId).toBeNull(); // BR-17: unassigned
  });

  // API-02 — AC-04: missing / invalid fields
  it("API-02: returns 400 with details object naming all invalid fields at once", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requester!.id))
      .send({
        summary: "123", // too short (< 5)
        description: "short", // too short (< 10)
        // missing categoryId, relatedSystemId, requestedPriority
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(res.body).toHaveProperty("details");
    expect(res.body.details).toHaveProperty("summary");
    expect(res.body.details).toHaveProperty("description");
    expect(res.body.details).toHaveProperty("categoryId");
    expect(res.body.details).toHaveProperty("relatedSystemId");
    expect(res.body.details).toHaveProperty("requestedPriority");
  });

  // API-03 — AC-18: missing header -> 401 without details
  it("API-03: returns 401 Unauthorized without details key when X-Requester-Id is missing", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .send({
        summary: "Valid summary here",
        description: "Valid description here for testing.",
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "LOW",
      });

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty("details");
    expect(res.body).toHaveProperty("error");
  });

  // API-04 — AC-18: malformed header -> 400 without details
  it("API-04: returns 400 Bad Request without details key when header is malformed (e.g. abc)", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "abc")
      .send({
        summary: "Valid summary here",
        description: "Valid description here for testing.",
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "LOW",
      });

    expect(res.status).toBe(400);
    expect(res.body).not.toHaveProperty("details");
    expect(res.body).toHaveProperty("error");
  });

  // API-05 — AC-18: header with inactive requester -> 401
  it("API-05: returns 401 Unauthorized without details key when requester is inactive", async () => {
    const inactive = await prisma.requesterUser.findFirst({ where: { isActive: false } });
    expect(inactive).toBeTruthy();

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(inactive!.id))
      .send({
        summary: "Valid summary here",
        description: "Valid description here for testing.",
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "LOW",
      });

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty("details");
    expect(res.body).toHaveProperty("error");
  });

  // API-28 — AC-18, BR-06: header with unknown requester ID -> 401
  it("API-28: returns 401 Unauthorized without details key when requester ID does not exist", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", "999999")
      .send({
        summary: "Valid summary here",
        description: "Valid description here for testing.",
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "LOW",
      });

    expect(res.status).toBe(401);
    expect(res.body).not.toHaveProperty("details");
    expect(res.body).toHaveProperty("error");
  });

  // API-29 — AC-04: nonexistent or inactive category or related system -> 400 with details
  it("API-29: returns 400 with details when category or related system does not exist or is inactive", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requester!.id))
      .send({
        summary: "Valid summary here",
        description: "Valid description with plenty of characters.",
        categoryId: 999999, // nonexistent
        relatedSystemId: 999999, // nonexistent
        requestedPriority: "MEDIUM",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(res.body).toHaveProperty("details");
    expect(res.body.details.categoryId).toMatch(/exist|inactive/i);
    expect(res.body.details.relatedSystemId).toMatch(/exist|inactive/i);
  });

  // API-21 — BR-01: ticket-number collision retries exhausted -> 500
  it("API-21: returns 500 when ticket-number generation retries are exhausted", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // Mock generateTicketNumber to throw TicketNumberGenerationError
    vi.spyOn(ticketNumberUtil, "generateTicketNumber").mockRejectedValueOnce(
      new ticketNumberUtil.TicketNumberGenerationError("Unable to generate a unique ticket number after 3 attempts")
    );

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requester!.id))
      .send({
        summary: "Another valid summary",
        description: "Detailed description that passes validation.",
        categoryId: category!.id,
        relatedSystemId: relatedSystem!.id,
        requestedPriority: "LOW",
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Unable to create ticket. Please try again.");
    expect(res.body).not.toHaveProperty("details");
  });
});
