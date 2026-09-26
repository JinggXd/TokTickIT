import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionHeaders } from "../helpers/session.js";
import { requireTestEnvironment } from "../../src/config/testEnvironment.js";

describe("Phase F2 / L4-P04: Actions Taken REST API & Authorization", () => {
  const prisma = getPrisma();

  let requesterA: any;
  let requesterB: any;
  let staffAlex: any;
  let staffBrian: any;
  let staffInactive: any;
  let adminUser: any;

  let headersReqA: Record<string, string>;
  let headersReqB: Record<string, string>;
  let headersAlex: Record<string, string>;
  let headersBrian: Record<string, string>;
  let headersAdmin: Record<string, string>;

  let testTicketOpen: any;
  let testTicketResolved: any;
  let testTicketB: any;

  const createdTicketIds: number[] = [];
  const createdActionIds: number[] = [];

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
    staffBrian = await prisma.user.findFirstOrThrow({
      where: { role: "IT_STAFF", email: "staff2@example.com" },
    });
    staffInactive = await prisma.user.findFirstOrThrow({
      where: { role: "IT_STAFF", email: "staff.inactive@example.com" },
    });
    adminUser = await prisma.user.findFirstOrThrow({
      where: { role: "ADMINISTRATOR", email: "admin@example.com" },
    });

    headersReqA = await sessionHeaders(requesterA.id);
    headersReqB = await sessionHeaders(requesterB.id);
    headersAlex = await sessionHeaders(staffAlex.id);
    headersBrian = await sessionHeaders(staffBrian.id);
    headersAdmin = await sessionHeaders(adminUser.id);

    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();

    // Create disposable tickets for testing
    testTicketOpen = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${Date.now().toString().slice(-6)}`,
        summary: "Actions Taken Test Ticket Open",
        description: "Open ticket for testing actions API",
        categoryId: category.id,
        relatedSystemId: system.id,
        requesterId: requesterA.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "IN_PROGRESS",
        ticketOwnerId: staffAlex.id,
      },
    });
    createdTicketIds.push(testTicketOpen.id);

    // Create an internal note to verify confidentiality check API-L4-17
    await prisma.internalNote.create({
      data: {
        ticketId: testTicketOpen.id,
        authorId: staffAlex.id,
        body: "SUPER_SECRET_INTERNAL_NOTE_12345",
      },
    });

    testTicketResolved = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${(Date.now() + 1).toString().slice(-6)}`,
        summary: "Actions Taken Test Ticket Resolved",
        description: "Resolved ticket for testing terminal locks",
        categoryId: category.id,
        relatedSystemId: system.id,
        requesterId: requesterA.id,
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "RESOLVED",
        ticketOwnerId: staffAlex.id,
        appearsResolvedById: staffAlex.id,
        appearsResolvedAt: new Date(),
      },
    });
    createdTicketIds.push(testTicketResolved.id);

    testTicketB = await prisma.ticket.create({
      data: {
        ticketNo: `TKT-2026-${(Date.now() + 2).toString().slice(-6)}`,
        summary: "Requester B Ticket",
        description: "Ticket owned by requester B",
        categoryId: category.id,
        relatedSystemId: system.id,
        requesterId: requesterB.id,
        requestedPriority: "LOW",
        itPriority: "LOW",
        currentStatus: "NEW",
      },
    });
    createdTicketIds.push(testTicketB.id);
  });

  afterAll(async () => {
    if (createdActionIds.length > 0) {
      await (prisma as any).actionTaken.deleteMany({
        where: { id: { in: createdActionIds } },
      });
    }
    if (createdTicketIds.length > 0) {
      await prisma.publicComment.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.internalNote.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await (prisma as any).actionTaken.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
  });

  it("API-L4-01: Create completed Action Taken with valid data", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Checked switch port and replaced patch cord",
        status: "COMPLETED",
        result: "Port link established, 1Gbps full duplex",
        attachmentNotes: "IMG_0012.JPG showing patch panel",
      });

    expect(res.status).toBe(201);
    expect(res.body.action).toBeDefined();
    expect(res.body.action.status).toBe("COMPLETED");
    expect(res.body.action.createdById).toBe(staffAlex.id);
    expect(res.body.action.performedBy?.id).toBe(staffAlex.id);
    expect(res.body.action.result).toBe("Port link established, 1Gbps full duplex");
    expect(res.body.action.version).toBe(1);
    createdActionIds.push(res.body.action.id);
  });

  it("API-L4-02: Create pending Action Taken with active staff assignee", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Order replacement SFP module",
        status: "PENDING",
        assigneeId: staffBrian.id,
        followUpRequired: true,
        followUpNote: "Install module when shipment arrives",
      });

    expect(res.status).toBe(201);
    expect(res.body.action.status).toBe("PENDING");
    expect(res.body.action.assignee?.id).toBe(staffBrian.id);
    expect(res.body.action.performedBy).toBeNull();
    expect(res.body.action.followUpRequired).toBe(true);
    expect(res.body.action.followUpNote).toBe("Install module when shipment arrives");
    createdActionIds.push(res.body.action.id);
  });

  it("API-L4-03: Create or reassign Action Taken targeting inactive or non-staff assignee returns 422", async () => {
    // 1. Inactive staff
    const resInactive = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Assigned to inactive",
        status: "PENDING",
        assigneeId: staffInactive.id,
      });
    expect(resInactive.status).toBe(422);
    expect(resInactive.body.error).toBe("INVALID_ASSIGNEE");

    // 2. Non-staff user (requester)
    const resRequester = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Assigned to requester",
        status: "PENDING",
        assigneeId: requesterA.id,
      });
    expect(resRequester.status).toBe(422);
    expect(resRequester.body.error).toBe("INVALID_ASSIGNEE");
  });

  it("API-L4-04: Create Action Taken with followUpRequired=true without note returns 400", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Action with missing follow-up note",
        status: "PENDING",
        followUpRequired: true,
      });
    expect(res.status).toBe(400);
  });

  it("API-L4-05: Create completed Action Taken without result returns 400", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Completed action without result",
        status: "COMPLETED",
      });
    expect(res.status).toBe(400);
  });

  it("API-L4-06: Create Action Taken with future actionDateTime (> now + 5m) returns 400", async () => {
    const futureDate = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const res = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Action with far future date",
        status: "COMPLETED",
        result: "Done in the future",
        actionDateTime: futureDate,
      });
    expect(res.status).toBe(400);
  });

  it("API-L4-07: Transition pending action to completed with result & expectedVersion", async () => {
    // First create a pending action
    const createRes = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Pending action to complete",
        status: "PENDING",
      });
    expect(createRes.status).toBe(201);
    const actionId = createRes.body.action.id;
    createdActionIds.push(actionId);

    const ticketBefore = await prisma.ticket.findUnique({ where: { id: testTicketOpen.id } });

    // Complete it by Staff Brian
    const completeRes = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions/${actionId}/complete`)
      .set(headersBrian)
      .send({
        result: "Brian finished this work successfully",
        expectedVersion: 1,
      });

    expect(completeRes.status).toBe(200);
    expect(completeRes.body.action.status).toBe("COMPLETED");
    expect(completeRes.body.action.performedBy?.id).toBe(staffBrian.id);
    expect(completeRes.body.action.result).toBe("Brian finished this work successfully");
    expect(completeRes.body.action.version).toBe(2);

    // Verify parent ticket version incremented
    const ticketAfter = await prisma.ticket.findUnique({ where: { id: testTicketOpen.id } });
    expect(ticketAfter!.version).toBe(ticketBefore!.version + 1);
  });

  it("API-L4-07b: Complete pending action with invalid or non-string result returns 400 VALIDATION_FAILED", async () => {
    const createRes = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Pending action for validation test",
        status: "PENDING",
      });
    expect(createRes.status).toBe(201);
    const actionId = createRes.body.action.id;
    createdActionIds.push(actionId);

    // Number type
    const resNumber = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions/${actionId}/complete`)
      .set(headersBrian)
      .send({
        result: 123,
        expectedVersion: 1,
      });
    expect(resNumber.status).toBe(400);
    expect(resNumber.body.error).toBe("VALIDATION_FAILED");

    // Boolean type
    const resBool = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions/${actionId}/complete`)
      .set(headersBrian)
      .send({
        result: true,
        expectedVersion: 1,
      });
    expect(resBool.status).toBe(400);
    expect(resBool.body.error).toBe("VALIDATION_FAILED");

    // Empty or whitespace-only string
    const resEmpty = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions/${actionId}/complete`)
      .set(headersBrian)
      .send({
        result: "   ",
        expectedVersion: 1,
      });
    expect(resEmpty.status).toBe(400);
    expect(resEmpty.body.error).toBe("VALIDATION_FAILED");
  });

  it("API-L4-08: Cancel pending action with expectedVersion", async () => {
    const createRes = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Pending action to cancel",
        status: "PENDING",
      });
    expect(createRes.status).toBe(201);
    const actionId = createRes.body.action.id;
    createdActionIds.push(actionId);

    const cancelRes = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions/${actionId}/cancel`)
      .set(headersAlex)
      .send({
        expectedVersion: 1,
        reason: "Duplicate task request",
      });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.action.status).toBe("CANCELLED");
    expect(cancelRes.body.action.version).toBe(2);
  });

  it("API-L4-09: Attempt transition of completed or cancelled action back to pending returns 400", async () => {
    // Create completed action
    const createRes = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Completed action",
        status: "COMPLETED",
        result: "All done",
      });
    const actionId = createRes.body.action.id;
    createdActionIds.push(actionId);

    const patchRes = await request(app)
      .patch(`/api/tickets/${testTicketOpen.id}/actions/${actionId}`)
      .set(headersAlex)
      .send({
        status: "PENDING",
        expectedVersion: 1,
      });
    expect(patchRes.status).toBe(400);
  });

  it("API-L4-10a: Attempt creating action on a RESOLVED, CLOSED, or CANCELLED ticket returns 400", async () => {
    const res = await request(app)
      .post(`/api/tickets/${testTicketResolved.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Attempt to add action on resolved ticket",
        status: "COMPLETED",
        result: "Should fail",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("BAD_REQUEST");
  });

  it("API-L4-10b: Attempt editing, completing, or cancelling action on RESOLVED ticket returns 400", async () => {
    // Manually insert an action directly under the resolved ticket to simulate pre-existing action
    const action = await (prisma as any).actionTaken.create({
      data: {
        ticketId: testTicketResolved.id,
        createdById: staffAlex.id,
        actionDescription: "Existing action on resolved ticket",
        status: "PENDING",
        clientRequestId: "seed-test-" + Date.now(),
        requestPayloadHash: "dummyhash",
      },
    });
    createdActionIds.push(action.id);

    const patchRes = await request(app)
      .patch(`/api/tickets/${testTicketResolved.id}/actions/${action.id}`)
      .set(headersAlex)
      .send({ actionDescription: "Updated desc", expectedVersion: 1 });
    expect(patchRes.status).toBe(400);

    const completeRes = await request(app)
      .post(`/api/tickets/${testTicketResolved.id}/actions/${action.id}/complete`)
      .set(headersAlex)
      .send({ result: "Done", expectedVersion: 1 });
    expect(completeRes.status).toBe(400);

    const cancelRes = await request(app)
      .post(`/api/tickets/${testTicketResolved.id}/actions/${action.id}/cancel`)
      .set(headersAlex)
      .send({ expectedVersion: 1 });
    expect(cancelRes.status).toBe(400);
  });

  it("API-L4-11: Requester lists actions on owned ticket", async () => {
    const res = await request(app)
      .get(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersReqA);

    expect(res.status).toBe(200);
    expect(res.body.ticketId).toBe(testTicketOpen.id);
    expect(Array.isArray(res.body.actions)).toBe(true);
    expect(res.body.actions.length).toBeGreaterThanOrEqual(1);
  });

  it("API-L4-12: Requester attempts to create, edit, complete, or cancel an action returns 403", async () => {
    const postRes = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersReqA)
      .send({ actionDescription: "Requester action", status: "COMPLETED", result: "Done" });
    expect(postRes.status).toBe(403);

    const dummyActionId = createdActionIds[0];
    const patchRes = await request(app)
      .patch(`/api/tickets/${testTicketOpen.id}/actions/${dummyActionId}`)
      .set(headersReqA)
      .send({ actionDescription: "Requester edit" });
    expect(patchRes.status).toBe(403);
  });

  it("API-L4-13: Requester attempts to list actions on another user's ticket returns 403", async () => {
    const res = await request(app)
      .get(`/api/tickets/${testTicketB.id}/actions`)
      .set(headersReqA); // User A accessing User B's ticket

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Access denied: You do not own this ticket" });
  });

  it("API-L4-14: Mismatched actionId in URL path returns 404", async () => {
    const actionId = createdActionIds[0];
    // testTicketB does not own actionId
    const res = await request(app)
      .patch(`/api/tickets/${testTicketB.id}/actions/${actionId}`)
      .set(headersAlex)
      .send({ actionDescription: "Mismatch test", expectedVersion: 1 });
    expect(res.status).toBe(404);
  });

  it("API-L4-14b: Closed/resolved ticket with mismatched or non-existent actionId returns 404 (not 400)", async () => {
    const openTicketActionId = createdActionIds[0]; // Belongs to testTicketOpen, NOT testTicketResolved

    // 1. PATCH with mismatched actionId on resolved ticket returns 404 (precedence over 400 terminal lock)
    const patchRes = await request(app)
      .patch(`/api/tickets/${testTicketResolved.id}/actions/${openTicketActionId}`)
      .set(headersAlex)
      .send({ actionDescription: "Mismatch on resolved", expectedVersion: 1 });
    expect(patchRes.status).toBe(404);
    expect(patchRes.body.error).toBe("NOT_FOUND");

    // 2. Complete with mismatched actionId on resolved ticket returns 404
    const completeRes = await request(app)
      .post(`/api/tickets/${testTicketResolved.id}/actions/${openTicketActionId}/complete`)
      .set(headersAlex)
      .send({ result: "Complete mismatch", expectedVersion: 1 });
    expect(completeRes.status).toBe(404);
    expect(completeRes.body.error).toBe("NOT_FOUND");

    // 3. Cancel with mismatched actionId on resolved ticket returns 404
    const cancelRes = await request(app)
      .post(`/api/tickets/${testTicketResolved.id}/actions/${openTicketActionId}/cancel`)
      .set(headersAlex)
      .send({ expectedVersion: 1 });
    expect(cancelRes.status).toBe(404);
    expect(cancelRes.body.error).toBe("NOT_FOUND");

    // 4. Non-existent actionId (999999) on resolved ticket returns 404
    const nonExistentRes = await request(app)
      .patch(`/api/tickets/${testTicketResolved.id}/actions/999999`)
      .set(headersAlex)
      .send({ actionDescription: "Non-existent", expectedVersion: 1 });
    expect(nonExistentRes.status).toBe(404);
    expect(nonExistentRes.body.error).toBe("NOT_FOUND");
  });

  it("API-L4-15: Non-performer Staff attempts to edit completed action returns 403", async () => {
    // Create completed action by Alex
    const createRes = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Alex performed action",
        status: "COMPLETED",
        result: "Done by Alex",
      });
    const actionId = createRes.body.action.id;
    createdActionIds.push(actionId);

    // Brian attempts to edit Alex's completed action
    const patchRes = await request(app)
      .patch(`/api/tickets/${testTicketOpen.id}/actions/${actionId}`)
      .set(headersBrian)
      .send({
        actionDescription: "Brian trying to edit Alex's work",
        expectedVersion: 1,
      });
    expect(patchRes.status).toBe(403);
  });

  it("API-L4-16: Original performer or Administrator edits completed action description/notes", async () => {
    // Create completed action by Alex
    const createRes = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Performer edit test",
        status: "COMPLETED",
        result: "Original result",
      });
    const actionId = createRes.body.action.id;
    createdActionIds.push(actionId);

    // Alex edits own completed action
    const alexRes = await request(app)
      .patch(`/api/tickets/${testTicketOpen.id}/actions/${actionId}`)
      .set(headersAlex)
      .send({
        actionDescription: "Alex updated description",
        attachmentNotes: "Updated photo attached",
        expectedVersion: 1,
      });
    expect(alexRes.status).toBe(200);
    expect(alexRes.body.action.actionDescription).toBe("Alex updated description");
    expect(alexRes.body.action.version).toBe(2);

    // Admin edits completed action
    const adminRes = await request(app)
      .patch(`/api/tickets/${testTicketOpen.id}/actions/${actionId}`)
      .set(headersAdmin)
      .send({
        actionDescription: "Admin corrected description",
        expectedVersion: 2,
      });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.action.actionDescription).toBe("Admin corrected description");
    expect(adminRes.body.action.version).toBe(3);
  });

  it("API-L4-17: Confidentiality check: actions response does not leak internal notes", async () => {
    const res = await request(app)
      .get(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersReqA);

    expect(res.status).toBe(200);
    const bodyString = JSON.stringify(res.body);
    expect(bodyString.includes("SUPER_SECRET_INTERNAL_NOTE_12345")).toBe(false);
  });

  it("API-L4-22: Concurrent action edit with stale action expectedVersion returns 409", async () => {
    const createRes = await request(app)
      .post(`/api/tickets/${testTicketOpen.id}/actions`)
      .set(headersAlex)
      .send({
        actionDescription: "Action for version collision",
        status: "PENDING",
      });
    const actionId = createRes.body.action.id;
    createdActionIds.push(actionId);

    // Stale version: expectedVersion is 0, current is 1
    const resStale = await request(app)
      .patch(`/api/tickets/${testTicketOpen.id}/actions/${actionId}`)
      .set(headersAlex)
      .send({
        actionDescription: "Stale edit",
        expectedVersion: 99,
      });

    expect(resStale.status).toBe(409);
    expect(resStale.body.error).toBe("CONFLICT");
    expect(resStale.body.currentVersion).toBe(1);
  });

  describe("API-L4-22: Action Mutation Validation & Version Precondition Guard", () => {
    let testActionId: number;

    beforeAll(async () => {
      const createRes = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .send({
          actionDescription: "Action for mutation validation testing",
          status: "PENDING",
        });
      testActionId = createRes.body.action.id;
      createdActionIds.push(testActionId);
    });

    it("API-L4-22b: PATCH returns 400 VALIDATION_FAILED when expectedVersion is missing or non-positive", async () => {
      // 1. Missing expectedVersion
      const resMissing = await request(app)
        .patch(`/api/tickets/${testTicketOpen.id}/actions/${testActionId}`)
        .set(headersAlex)
        .send({ actionDescription: "Missing version" });
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error).toBe("VALIDATION_FAILED");

      // 2. Non-positive integer (0)
      const resZero = await request(app)
        .patch(`/api/tickets/${testTicketOpen.id}/actions/${testActionId}`)
        .set(headersAlex)
        .send({ actionDescription: "Zero version", expectedVersion: 0 });
      expect(resZero.status).toBe(400);
      expect(resZero.body.error).toBe("VALIDATION_FAILED");

      // 3. String non-integer
      const resNaN = await request(app)
        .patch(`/api/tickets/${testTicketOpen.id}/actions/${testActionId}`)
        .set(headersAlex)
        .send({ actionDescription: "NaN version", expectedVersion: "invalid" });
      expect(resNaN.status).toBe(400);
      expect(resNaN.body.error).toBe("VALIDATION_FAILED");
    });

    it("API-L4-22c: Complete returns 400 VALIDATION_FAILED when expectedVersion is missing or result is empty", async () => {
      // 1. Missing expectedVersion
      const resMissing = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions/${testActionId}/complete`)
        .set(headersAlex)
        .send({ result: "Done" });
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error).toBe("VALIDATION_FAILED");

      // 2. Empty / whitespace-only result
      const resEmptyResult = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions/${testActionId}/complete`)
        .set(headersAlex)
        .send({ expectedVersion: 1, result: "   " });
      expect(resEmptyResult.status).toBe(400);
      expect(resEmptyResult.body.error).toBe("VALIDATION_FAILED");
    });

    it("API-L4-22d: Cancel returns 400 VALIDATION_FAILED when expectedVersion is missing", async () => {
      const resMissing = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions/${testActionId}/cancel`)
        .set(headersAlex)
        .send({});
      expect(resMissing.status).toBe(400);
      expect(resMissing.body.error).toBe("VALIDATION_FAILED");
    });

    it("API-L4-22e: PATCH returns 400 VALIDATION_FAILED when followUpRequired is true without followUpNote", async () => {
      const res = await request(app)
        .patch(`/api/tickets/${testTicketOpen.id}/actions/${testActionId}`)
        .set(headersAlex)
        .send({ expectedVersion: 1, followUpRequired: true, followUpNote: "   " });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_FAILED");
    });

    it("API-L4-22f: POST returns 400 VALIDATION_FAILED when actionDateTime is invalid or actionDescription is non-string (no crash)", async () => {
      // 1. Invalid date
      const resBadDate = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .send({
          actionDateTime: "not-a-valid-date",
          actionDescription: "Valid description",
          status: "PENDING",
        });
      expect(resBadDate.status).toBe(400);
      expect(resBadDate.body.error).toBe("VALIDATION_FAILED");

      // 2. Numeric description
      const resNumericDesc = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .send({
          actionDescription: 12345,
          status: "PENDING",
        });
      expect(resNumericDesc.status).toBe(400);
      expect(resNumericDesc.body.error).toBe("VALIDATION_FAILED");
    });

    it("API-L4-22g: POST returns 400 VALIDATION_FAILED when status is invalid", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .send({
          actionDescription: "Valid description",
          status: "INVALID_STATUS",
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_FAILED");
    });

    it("API-L4-22h: Cancel returns 400 VALIDATION_FAILED when reason exceeds 500 characters", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions/${testActionId}/cancel`)
        .set(headersAlex)
        .send({
          expectedVersion: 1,
          reason: "a".repeat(501),
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_FAILED");
    });

    it("API-L4-22i: PATCH returns 400 VALIDATION_FAILED when sending empty followUpNote on follow-up action", async () => {
      // Create action with followUpRequired: true
      const createRes = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .send({
          actionDescription: "Action with followup",
          status: "PENDING",
          followUpRequired: true,
          followUpNote: "Existing initial note",
        });
      expect(createRes.status).toBe(201);
      const actionId = createRes.body.action.id;
      createdActionIds.push(actionId);

      // Attempt PATCH with empty followUpNote
      const res = await request(app)
        .patch(`/api/tickets/${testTicketOpen.id}/actions/${actionId}`)
        .set(headersAlex)
        .send({
          expectedVersion: 1,
          followUpNote: "   ",
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_FAILED");
    });
  });

  describe("API-L4-24a to API-L4-24h: Idempotent Retry Protocol & Scoping (D09)", () => {
    const clientRequestId = "e5b8d28a-77e8-466d-a192-3d846c97a2d1";

    it("API-L4-24a: Idempotent network replay: same user + same ticket + same key + same payload", async () => {
      const payload = {
        actionDescription: "Idempotent action test",
        status: "COMPLETED",
        result: "First execution",
        clientRequestId,
      };

      // 1. Initial creation
      const res1 = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .send(payload);
      expect(res1.status).toBe(201);
      const actionId = res1.body.action.id;
      createdActionIds.push(actionId);

      // 2. Exact retry by Alex
      const res2 = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .send(payload);
      expect(res2.status).toBe(200);
      expect(res2.headers["x-idempotent-replay"]).toBe("true");
      expect(res2.body.action.id).toBe(actionId);
    });

    it("API-L4-24b: Idempotent payload mismatch: same scope with different payload returns 409", async () => {
      const mismatchedPayload = {
        actionDescription: "DIFFERENT description with same key",
        status: "COMPLETED",
        result: "Different result",
        clientRequestId,
      };

      const res = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .send(mismatchedPayload);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("CONFLICT");
      expect(res.body.message).toMatch(/mismatched/i);
    });

    it("API-L4-24c: Idempotent key isolation across users: different user + same ticket + same key", async () => {
      // Brian uses the SAME clientRequestId on the same ticket -> creates separate action (isolated namespace)
      const resBrian = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersBrian)
        .send({
          actionDescription: "Brian using same key as Alex",
          status: "COMPLETED",
          result: "Isolated namespace per createdById",
          clientRequestId,
        });

      expect(resBrian.status).toBe(201);
      expect(resBrian.body.action.createdById).toBe(staffBrian.id);
      createdActionIds.push(resBrian.body.action.id);
    });

    it("API-L4-24d: Idempotent key scoping across tickets: same user + different ticket + same key", async () => {
      // Alex uses same key on a different ticket (e.g. testTicketB if accessible to staff)
      const resDiffTicket = await request(app)
        .post(`/api/tickets/${testTicketB.id}/actions`)
        .set(headersAlex)
        .send({
          actionDescription: "Alex using same key on ticket B",
          status: "COMPLETED",
          result: "Scoped by ticketId",
          clientRequestId,
        });

      expect(resDiffTicket.status).toBe(201);
      expect(resDiffTicket.body.action.ticketId).toBe(testTicketB.id);
      createdActionIds.push(resDiffTicket.body.action.id);
    });

    it("API-L4-24e: Idempotent retry: mismatched header vs body clientRequestId returns 400", async () => {
      const res = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .set("X-Client-Request-Id", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
        .send({
          actionDescription: "Mismatched header/body key",
          status: "COMPLETED",
          result: "Testing mismatch",
          clientRequestId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("VALIDATION_FAILED");
    });

    it("API-L4-24f: Simultaneous concurrent retry: two identical requests by same user in parallel", async () => {
      const parallelKey = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
      const payload = {
        actionDescription: "Parallel retry test",
        status: "COMPLETED",
        result: "Testing parallel execution",
        clientRequestId: parallelKey,
      };

      const [r1, r2] = await Promise.all([
        request(app).post(`/api/tickets/${testTicketOpen.id}/actions`).set(headersAlex).send(payload),
        request(app).post(`/api/tickets/${testTicketOpen.id}/actions`).set(headersAlex).send(payload),
      ]);

      const statuses = [r1.status, r2.status].sort();
      expect(statuses).toEqual([200, 201]);

      const createdAction = r1.status === 201 ? r1.body.action : r2.body.action;
      const replayedAction = r1.status === 200 ? r1.body.action : r2.body.action;
      expect(createdAction.id).toBe(replayedAction.id);
      createdActionIds.push(createdAction.id);
    });

    it("API-L4-24g: Idempotent replay on resolved ticket succeeds with 200 OK replay", async () => {
      const replayKey = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
      const payload = {
        actionDescription: "Action created before resolution",
        status: "COMPLETED",
        result: "Ready to resolve",
        clientRequestId: replayKey,
      };

      // 1. Create action while ticket is still OPEN
      const res1 = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .send(payload);
      expect(res1.status).toBe(201);
      createdActionIds.push(res1.body.action.id);

      // 2. Ticket transitions to RESOLVED
      await prisma.ticket.update({
        where: { id: testTicketOpen.id },
        data: { currentStatus: "RESOLVED" },
      });

      // 3. Network replay of the creation request
      const replayRes = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .send(payload);

      expect(replayRes.status).toBe(200);
      expect(replayRes.headers["x-idempotent-replay"]).toBe("true");

      // Reset ticket status for remaining tests
      await prisma.ticket.update({
        where: { id: testTicketOpen.id },
        data: { currentStatus: "IN_PROGRESS" },
      });
    });

    it("API-L4-24h: Idempotent replay after subsequent action mutation succeeds", async () => {
      const mutateKey = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
      const initialPayload = {
        actionDescription: "Initial description",
        status: "PENDING",
        clientRequestId: mutateKey,
      };

      // 1. Create pending action
      const res1 = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .send(initialPayload);
      expect(res1.status).toBe(201);
      const actionId = res1.body.action.id;
      createdActionIds.push(actionId);

      // 2. Action is subsequently edited/completed
      await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions/${actionId}/complete`)
        .set(headersAlex)
        .send({ result: "Completed later", expectedVersion: 1 });

      // 3. Network retry of original creation payload
      const retryRes = await request(app)
        .post(`/api/tickets/${testTicketOpen.id}/actions`)
        .set(headersAlex)
        .send(initialPayload);

      expect(retryRes.status).toBe(200);
      expect(retryRes.headers["x-idempotent-replay"]).toBe("true");
      expect(retryRes.body.action.id).toBe(actionId);
    });

    it("API-L4-30b: GET /api/staff/ticket-owners allows both IT_STAFF and ADMINISTRATOR", async () => {
      // 1. Staff access
      const staffRes = await request(app)
        .get("/api/staff/ticket-owners")
        .set(headersAlex);
      expect(staffRes.status).toBe(200);
      expect(Array.isArray(staffRes.body)).toBe(true);
      expect(staffRes.body.length).toBeGreaterThan(0);

      // 2. Administrator access
      const adminRes = await request(app)
        .get("/api/staff/ticket-owners")
        .set(headersAdmin);
      expect(adminRes.status).toBe(200);
      expect(Array.isArray(adminRes.body)).toBe(true);
      expect(adminRes.body.length).toBeGreaterThan(0);

      // 3. Requester forbidden
      const reqRes = await request(app)
        .get("/api/staff/ticket-owners")
        .set(headersReqA);
      expect(reqRes.status).toBe(403);
    });
  });
});
