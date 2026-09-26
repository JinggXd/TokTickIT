import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionHeaders } from "../helpers/session.js";
import { requireTestEnvironment } from "../../src/config/testEnvironment.js";
import { ALL_STATUSES, ALLOWED_TRANSITIONS, TicketStatus } from "../../src/utils/workflow.js";

describe("Phase F2 / L4-P06: Ticket Workflow & Resolution Gate", () => {
  const prisma = getPrisma();

  let staffAlex: any;
  let headersAlex: Record<string, string>;
  let requester: any;
  let category: any;
  let system: any;

  const createdTicketIds: number[] = [];

  beforeAll(async () => {
    requireTestEnvironment();

    staffAlex = await prisma.user.findFirstOrThrow({
      where: { role: "IT_STAFF", email: "staff1@example.com" },
    });
    headersAlex = await sessionHeaders(staffAlex.id);

    requester = await prisma.user.findFirstOrThrow({
      where: { role: "REQUESTER", isActive: true },
    });
    category = await prisma.category.findFirstOrThrow();
    system = await prisma.relatedSystem.findFirstOrThrow();
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await (prisma as any).actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.publicComment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.internalNote.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
  });

  async function createTestTicket(currentStatus: TicketStatus = "IN_PROGRESS", withOwner = true) {
    const ticket = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`,
        summary: "Workflow test ticket",
        description: "Testing status transitions",
        categoryId: category.id,
        relatedSystemId: system.id,
        requesterId: requester.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus,
        ticketOwnerId: withOwner ? staffAlex.id : null,
      },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
  }

  it("API-L4-18: Transition ticket to RESOLVED with 0 actions taken returns 422 RESOLUTION_GATE_FAILED", async () => {
    const ticket = await createTestTicket("IN_PROGRESS", true);

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set(headersAlex)
      .send({
        status: "RESOLVED",
        expectedVersion: ticket.version,
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("RESOLUTION_GATE_FAILED");
    expect(res.body.message).toMatch(/at least one completed Action Taken/i);
  });

  it("API-L4-19: Transition ticket to RESOLVED with only PENDING actions taken returns 422 RESOLUTION_GATE_FAILED", async () => {
    const ticket = await createTestTicket("IN_PROGRESS", true);

    // Add 1 pending action
    await (prisma as any).actionTaken.create({
      data: {
        ticketId: ticket.id,
        createdById: staffAlex.id,
        actionDescription: "Pending investigation",
        status: "PENDING",
        clientRequestId: "req-pending-" + Date.now(),
        requestPayloadHash: "dummy",
      },
    });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set(headersAlex)
      .send({
        status: "RESOLVED",
        expectedVersion: ticket.version,
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("RESOLUTION_GATE_FAILED");
    expect(res.body.message).toMatch(/no pending actions/i);
  });

  it("API-L4-20: Transition ticket to RESOLVED with >= 1 COMPLETED and 0 PENDING succeeds (200 OK)", async () => {
    const ticket = await createTestTicket("IN_PROGRESS", true);

    // Add 1 completed action
    await (prisma as any).actionTaken.create({
      data: {
        ticketId: ticket.id,
        createdById: staffAlex.id,
        performedById: staffAlex.id,
        actionDescription: "Completed repair",
        result: "Device fixed and operational",
        status: "COMPLETED",
        clientRequestId: "req-comp-" + Date.now(),
        requestPayloadHash: "dummy",
      },
    });

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set(headersAlex)
      .send({
        status: "RESOLVED",
        expectedVersion: ticket.version,
      });

    expect(res.status).toBe(200);
    expect(res.body.currentStatus).toBe("RESOLVED");
    expect(res.body.version).toBe(ticket.version + 1);
  });

  it("API-L4-21: Transition ticket status with stale expectedVersion returns 409 CONFLICT", async () => {
    const ticket = await createTestTicket("IN_PROGRESS", true);

    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set(headersAlex)
      .send({
        status: "WAITING_FOR_REQUESTER",
        expectedVersion: 999, // Stale version
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("CONFLICT");
    expect(res.body.currentVersion).toBe(ticket.version);
  });

  it("API-L4-23a: Resolution race: Action create fails with 400 if ticket is already RESOLVED", async () => {
    const ticket = await createTestTicket("RESOLVED", true);

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Action on resolved ticket",
        status: "COMPLETED",
        result: "Should fail",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("BAD_REQUEST");
  });

  it("API-L4-23b: Resolution race: Concurrent action create and status transition resolve safely under row lock", async () => {
    const ticket = await createTestTicket("IN_PROGRESS", true);

    // Pre-create 1 completed action so the resolution gate (>=1 completed action, 0 pending) is satisfied
    await (prisma as any).actionTaken.create({
      data: {
        ticketId: ticket.id,
        createdById: staffAlex.id,
        performedById: staffAlex.id,
        actionDescription: "Pre-existing completed diagnostic",
        status: "COMPLETED",
        result: "Diagnosis confirmed",
        clientRequestId: "pre-action-" + Date.now(),
        requestPayloadHash: "pre-hash",
      },
    });

    const currentTicket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });
    const initialVersion = currentTicket.version;

    // Both requests dispatched concurrently via Promise.all
    const [actionRes, statusRes] = await Promise.all([
      request(app)
        .post(`/api/tickets/${ticket.id}/actions`)
        .set(headersAlex)
        .send({
          actionDescription: "Concurrent action created",
          status: "COMPLETED",
          result: "Increments parent ticket version",
        }),
      request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set(headersAlex)
        .send({
          status: "RESOLVED",
          expectedVersion: initialVersion,
        }),
    ]);

    // Under row-level locking (SELECT ... FOR UPDATE) and optimistic concurrency:
    // If action commits first -> actionRes is 201, statusRes gets 409 CONFLICT (version mismatch)
    // If status transition commits first -> statusRes is 200 (resolution gate passes), actionRes gets 400 BAD_REQUEST (ticket resolved)
    if (actionRes.status === 201) {
      expect(statusRes.status).toBe(409);
      expect(statusRes.body.error).toBe("CONFLICT");
    } else {
      expect(statusRes.status).toBe(200);
      expect(actionRes.status).toBe(400);
      expect(actionRes.body.error).toBe("BAD_REQUEST");
    }
  });

  it("API-L4-23c: Parent Close/Cancel race: Action mutation fails with 400 if ticket closed concurrently", async () => {
    const ticket = await createTestTicket("CLOSED", true);

    const res = await request(app)
      .post(`/api/tickets/${ticket.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Action on closed ticket",
        status: "COMPLETED",
        result: "Should fail",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("BAD_REQUEST");
  });

  it("API-L4-25a: Status transitions matrix: verify all 17 permitted transitions", async () => {
    for (const [from, allowedList] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const to of allowedList) {
        // Setup ticket in `from` status with eligible owner
        const ticket = await createTestTicket(from as TicketStatus, true);

        // If transitioning to RESOLVED, ensure resolution gate conditions are met
        if (to === "RESOLVED") {
          await (prisma as any).actionTaken.create({
            data: {
              ticketId: ticket.id,
              createdById: staffAlex.id,
              performedById: staffAlex.id,
              actionDescription: "Resolution gate pass",
              result: "Fixed",
              status: "COMPLETED",
              clientRequestId: "gate-" + Date.now() + Math.random(),
              requestPayloadHash: "hash",
            },
          });
        }

        const res = await request(app)
          .patch(`/api/staff/tickets/${ticket.id}/status`)
          .set(headersAlex)
          .send({
            status: to,
            expectedVersion: ticket.version,
          });

        expect(res.status, `Transition ${from} -> ${to} should succeed`).toBe(200);
        expect(res.body.currentStatus).toBe(to);
      }
    }
  });

  it("API-L4-25b: Status transitions matrix: verify all 47 rejected transitions", async () => {
    for (const from of ALL_STATUSES) {
      const allowed = new Set(ALLOWED_TRANSITIONS[from]);
      for (const to of ALL_STATUSES) {
        if (!allowed.has(to) && from !== to) {
          const ticket = await createTestTicket(from, true);

          const res = await request(app)
            .patch(`/api/staff/tickets/${ticket.id}/status`)
            .set(headersAlex)
            .send({
              status: to,
              expectedVersion: ticket.version,
            });

          expect(res.status, `Transition ${from} -> ${to} should be rejected`).toBe(400);
          expect(res.body.error).toBe("ILLEGAL_STATUS_TRANSITION");
        }
      }
    }
  });

  it("API-L4-26: Transition requiring owner without eligible owner assigned returns 400 ELIGIBLE_OWNER_REQUIRED", async () => {
    // Ticket without owner in NEW
    const ticket = await createTestTicket("NEW", false);

    // Transitioning to OPEN requires an eligible owner
    const res = await request(app)
      .patch(`/api/staff/tickets/${ticket.id}/status`)
      .set(headersAlex)
      .send({
        status: "OPEN",
        expectedVersion: ticket.version,
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("ELIGIBLE_OWNER_REQUIRED");
  });
});
