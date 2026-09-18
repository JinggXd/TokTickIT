import request from "supertest";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/utils/password.js";

describe("Phase F4 / P11 Administrator User Management API (API-20 to API-27, API-32 to API-35, SEC-09)", () => {
  const DEFAULT_ORIGIN = "http://localhost:5173";

  let adminCookie: string;
  let adminCsrfToken: string;
  let adminId: number;

  let staffCookie: string;
  let staffCsrfToken: string;
  let staffId: number;

  let requesterCookie: string;
  let requesterId: number;

  let createdUserIds: number[] = [];
  let createdTicketIds: number[] = [];

  beforeAll(async () => {
    const prisma = getPrisma();
    const pass = await hashPassword("AdminSecret123!");

    // 1. Admin user
    const admin = await prisma.user.upsert({
      where: { email: "admin.p11@example.com" },
      update: { isActive: true, mustChangePassword: false, passwordHash: pass, role: "ADMINISTRATOR" },
      create: {
        email: "admin.p11@example.com",
        name: "P11 Primary Admin",
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
        passwordHash: pass,
      },
    });
    adminId = admin.id;

    // Login as Admin
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .set("Origin", DEFAULT_ORIGIN)
      .send({ email: "admin.p11@example.com", password: "AdminSecret123!" });
    adminCookie = adminLogin.headers["set-cookie"];

    const adminCsrf = await request(app).get("/api/auth/csrf").set("Cookie", adminCookie);
    adminCsrfToken = adminCsrf.body.csrfToken;

    // 2. Staff user
    const staff = await prisma.user.upsert({
      where: { email: "staff.p11@example.com" },
      update: { isActive: true, mustChangePassword: false, passwordHash: pass, role: "IT_STAFF" },
      create: {
        email: "staff.p11@example.com",
        name: "P11 Staff User",
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
        passwordHash: pass,
      },
    });
    staffId = staff.id;

    const staffLogin = await request(app)
      .post("/api/auth/login")
      .set("Origin", DEFAULT_ORIGIN)
      .send({ email: "staff.p11@example.com", password: "AdminSecret123!" });
    staffCookie = staffLogin.headers["set-cookie"];

    const staffCsrf = await request(app).get("/api/auth/csrf").set("Cookie", staffCookie);
    staffCsrfToken = staffCsrf.body.csrfToken;

    // 3. Requester user
    const reqUser = await prisma.user.upsert({
      where: { email: "req.p11@example.com" },
      update: { isActive: true, mustChangePassword: false, passwordHash: pass, role: "REQUESTER" },
      create: {
        email: "req.p11@example.com",
        name: "P11 Requester User",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
        passwordHash: pass,
      },
    });
    requesterId = reqUser.id;

    const reqLogin = await request(app)
      .post("/api/auth/login")
      .set("Origin", DEFAULT_ORIGIN)
      .send({ email: "req.p11@example.com", password: "AdminSecret123!" });
    requesterCookie = reqLogin.headers["set-cookie"];
  });

  afterAll(async () => {
    const prisma = getPrisma();
    if (createdTicketIds.length > 0) {
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.session.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  describe("SEC-09: Role-based access control for /api/admin/users", () => {
    it("returns 401 Unauthorized for unauthenticated requests", async () => {
      const res = await request(app).get("/api/admin/users");
      expect(res.status).toBe(401);
    });

    it("returns 403 Forbidden for Requester role", async () => {
      const res = await request(app).get("/api/admin/users").set("Cookie", requesterCookie);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Access denied");
    });

    it("returns 403 Forbidden for IT Staff role", async () => {
      const res = await request(app).get("/api/admin/users").set("Cookie", staffCookie);
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("Access denied");
    });
  });

  describe("API-20 & API-32: GET /api/admin/users (List, Search & Filter)", () => {
    it("returns list of users sorted by name asc, id asc", async () => {
      const res = await request(app).get("/api/admin/users").set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.users)).toBe(true);
      expect(res.body.users.length).toBeGreaterThan(0);

      const first = res.body.users[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("email");
      expect(first).toHaveProperty("role");
      expect(first).toHaveProperty("isActive");
      expect(first).toHaveProperty("mustChangePassword");
      expect(first).toHaveProperty("createdAt");
      expect(first).not.toHaveProperty("passwordHash");
    });

    it("filters users by search query (case-insensitive name or email)", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=p11")
        .set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.body.users.length).toBeGreaterThanOrEqual(3);
      for (const u of res.body.users) {
        const matchesName = u.name.toLowerCase().includes("p11");
        const matchesEmail = u.email.toLowerCase().includes("p11");
        expect(matchesName || matchesEmail).toBe(true);
      }
    });

    it("filters users by role", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=ADMINISTRATOR")
        .set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      for (const u of res.body.users) {
        expect(u.role).toBe("ADMINISTRATOR");
      }
    });

    it("combines search and role with AND logic", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=Primary&role=ADMINISTRATOR")
        .set("Cookie", adminCookie);
      expect(res.status).toBe(200);
      expect(res.body.users.length).toBe(1);
      expect(res.body.users[0].name).toBe("P11 Primary Admin");
    });

    it("returns 400 Bad Request for invalid role filter", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=SUPERUSER")
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
      expect(res.body.details).toHaveProperty("role");
    });

    it("returns 400 Bad Request for unknown query parameters", async () => {
      const res = await request(app)
        .get("/api/admin/users?unknownParam=123")
        .set("Cookie", adminCookie);
      expect(res.status).toBe(400);
      expect(res.body.details).toHaveProperty("unknownParam");
    });
  });

  describe("API-21, API-22 & API-33: POST /api/admin/users (Create User)", () => {
    it("creates a new user with temporary password and sets mustChangePassword: true", async () => {
      const payload = {
        name: "New Test Staff",
        email: "new.staff.p11@example.com",
        role: "IT_STAFF",
        isActive: true,
        initialPassword: "InitialTempPass123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(payload.name);
      expect(res.body.email).toBe(payload.email);
      expect(res.body.role).toBe(payload.role);
      expect(res.body.isActive).toBe(true);
      expect(res.body.mustChangePassword).toBe(true);
      expect(res.body).not.toHaveProperty("passwordHash");

      createdUserIds.push(res.body.id);

      // Verify newly created user can log in and has mustChangePassword: true
      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: payload.email, password: payload.initialPassword });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.mustChangePassword).toBe(true);
    });

    it("rejects duplicate email with 409 DUPLICATE_EMAIL (API-22)", async () => {
      const payload = {
        name: "Duplicate Email User",
        email: "admin.p11@example.com", // existing
        role: "REQUESTER",
        isActive: true,
        initialPassword: "InitialTempPass123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("DUPLICATE_EMAIL");
    });

    it("rejects short initial password (<12 characters) with 400", async () => {
      const payload = {
        name: "Short Pass User",
        email: "short.pass@example.com",
        role: "REQUESTER",
        isActive: true,
        initialPassword: "short",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.details).toHaveProperty("initialPassword");
    });
  });

  describe("API-23, API-24, API-25 & API-26: PATCH /api/admin/users/:id (Edit User & Safety Invariants)", () => {
    let editableStaffId: number;

    beforeAll(async () => {
      const prisma = getPrisma();
      const pass = await hashPassword("StaffPass123!");
      const u = await prisma.user.create({
        data: {
          name: "Editable Staff",
          email: "editable.staff@example.com",
          role: "IT_STAFF",
          isActive: true,
          mustChangePassword: false,
          passwordHash: pass,
        },
      });
      editableStaffId = u.id;
      createdUserIds.push(u.id);

      // Create a ticket owned by this staff member to test unassignment cascade (API-26)
      const t = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-P11-${Date.now()}`,
          summary: "P11 Cascade Ticket",
          description: "Testing cascade unassignment when owner deactivated",
          requesterId: requesterId,
          categoryId: 1,
          relatedSystemId: 1,
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          currentStatus: "IN_PROGRESS",
          ticketOwnerId: editableStaffId,
          version: 1,
        },
      });
      createdTicketIds.push(t.id);
    });

    it("updates user name, email, and preserves own email without duplicate error (API-23)", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${editableStaffId}`)
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send({ name: "Editable Staff Renamed", email: "editable.staff@example.com" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Editable Staff Renamed");
      expect(res.body.email).toBe("editable.staff@example.com");
      expect(res.body.unassignedTicketsCount).toBe(0);
    });

    it("rejects self-deactivation with 400 SELF_DEACTIVATION (API-24, BR-19)", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminId}`)
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("SELF_DEACTIVATION");
      expect(res.body.message).toBe("You cannot deactivate your own account.");
    });

    it("rejects deactivating or demoting the last active admin with 400 LAST_ACTIVE_ADMIN (API-25, BR-20)", async () => {
      const prisma = getPrisma();
      const otherAdmins = await prisma.user.findMany({
        where: { role: "ADMINISTRATOR", id: { not: adminId }, isActive: true },
        select: { id: true },
      });
      const otherAdminIds = otherAdmins.map((a) => a.id);

      try {
        if (otherAdminIds.length > 0) {
          await prisma.user.updateMany({
            where: { id: { in: otherAdminIds } },
            data: { isActive: false },
          });
        }

        // Attempt demoting the sole active admin
        const resDemote = await request(app)
          .patch(`/api/admin/users/${adminId}`)
          .set("Origin", DEFAULT_ORIGIN)
          .set("Cookie", adminCookie)
          .set("X-CSRF-Token", adminCsrfToken)
          .send({ role: "IT_STAFF" });

        expect(resDemote.status).toBe(400);
        expect(resDemote.body.error).toBe("LAST_ACTIVE_ADMIN");
        expect(resDemote.body.message).toBe("At least one active Administrator must remain.");
      } finally {
        if (otherAdminIds.length > 0) {
          await prisma.user.updateMany({
            where: { id: { in: otherAdminIds } },
            data: { isActive: true },
          });
        }
      }
    });

    it("atomically unassigns tickets and returns count when owner is deactivated (API-26, BR-21)", async () => {
      const prisma = getPrisma();

      // Deactivate editableStaff
      const res = await request(app)
        .patch(`/api/admin/users/${editableStaffId}`)
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
      expect(res.body.unassignedTicketsCount).toBe(1);

      // Verify ticket in DB now has ticketOwnerId === null and version was incremented
      const ticket = await prisma.ticket.findUnique({
        where: { id: createdTicketIds[0] },
      });
      expect(ticket).not.toBeNull();
      expect(ticket?.ticketOwnerId).toBeNull();
      expect(ticket?.version).toBe(2);
      expect(ticket?.currentStatus).toBe("IN_PROGRESS"); // status preserved
    });
  });

  describe("API-27: POST /api/admin/users/:id/initial-password (Password Reset)", () => {
    let targetUserId: number;
    let targetUserCookie: string;

    beforeAll(async () => {
      const prisma = getPrisma();
      const pass = await hashPassword("OldPassword123!");
      const target = await prisma.user.create({
        data: {
          name: "Reset Target",
          email: "reset.target@example.com",
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: false,
          passwordHash: pass,
        },
      });
      targetUserId = target.id;
      createdUserIds.push(target.id);

      const login = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: "reset.target@example.com", password: "OldPassword123!" });
      targetUserCookie = login.headers["set-cookie"];
    });

    it("resets password, sets mustChangePassword: true, and revokes active sessions", async () => {
      const newSecret = "BrandNewSecret2026!";

      const res = await request(app)
        .post(`/api/admin/users/${targetUserId}/initial-password`)
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send({ initialPassword: newSecret });

      expect(res.status).toBe(204);

      // Verify previous active session is now invalidated (401)
      const testOldSession = await request(app)
        .get("/api/auth/me")
        .set("Cookie", targetUserCookie);
      expect(testOldSession.status).toBe(401);

      // Verify login with new secret succeeds and requires password change
      const newLogin = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: "reset.target@example.com", password: newSecret });
      expect(newLogin.status).toBe(200);
      expect(newLogin.body.user.mustChangePassword).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Unicode Password Validation (12-128 code points)
  // ---------------------------------------------------------------------------
  describe("Unicode Password Code Point Validation (API-24, API-32)", () => {
    it("rejects 6 emojis (6 code points, 12 UTF-16 units) as too short (<12 code points)", async () => {
      const shortEmoji = "😀😀😀😀😀😀";
      const res = await request(app)
        .post("/api/admin/users")
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send({
          name: "Emoji Short",
          email: "emoji.short@example.com",
          role: "REQUESTER",
          isActive: true,
          initialPassword: shortEmoji,
        });

      expect(res.status).toBe(400);
      expect(res.body.details?.initialPassword).toContain("12 and 128 characters");
    });

    it("accepts 12 emojis (12 code points) and 128 emojis (128 code points)", async () => {
      const validEmoji12 = "😀".repeat(12);
      const res12 = await request(app)
        .post("/api/admin/users")
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send({
          name: "Emoji 12",
          email: "emoji.12@example.com",
          role: "REQUESTER",
          isActive: true,
          initialPassword: validEmoji12,
        });
      expect(res12.status).toBe(201);
      createdUserIds.push(res12.body.id);

      const validEmoji128 = "😀".repeat(128);
      const res128 = await request(app)
        .post("/api/admin/users")
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send({
          name: "Emoji 128",
          email: "emoji.128@example.com",
          role: "REQUESTER",
          isActive: true,
          initialPassword: validEmoji128,
        });
      expect(res128.status).toBe(201);
      createdUserIds.push(res128.body.id);
    });

    it("rejects 129 emojis (129 code points) as too long (>128 code points)", async () => {
      const longEmoji = "😀".repeat(129);
      const res = await request(app)
        .post("/api/admin/users")
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send({
          name: "Emoji Long",
          email: "emoji.long@example.com",
          role: "REQUESTER",
          isActive: true,
          initialPassword: longEmoji,
        });

      expect(res.status).toBe(400);
      expect(res.body.details?.initialPassword).toContain("12 and 128 characters");
    });

    it("validates Unicode code points in password reset (API-32)", async () => {
      const prisma = getPrisma();
      const testUser = await prisma.user.create({
        data: {
          name: "Reset Target Unicode",
          email: "reset.unicode@example.com",
          role: "REQUESTER",
          isActive: true,
          passwordHash: await hashPassword("ValidOldPass123!"),
        },
      });
      createdUserIds.push(testUser.id);

      // 6 emojis rejected
      const rejectRes = await request(app)
        .post(`/api/admin/users/${testUser.id}/initial-password`)
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send({ initialPassword: "😀😀😀😀😀😀" });
      expect(rejectRes.status).toBe(400);

      // 12 emojis accepted
      const acceptRes = await request(app)
        .post(`/api/admin/users/${testUser.id}/initial-password`)
        .set("Origin", DEFAULT_ORIGIN)
        .set("Cookie", adminCookie)
        .set("X-CSRF-Token", adminCsrfToken)
        .send({ initialPassword: "😀".repeat(12) });
      expect(acceptRes.status).toBe(204);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Concurrency Races: Duplicate Email, Admin Demotion, Ticket Assignment
  // ---------------------------------------------------------------------------
  describe("Concurrency Races (API-23, API-28, API-34, API-35)", () => {
    it("concurrent user creation with same email yields exactly one 201 and one 409 DUPLICATE_EMAIL", async () => {
      const email = `race.user.${Date.now()}@example.com`;

      const [resA, resB] = await Promise.all([
        request(app)
          .post("/api/admin/users")
          .set("Origin", DEFAULT_ORIGIN)
          .set("Cookie", adminCookie)
          .set("X-CSRF-Token", adminCsrfToken)
          .send({
            name: "Race User A",
            email,
            role: "REQUESTER",
            isActive: true,
            initialPassword: "InitialPass1234!",
          }),
        request(app)
          .post("/api/admin/users")
          .set("Origin", DEFAULT_ORIGIN)
          .set("Cookie", adminCookie)
          .set("X-CSRF-Token", adminCsrfToken)
          .send({
            name: "Race User B",
            email,
            role: "REQUESTER",
            isActive: true,
            initialPassword: "InitialPass1234!",
          }),
      ]);

      const statuses = [resA.status, resB.status].sort();
      expect(statuses).toEqual([201, 409]);

      const conflictRes = resA.status === 409 ? resA : resB;
      expect(conflictRes.body.error).toBe("DUPLICATE_EMAIL");

      const successRes = resA.status === 201 ? resA : resB;
      createdUserIds.push(successRes.body.id);
    });

    it("concurrent PATCH email conflict yields exactly one 200 and one 409 DUPLICATE_EMAIL", async () => {
      const prisma = getPrisma();
      const pass = await hashPassword("UserPass12345!");
      const user1 = await prisma.user.create({
        data: { name: "Patch Race 1", email: `patch.race1.${Date.now()}@example.com`, role: "REQUESTER", isActive: true, passwordHash: pass },
      });
      const user2 = await prisma.user.create({
        data: { name: "Patch Race 2", email: `patch.race2.${Date.now()}@example.com`, role: "REQUESTER", isActive: true, passwordHash: pass },
      });
      createdUserIds.push(user1.id, user2.id);

      const targetConflictEmail = `target.race.${Date.now()}@example.com`;

      const [res1, res2] = await Promise.all([
        request(app)
          .patch(`/api/admin/users/${user1.id}`)
          .set("Origin", DEFAULT_ORIGIN)
          .set("Cookie", adminCookie)
          .set("X-CSRF-Token", adminCsrfToken)
          .send({ email: targetConflictEmail }),
        request(app)
          .patch(`/api/admin/users/${user2.id}`)
          .set("Origin", DEFAULT_ORIGIN)
          .set("Cookie", adminCookie)
          .set("X-CSRF-Token", adminCsrfToken)
          .send({ email: targetConflictEmail }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 409]);

      const conflictRes = res1.status === 409 ? res1 : res2;
      expect(conflictRes.body.error).toBe("DUPLICATE_EMAIL");
    });

    it("API-34: concurrent demotion/deactivation of two remaining admins leaves at least one active admin", async () => {
      const prisma = getPrisma();
      const pass = await hashPassword("AdminPass1234!");

      // Create a second active admin
      const secondAdmin = await prisma.user.create({
        data: {
          name: "Second Admin",
          email: `second.admin.${Date.now()}@example.com`,
          role: "ADMINISTRATOR",
          isActive: true,
          mustChangePassword: false,
          passwordHash: pass,
        },
      });
      createdUserIds.push(secondAdmin.id);

      // Login as second admin
      const secondLogin = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: secondAdmin.email, password: "AdminPass1234!" });
      const secondCookie = secondLogin.headers["set-cookie"];
      const secondCsrf = await request(app).get("/api/auth/csrf").set("Cookie", secondCookie);
      const secondCsrfToken = secondCsrf.body.csrfToken;

      // Deactivate all OTHER admins so only adminId and secondAdmin.id are active
      const otherAdmins = await prisma.user.findMany({
        where: { role: "ADMINISTRATOR", isActive: true, id: { notIn: [adminId, secondAdmin.id] } },
      });
      if (otherAdmins.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: otherAdmins.map((a) => a.id) } },
          data: { isActive: false },
        });
      }

      try {
        // Concurrently attempt:
        // adminId deactivates secondAdmin
        // secondAdmin deactivates adminId
        const [res1, res2] = await Promise.all([
          request(app)
            .patch(`/api/admin/users/${secondAdmin.id}`)
            .set("Origin", DEFAULT_ORIGIN)
            .set("Cookie", adminCookie)
            .set("X-CSRF-Token", adminCsrfToken)
            .send({ isActive: false }),
          request(app)
            .patch(`/api/admin/users/${adminId}`)
            .set("Origin", DEFAULT_ORIGIN)
            .set("Cookie", secondCookie)
            .set("X-CSRF-Token", secondCsrfToken)
            .send({ isActive: false }),
        ]);

        const statuses = [res1.status, res2.status].sort();
        // Exactly one must succeed (200) and one must be rejected by LAST_ACTIVE_ADMIN (400)
        expect(statuses).toEqual([200, 400]);

        const rejected = res1.status === 400 ? res1 : res2;
        expect(rejected.body.error).toBe("LAST_ACTIVE_ADMIN");

        // Verify in DB that exactly 1 active admin remains
        const activeCount = await prisma.user.count({
          where: { role: "ADMINISTRATOR", isActive: true },
        });
        expect(activeCount).toBe(1);
      } finally {
        // Restore deactivated admins
        if (otherAdmins.length > 0) {
          await prisma.user.updateMany({
            where: { id: { in: otherAdmins.map((a) => a.id) } },
            data: { isActive: true },
          });
        }
        // Ensure primary admin remains active for subsequent tests
        await prisma.user.update({
          where: { id: adminId },
          data: { isActive: true },
        });
        // Re-authenticate admin because session might have been revoked when deactivated
        const adminLogin = await request(app)
          .post("/api/auth/login")
          .set("Origin", DEFAULT_ORIGIN)
          .send({ email: "admin.p11@example.com", password: "AdminSecret123!" });
        adminCookie = adminLogin.headers["set-cookie"];
        const adminCsrf = await request(app).get("/api/auth/csrf").set("Cookie", adminCookie);
        adminCsrfToken = adminCsrf.body.csrfToken;
      }
    });

    it("API-35: concurrent ticket reassignment and owner deactivation never leaves an inactive owner", async () => {
      const prisma = getPrisma();
      const pass = await hashPassword("StaffPass1234!");

      const staffUser = await prisma.user.create({
        data: { name: "Cascade Staff", email: `cascade.staff.${Date.now()}@example.com`, role: "IT_STAFF", isActive: true, passwordHash: pass },
      });
      createdUserIds.push(staffUser.id);

      const ticket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-${Date.now()}-P35`,
          summary: "Cascade Race Ticket",
          description: "Testing concurrent assignment and deactivation",
          categoryId: 1,
          relatedSystemId: 1,
          currentStatus: "NEW",
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          requesterId,
          version: 1,
        },
      });
      createdTicketIds.push(ticket.id);

      // Concurrently:
      // Request A: Reassign ticket to staffUser
      // Request B: Deactivate staffUser
      const [assignRes, deactivateRes] = await Promise.all([
        request(app)
          .patch(`/api/staff/tickets/${ticket.id}/owner`)
          .set("Origin", DEFAULT_ORIGIN)
          .set("Cookie", staffCookie)
          .set("X-CSRF-Token", staffCsrfToken)
          .send({ ownerId: staffUser.id, expectedVersion: 1 }),
        request(app)
          .patch(`/api/admin/users/${staffUser.id}`)
          .set("Origin", DEFAULT_ORIGIN)
          .set("Cookie", adminCookie)
          .set("X-CSRF-Token", adminCsrfToken)
          .send({ isActive: false }),
      ]);

      // Deactivation should always succeed
      expect(deactivateRes.status).toBe(200);

      // assignRes MUST strictly be either 200 (if assignment executed before deactivation)
      // or 400 Validation failed (if deactivation executed before assignment). It must never fail with 500.
      expect([200, 400]).toContain(assignRes.status);

      // Inspect final ticket in DB
      const finalTicket = await prisma.ticket.findUnique({
        where: { id: ticket.id },
        include: { ticketOwner: true },
      });

      expect(finalTicket).not.toBeNull();
      // The key safety invariant: The ticket must NEVER end up assigned to an inactive user!
      // Ticket owner must be null at the end of both operations.
      expect(finalTicket?.ticketOwnerId).toBeNull();

      if (assignRes.status === 200) {
        // Case 1: Assignment succeeded first (200), then deactivation cascaded and unassigned it
        expect(deactivateRes.body.unassignedTicketsCount).toBe(1);
        // Version was incremented by assignment (1 -> 2) and then by deactivation cascade (2 -> 3)
        expect(finalTicket?.version).toBe(3);
      } else {
        // Case 2: Deactivation succeeded first (unassigned count 0), then assignment was rejected (400)
        expect(assignRes.status).toBe(400);
        expect(assignRes.body.error).toBe("Validation failed");
        expect(assignRes.body.details?.ownerId).toBe("Owner must be an active IT Staff or Administrator");
        expect(deactivateRes.body.unassignedTicketsCount).toBe(0);
        // Version remains unchanged at initial version
        expect(finalTicket?.version).toBe(1);
      }
    });
  });
});
