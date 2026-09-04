import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/tickets (API-06 to API-09, API-22, API-30, API-31)", () => {
  const prisma = getPrisma();

  let requesterA: { id: number; email: string };
  let requesterB: { id: number; email: string };
  let categoryHardware: { id: number; name: string };
  let categorySoftware: { id: number; name: string };
  let systemLaptop: { id: number; name: string };
  let systemEmail: { id: number; name: string };

  const createdTicketIds: number[] = [];
  const createdRequesterIds: number[] = [];
  let ticketTieLowerId: number;
  let ticketTieHigherId: number;

  beforeAll(async () => {
    // 1. Locate active reference records for foreign keys
    const catH = await prisma.category.findFirst({ where: { name: "Hardware" } });
    const catS = await prisma.category.findFirst({ where: { name: "Software" } });
    const sysL = await prisma.relatedSystem.findFirst({ where: { name: "Corporate Laptop" } });
    const sysE = await prisma.relatedSystem.findFirst({ where: { name: "Email" } });

    expect(catH).toBeTruthy();
    expect(catS).toBeTruthy();
    expect(sysL).toBeTruthy();
    expect(sysE).toBeTruthy();

    categoryHardware = catH!;
    categorySoftware = catS!;
    systemLaptop = sysL!;
    systemEmail = sysE!;

    // 2. Create isolated test Requesters specifically for this suite (Point 9: does not touch seeded users)
    requesterA = await prisma.requesterUser.create({
      data: {
        name: "Suite Requester A",
        email: `suite.a.${Date.now()}@test.local`,
        department: "Testing",
        isActive: true,
      },
    });
    createdRequesterIds.push(requesterA.id);

    requesterB = await prisma.requesterUser.create({
      data: {
        name: "Suite Requester B",
        email: `suite.b.${Date.now()}@test.local`,
        department: "Testing",
        isActive: true,
      },
    });
    createdRequesterIds.push(requesterB.id);

    // 3. Create 10 deterministic tickets for Requester A
    // Notice tickets 4 and 5 share the exact same createdAt timestamp (2026-09-01T12:00:00.000Z) to prove id desc tie-breaker
    const tieTimestamp = new Date("2026-09-01T12:00:00.000Z");

    const ticketDataA = [
      {
        ticketNo: "TKT-2026-900001",
        summary: "Alpha battery issue on laptop",
        description: "Battery discharges too quickly during normal meetings.",
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        requesterId: requesterA.id,
        createdAt: new Date("2026-09-01T08:00:00.000Z"),
      },
      {
        ticketNo: "TKT-2026-900002",
        summary: "Bravo email sync failure",
        description: "Cannot synchronize inbox messages on client.",
        requestedPriority: "MEDIUM" as const,
        itPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        categoryId: categorySoftware.id,
        relatedSystemId: systemEmail.id,
        requesterId: requesterA.id,
        createdAt: new Date("2026-09-01T09:00:00.000Z"),
      },
      {
        ticketNo: "TKT-2026-900003",
        summary: "Charlie keyboard key stuck",
        description: "Space bar is mechanically stuck on laptop.",
        requestedPriority: "HIGH" as const,
        itPriority: "HIGH" as const,
        currentStatus: "IN_PROGRESS" as const,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        requesterId: requesterA.id,
        createdAt: new Date("2026-09-01T10:00:00.000Z"),
      },
      {
        ticketNo: "TKT-2026-900004",
        summary: "Delta license issue 1",
        description: "Office spreadsheet tool license issue 1.",
        requestedPriority: "LOW" as const,
        itPriority: "MEDIUM" as const,
        currentStatus: "RESOLVED" as const,
        categoryId: categorySoftware.id,
        relatedSystemId: systemLaptop.id,
        requesterId: requesterA.id,
        createdAt: tieTimestamp,
      },
      {
        ticketNo: "TKT-2026-900005",
        summary: "Echo projector connection error",
        description: "HDMI adapter does not detect meeting room projector.",
        requestedPriority: "HIGH" as const,
        itPriority: "HIGH" as const,
        currentStatus: "RESOLVED" as const,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        requesterId: requesterA.id,
        createdAt: tieTimestamp,
      },
      {
        ticketNo: "TKT-2026-900006",
        summary: "Foxtrot email password reset",
        description: "Password expired and reset portal is not reachable.",
        requestedPriority: "MEDIUM" as const,
        itPriority: "HIGH" as const,
        currentStatus: "IN_PROGRESS" as const,
        categoryId: categorySoftware.id,
        relatedSystemId: systemEmail.id,
        requesterId: requesterA.id,
        createdAt: new Date("2026-09-01T13:00:00.000Z"),
      },
      {
        ticketNo: "TKT-2026-900007",
        summary: "Golf trackpad not responding",
        description: "Trackpad clicks do not register intermittently.",
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        requesterId: requesterA.id,
        createdAt: new Date("2026-09-01T14:00:00.000Z"),
      },
      {
        ticketNo: "TKT-2026-900008",
        summary: "Hotel email attachment size limit",
        description: "Sender reports email bounces with oversized attachment.",
        requestedPriority: "MEDIUM" as const,
        itPriority: "MEDIUM" as const,
        currentStatus: "NEW" as const,
        categoryId: categorySoftware.id,
        relatedSystemId: systemEmail.id,
        requesterId: requesterA.id,
        createdAt: new Date("2026-09-01T15:00:00.000Z"),
      },
      {
        ticketNo: "TKT-2026-900009",
        summary: "India webcam grainy image",
        description: "Webcam video quality degraded after driver update.",
        requestedPriority: "HIGH" as const,
        itPriority: "MEDIUM" as const,
        currentStatus: "NEW" as const,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        requesterId: requesterA.id,
        createdAt: new Date("2026-09-01T16:00:00.000Z"),
      },
      {
        ticketNo: "TKT-2026-900010",
        summary: "Juliet spreadsheet crash on launch",
        description: "Office spreadsheet application crashes immediately upon opening.",
        requestedPriority: "HIGH" as const,
        itPriority: "HIGH" as const,
        currentStatus: "IN_PROGRESS" as const,
        categoryId: categorySoftware.id,
        relatedSystemId: systemLaptop.id,
        requesterId: requesterA.id,
        createdAt: new Date("2026-09-01T17:00:00.000Z"),
      },
    ];

    for (let i = 0; i < ticketDataA.length; i++) {
      const created = await prisma.ticket.create({ data: ticketDataA[i] });
      createdTicketIds.push(created.id);
      if (i === 3) ticketTieLowerId = created.id;
      if (i === 4) ticketTieHigherId = created.id;
    }

    // Create 2 tickets for Requester B to test ownership scoping
    const ticketDataB = [
      {
        ticketNo: "TKT-2026-900091",
        summary: "Requester B secret finance report",
        description: "Confidential financial system access request.",
        requestedPriority: "HIGH" as const,
        itPriority: "HIGH" as const,
        currentStatus: "IN_PROGRESS" as const,
        categoryId: categorySoftware.id,
        relatedSystemId: systemEmail.id,
        requesterId: requesterB.id,
        createdAt: new Date("2026-09-02T10:00:00.000Z"),
      },
      {
        ticketNo: "TKT-2026-900092",
        summary: "Requester B monitor replacement",
        description: "Second monitor power brick failed.",
        requestedPriority: "LOW" as const,
        itPriority: "LOW" as const,
        currentStatus: "NEW" as const,
        categoryId: categoryHardware.id,
        relatedSystemId: systemLaptop.id,
        requesterId: requesterB.id,
        createdAt: new Date("2026-09-02T11:00:00.000Z"),
      },
    ];

    for (const t of ticketDataB) {
      const created = await prisma.ticket.create({ data: t });
      createdTicketIds.push(created.id);
    }
  });

  afterAll(async () => {
    // Clean only records created by this suite
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

  // API-06 — AC-10: Ownership scoping (only requester's own tickets returned)
  it("API-06: returns only tickets owned by the current requester", async () => {
    const resA = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resA.status).toBe(200);
    expect(resA.body).toHaveProperty("data");
    expect(resA.body).toHaveProperty("pagination");
    expect(resA.body.pagination.totalItems).toBe(10);

    // Verify none of Requester B's tickets leak into Requester A's list
    const ticketNosA = resA.body.data.map((t: any) => t.ticketNo);
    expect(ticketNosA).not.toContain("TKT-2026-900091");
    expect(ticketNosA).not.toContain("TKT-2026-900092");

    // Scoping for Requester B
    const resB = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterB.id));

    expect(resB.status).toBe(200);
    expect(resB.body.pagination.totalItems).toBe(2);
    const ticketNosB = resB.body.data.map((t: any) => t.ticketNo);
    expect(ticketNosB).toContain("TKT-2026-900091");
    expect(ticketNosB).toContain("TKT-2026-900092");
    expect(ticketNosB).not.toContain("TKT-2026-900001");
  });

  // API-07 — AC-11: Sorting by requestedPriority asc
  it("API-07: sorts by requestedPriority asc correctly", async () => {
    const res = await request(app)
      .get("/api/tickets?sortBy=requestedPriority&sortOrder=asc&limit=20")
      .set("X-Requester-Id", String(requesterA.id));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(10);

    const priorities = res.body.data.map((t: any) => t.requestedPriority);
    const priorityRank: Record<string, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

    for (let i = 1; i < priorities.length; i++) {
      expect(priorityRank[priorities[i]]).toBeGreaterThanOrEqual(priorityRank[priorities[i - 1]]);
    }
  });

  // API-08 — AC-12, BR-12: Pagination clamping
  it("API-08: clamps out-of-range page numbers to the last valid page", async () => {
    const res = await request(app)
      .get("/api/tickets?page=9999&limit=5")
      .set("X-Requester-Id", String(requesterA.id));

    expect(res.status).toBe(200);
    expect(res.body.pagination.currentPage).toBe(2); // totalItems=10, limit=5 -> 2 pages
    expect(res.body.pagination.totalPages).toBe(2);
    expect(res.body.data.length).toBe(5);

    const resLow = await request(app)
      .get("/api/tickets?page=-5&limit=5")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resLow.status).toBe(200);
    expect(resLow.body.pagination.currentPage).toBe(1);
    expect(resLow.body.data.length).toBe(5);
  });

  // API-09 — AC-10: Case-insensitive search on ticketNo and summary
  it("API-09: performs case-insensitive partial search on ticketNo and summary", async () => {
    // 1. Search by summary keyword
    const resSummary = await request(app)
      .get("/api/tickets?search=battery")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resSummary.status).toBe(200);
    expect(resSummary.body.data.length).toBeGreaterThanOrEqual(1);
    expect(resSummary.body.data[0].summary).toContain("battery");

    // 2. Search by ticket number substring (uppercase/lowercase)
    const resTicketNo = await request(app)
      .get("/api/tickets?search=900002")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resTicketNo.status).toBe(200);
    expect(resTicketNo.body.data.length).toBe(1);
    expect(resTicketNo.body.data[0].ticketNo).toBe("TKT-2026-900002");

    // 3. Search with no matches returns empty array (200 OK)
    const resEmpty = await request(app)
      .get("/api/tickets?search=nonexistenttermxyz")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resEmpty.status).toBe(200);
    expect(resEmpty.body.data).toEqual([]);
    expect(resEmpty.body.pagination.totalItems).toBe(0);
  });

  // API-22 — Validation of query parameters
  it("API-22: returns 400 Bad Request with details for invalid query parameters", async () => {
    // 1. Unsupported sortBy
    const resSort = await request(app)
      .get("/api/tickets?sortBy=invalidField")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resSort.status).toBe(400);
    expect(resSort.body.error).toBe("Validation failed");
    expect(resSort.body.details).toHaveProperty("sortBy");

    // 2. Unsupported limit (not 5, 8, 10, 20)
    const resLimit = await request(app)
      .get("/api/tickets?limit=15")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resLimit.status).toBe(400);
    expect(resLimit.body.error).toBe("Validation failed");
    expect(resLimit.body.details).toEqual({ limit: "limit must be one of 5, 8, 10, 20" });

    // 3. Unsupported sortOrder
    const resSortOrder = await request(app)
      .get("/api/tickets?sortOrder=random")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resSortOrder.status).toBe(400);
    expect(resSortOrder.body.details).toHaveProperty("sortOrder");

    // 4. Invalid categoryId
    const resCatId = await request(app)
      .get("/api/tickets?categoryId=invalid")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resCatId.status).toBe(400);
    expect(resCatId.body.details).toHaveProperty("categoryId");

    // 5. Invalid requestedPriority, itPriority, and status
    const resEnums = await request(app)
      .get("/api/tickets?requestedPriority=URGENT&itPriority=P1&status=OPEN")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resEnums.status).toBe(400);
    expect(resEnums.body.details).toHaveProperty("requestedPriority");
    expect(resEnums.body.details).toHaveProperty("itPriority");
    expect(resEnums.body.details).toHaveProperty("status");

    // 6. Invalid page (float or non-integer string -> 400 Bad Request)
    const resPageFloat = await request(app)
      .get("/api/tickets?page=1.1&limit=5")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resPageFloat.status).toBe(400);
    expect(resPageFloat.body.error).toBe("Validation failed");
    expect(resPageFloat.body.details).toEqual({ page: "page must be an integer" });

    const resPageAlpha = await request(app)
      .get("/api/tickets?page=abc")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resPageAlpha.status).toBe(400);
    expect(resPageAlpha.body.details).toEqual({ page: "page must be an integer" });
  });

  // API-30 — AC-10: Filters work independently and in combination with ownership preserved
  it("API-30: filters by category, requestedPriority, itPriority, and status independently and together with ownership preserved", async () => {
    // 1. Filter by category: Hardware (catH)
    const resCat = await request(app)
      .get(`/api/tickets?categoryId=${categoryHardware.id}&limit=20`)
      .set("X-Requester-Id", String(requesterA.id));

    expect(resCat.status).toBe(200);
    expect(resCat.body.data.length).toBeGreaterThan(0);
    for (const item of resCat.body.data) {
      expect(item.categoryName).toBe("Hardware");
    }

    // 2. Filter by requestedPriority: LOW (independent test)
    const resReqPriority = await request(app)
      .get("/api/tickets?requestedPriority=LOW&limit=20")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resReqPriority.status).toBe(200);
    expect(resReqPriority.body.data.length).toBeGreaterThan(0);
    for (const item of resReqPriority.body.data) {
      expect(item.requestedPriority).toBe("LOW");
    }

    // 3. Filter by itPriority: HIGH (independent test)
    const resItPriority = await request(app)
      .get("/api/tickets?itPriority=HIGH&limit=20")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resItPriority.status).toBe(200);
    expect(resItPriority.body.data.length).toBeGreaterThan(0);
    for (const item of resItPriority.body.data) {
      expect(item.itPriority).toBe("HIGH");
    }

    // 4. Filter by status: IN_PROGRESS (independent test)
    const resStatus = await request(app)
      .get("/api/tickets?status=IN_PROGRESS&limit=20")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resStatus.status).toBe(200);
    expect(resStatus.body.data.length).toBeGreaterThan(0);
    for (const item of resStatus.body.data) {
      expect(item.currentStatus).toBe("IN_PROGRESS");
    }

    // 5. Combined filter: Software AND requestedPriority=HIGH AND itPriority=HIGH AND status=IN_PROGRESS
    const resCombined = await request(app)
      .get(
        `/api/tickets?categoryId=${categorySoftware.id}&requestedPriority=HIGH&itPriority=HIGH&status=IN_PROGRESS`
      )
      .set("X-Requester-Id", String(requesterA.id));

    expect(resCombined.status).toBe(200);
    expect(resCombined.body.data.length).toBeGreaterThan(0);
    for (const item of resCombined.body.data) {
      expect(item.categoryName).toBe("Software");
      expect(item.requestedPriority).toBe("HIGH");
      expect(item.itPriority).toBe("HIGH");
      expect(item.currentStatus).toBe("IN_PROGRESS");
    }

    // 6. Ownership confirmation under filter: Requester B's HIGH priority tickets must not leak
    const resOwnerFilter = await request(app)
      .get("/api/tickets?requestedPriority=HIGH&limit=20")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resOwnerFilter.status).toBe(200);
    const nos = resOwnerFilter.body.data.map((t: any) => t.ticketNo);
    expect(nos).not.toContain("TKT-2026-900091"); // Requester B's ticket

    // 7. Filter combination yielding 0 results returns empty data array
    const resZero = await request(app)
      .get(`/api/tickets?categoryId=${categoryHardware.id}&status=RESOLVED&requestedPriority=LOW`)
      .set("X-Requester-Id", String(requesterB.id)); // Requester B has no hardware resolved tickets

    expect(resZero.status).toBe(200);
    expect(resZero.body.data).toEqual([]);
    expect(resZero.body.pagination.totalItems).toBe(0);
  });

  // API-31 — AC-11, AC-12, BR-12: Default order, id desc tie-breaker, and pagination metadata shape
  it("API-31: returns default ordering (createdAt desc, id desc tie-breaker) and exact response shape", async () => {
    const resDefault = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resDefault.status).toBe(200);
    expect(resDefault.body).toHaveProperty("data");
    expect(resDefault.body).toHaveProperty("pagination");

    const pagination = resDefault.body.pagination;
    expect(pagination.currentPage).toBe(1);
    expect(pagination.pageSize).toBe(8); // default limit per BR-12
    expect(pagination.totalItems).toBe(10);
    expect(pagination.totalPages).toBe(2);

    // Verify row structure matches api-spec.md Section 6.5
    const row = resDefault.body.data[0];
    expect(row).toHaveProperty("id");
    expect(row).toHaveProperty("ticketNo");
    expect(row).toHaveProperty("summary");
    expect(row).toHaveProperty("categoryName");
    expect(row).toHaveProperty("relatedSystemName");
    expect(row).toHaveProperty("requestedPriority");
    expect(row).toHaveProperty("itPriority");
    expect(row).toHaveProperty("currentStatus");
    expect(row).toHaveProperty("ticketOwnerName");
    expect(row.ticketOwnerName).toBe("Unassigned"); // null ticketOwner displays Unassigned
    expect(row).toHaveProperty("createdAt");
    expect(row).toHaveProperty("updatedAt");

    // Verify default sort: newest createdAt first
    const dates = resDefault.body.data.map((t: any) => new Date(t.createdAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
    }

    // Prove id desc tie-breaker when createdAt is identical (tickets 4 and 5)
    // Fetch with limit=20 to have all 10 tickets on page 1
    const resAll = await request(app)
      .get("/api/tickets?limit=20")
      .set("X-Requester-Id", String(requesterA.id));

    expect(resAll.status).toBe(200);
    const allIds = resAll.body.data.map((t: any) => t.id);
    const indexHigher = allIds.indexOf(ticketTieHigherId);
    const indexLower = allIds.indexOf(ticketTieLowerId);

    expect(indexHigher).not.toBe(-1);
    expect(indexLower).not.toBe(-1);
    // Because ticketTieHigherId > ticketTieLowerId and their createdAt is equal, higher ID must appear first
    expect(indexHigher).toBeLessThan(indexLower);
  });

  // Auth enforcement on GET /api/tickets (MW-03, MW-04, MW-05, MW-06)
  it("returns 401 on missing header and 400 on malformed header", async () => {
    const resMissing = await request(app).get("/api/tickets");
    expect(resMissing.status).toBe(401);
    expect(resMissing.body).toEqual({ error: "Requester context is missing or invalid" });

    const resMalformed = await request(app)
      .get("/api/tickets")
      .set("X-Requester-Id", "abc");
    expect(resMalformed.status).toBe(400);
    expect(resMalformed.body).toEqual({ error: "Bad Request: Malformed X-Requester-Id header" });
  });
});
