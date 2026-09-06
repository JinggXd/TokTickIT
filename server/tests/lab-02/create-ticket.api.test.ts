import request from "supertest";
import { describe, it, expect, vi, afterEach } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

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
    expect(res.body.details).toEqual({
      summary: "Summary must be between 5 and 100 characters",
      description: "Description must be between 10 and 2000 characters",
      categoryId: "Category is required",
      relatedSystemId: "Related system is required",
      requestedPriority: "Requested priority must be LOW, MEDIUM, or HIGH",
    });
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
    expect(res.body).toEqual({ error: "Requester context is missing or invalid" });
    expect(res.body).not.toHaveProperty("details");
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
    expect(res.body).toEqual({ error: "Bad Request: Malformed X-Requester-Id header" });
    expect(res.body).not.toHaveProperty("details");
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
    expect(res.body).toEqual({ error: "Requester context is missing or invalid" });
    expect(res.body).not.toHaveProperty("details");
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
    expect(res.body).toEqual({ error: "Requester context is missing or invalid" });
    expect(res.body).not.toHaveProperty("details");
  });

  // API-29 — AC-04: nonexistent, inactive, and simultaneous syntax + reference errors
  it("API-29: returns 400 with details when category or related system does not exist or is inactive, collecting all errors", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });

    // 1. Nonexistent IDs with simultaneous syntax error on summary (Finding 3)
    const resNonexistent = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requester!.id))
      .send({
        summary: "123", // syntax error: < 5 chars
        description: "Valid description with plenty of characters.",
        categoryId: 999999, // nonexistent reference
        relatedSystemId: 999999, // nonexistent reference
        requestedPriority: "MEDIUM",
      });

    expect(resNonexistent.status).toBe(400);
    expect(resNonexistent.body.error).toBe("Validation failed");
    expect(resNonexistent.body.details).toEqual({
      summary: "Summary must be between 5 and 100 characters",
      categoryId: "Category does not exist or is inactive",
      relatedSystemId: "Related system does not exist or is inactive",
    });

    // 2. Inactive Category & Inactive Related System (Finding 8)
    const inactiveCat = await prisma.category.upsert({
      where: { name: "Inactive Test Category" },
      update: { isActive: false },
      create: { name: "Inactive Test Category", isActive: false },
    });
    const inactiveSys = await prisma.relatedSystem.upsert({
      where: { name: "Inactive Test System" },
      update: { isActive: false },
      create: { name: "Inactive Test System", isActive: false },
    });

    const resInactive = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requester!.id))
      .send({
        summary: "Valid summary for inactive test",
        description: "Valid description for inactive category test.",
        categoryId: inactiveCat.id,
        relatedSystemId: inactiveSys.id,
        requestedPriority: "LOW",
      });

    expect(resInactive.status).toBe(400);
    expect(resInactive.body.error).toBe("Validation failed");
    expect(resInactive.body.details.categoryId).toBe("Category does not exist or is inactive");
    expect(resInactive.body.details.relatedSystemId).toBe("Related system does not exist or is inactive");
  });

  // API-21 — BR-01: ticket-number collision retries 3 times before 500
  it("API-21: retries ticket creation 3 times on collision before returning 500", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

    // Mock prisma.ticket.create to simulate unique constraint collision (P2002 on ticketNo)
    const p2002Collision = {
      code: "P2002",
      meta: { target: ["ticketNo"] },
    };
    const createSpy = vi.spyOn(prisma.ticket, "create").mockRejectedValue(p2002Collision);

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requester!.id))
      .send({
        summary: "Collision test ticket",
        description: "Detailed description that triggers collision retry.",
        categoryId: category!.id,
        relatedSystemId: relatedSystem!.id,
        requestedPriority: "LOW",
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Unable to create ticket. Please try again." });
    expect(res.body).not.toHaveProperty("details");

    // Verify it retried exactly 3 times before giving up
    expect(createSpy).toHaveBeenCalledTimes(3);
  });

  // Regression: JSON null body returns 400 with details
  it("API-02 (regression): returns 400 when body is null or array", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requester!.id))
      .set("Content-Type", "application/json")
      .send("null");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(res.body).toHaveProperty("details");
    expect(res.body.details.summary).toBe("Summary is required");
  });

  // Regression: string and boolean categoryId / relatedSystemId rejected
  it("API-02 (regression): rejects string and boolean categoryId and relatedSystemId", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requester!.id))
      .send({
        summary: "Valid summary here",
        description: "Valid description here for testing.",
        categoryId: "1",
        relatedSystemId: true,
        requestedPriority: "LOW",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation failed");
    expect(res.body.details.categoryId).toBe("Category is required");
    expect(res.body.details.relatedSystemId).toBe("Related system is required");
  });

  // Regression: unexpected database error during lookup returns flat 500
  it("API-02 (regression): returns flat 500 when category lookup fails unexpectedly", async () => {
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    vi.spyOn(prisma.category, "findUnique").mockRejectedValue(new Error("Database disconnected"));

    const res = await request(app)
      .post("/api/tickets")
      .set("X-Requester-Id", String(requester!.id))
      .send({
        summary: "Valid summary here",
        description: "Valid description here for testing.",
        categoryId: 1,
        relatedSystemId: 1,
        requestedPriority: "LOW",
      });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Unable to create ticket. Please try again." });
    expect(res.body).not.toHaveProperty("details");
  });
});
