import crypto from "node:crypto";
import request from "supertest";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { hashPassword } from "../../src/utils/password.js";
import { resetAllRateLimits } from "../../src/utils/rateLimit.js";

describe("Phase F2 / P04 Authentication API (AC-01, AC-02, AC-05, AC-06, AC-07, AC-08, AC-09, AC-10)", () => {
  const DEFAULT_ORIGIN = "http://localhost:5173";

  beforeEach(() => {
    resetAllRateLimits();
  });

  afterAll(async () => {
    const prisma = getPrisma();
    const testEmails = [
      "test.active.login@example.com",
      "inactive.user@example.com",
      "test.me.endpoint@example.com",
      "forced.change.user@example.com",
      "change.pwd.validation@example.com",
      "change.pwd.success@example.com",
      "logout.test@example.com",
      "rate.limited@example.com",
      "csrf.test@example.com",
    ];
    await prisma.session.deleteMany({
      where: { user: { email: { in: testEmails } } },
    });
    await prisma.user.deleteMany({
      where: { email: { in: testEmails } },
    });
  });

  // -------------------------------------------------------------------------
  // API-01 (AC-01, R01, BR-01): Login with valid credentials
  // -------------------------------------------------------------------------
  describe("API-01: Login with valid credentials", () => {
    it("logs in active user, returns profile, sets HttpOnly toktickit_session cookie, no-store header", async () => {
      const prisma = getPrisma();
      const testEmail = "test.active.login@example.com";
      const testPassword = "ValidPassword2026!";
      const hashedPassword = await hashPassword(testPassword);
      await prisma.user.upsert({
        where: { email: testEmail },
        update: {
          passwordHash: hashedPassword,
          isActive: true,
          mustChangePassword: false,
          role: "REQUESTER",
        },
        create: {
          email: testEmail,
          name: "Test Login User",
          department: "IT",
          role: "REQUESTER",
          passwordHash: hashedPassword,
          isActive: true,
          mustChangePassword: false,
        },
      });

      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: testEmail, password: testPassword });

      expect(res.status).toBe(200);
      expect(res.headers["cache-control"]).toContain("no-store");
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.role).toBe("REQUESTER");
      expect(res.body.user.mustChangePassword).toBe(false);

      const cookieHeader = res.headers["set-cookie"];
      expect(cookieHeader).toBeDefined();
      const cookieStr = Array.isArray(cookieHeader) ? cookieHeader.join(";") : cookieHeader;
      expect(cookieStr).toContain("toktickit_session=");
      expect(cookieStr).toContain("HttpOnly");
      expect(cookieStr).toContain("Path=/");
      expect(cookieStr).toContain("SameSite=Lax");
      expect(cookieStr).toContain("Max-Age=28800");
    });
  });

  // -------------------------------------------------------------------------
  // API-03 (AC-05, R01, BR-05): Login errors
  // -------------------------------------------------------------------------
  describe("API-03: Login failure uniform error responses", () => {
    it("returns uniform 401 for wrong password", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: "sarah.j@example.com", password: "WrongPassword123!" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid email or password" });
    });

    it("returns uniform 401 for non-existent email", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: "doesnotexist@example.com", password: "AnyPassword123!" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid email or password" });
    });

    it("returns uniform 401 for inactive account", async () => {
      const prisma = getPrisma();
      const inactiveEmail = "inactive.user@example.com";
      const hashedPassword = await hashPassword("SomePassword123!");
      await prisma.user.upsert({
        where: { email: inactiveEmail },
        update: { isActive: false, passwordHash: hashedPassword },
        create: {
          email: inactiveEmail,
          name: "Inactive User",
          department: "IT",
          role: "REQUESTER",
          isActive: false,
          passwordHash: hashedPassword,
        },
      });

      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: inactiveEmail, password: "SomePassword123!" });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Invalid email or password" });
    });

    it("returns uniform 401 for unprovisioned account without passwordHash (Spec §7.2 Rule 6, MIG-04)", async () => {
      const prisma = getPrisma();
      const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const unprovisionedEmail = `unprovisioned.legacy.${uniqueSuffix}@example.com`;
      const createdUser = await prisma.user.create({
        data: {
          email: unprovisionedEmail,
          name: "Unprovisioned Legacy User",
          department: "Operations",
          role: "REQUESTER",
          isActive: true,
          passwordHash: null,
        },
      });

      try {
        const res = await request(app)
          .post("/api/auth/login")
          .set("Origin", DEFAULT_ORIGIN)
          .send({ email: unprovisionedEmail, password: "AnyAttemptedPassword123!" });

        expect(res.status).toBe(401);
        expect(res.body).toEqual({ error: "Invalid email or password" });
      } finally {
        await prisma.user.delete({ where: { id: createdUser.id } });
      }
    });

    it("returns 400 if email or password missing in request body", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Validation failed");
    });

    it("returns 403 CSRF_INVALID when Origin header is missing or untrusted on login", async () => {
      // Missing Origin
      const noOriginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: "admin@example.com", password: "Password123!@#" });
      expect(noOriginRes.status).toBe(403);
      expect(noOriginRes.body).toEqual({
        error: "CSRF_INVALID",
        message: "Refresh the page and try again.",
      });

      // Untrusted Origin
      const untrustedRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", "http://evil-origin.com")
        .send({ email: "admin@example.com", password: "Password123!@#" });
      expect(untrustedRes.status).toBe(403);
      expect(untrustedRes.body).toEqual({
        error: "CSRF_INVALID",
        message: "Refresh the page and try again.",
      });
    });
  });

  // -------------------------------------------------------------------------
  // API-05 (AC-07, R01): GET /api/auth/me
  // -------------------------------------------------------------------------
  describe("API-05: GET /api/auth/me", () => {
    it("returns 401 if no session cookie provided", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "Authentication required" });
    });

    it("returns 200 with user profile when valid session cookie provided", async () => {
      const prisma = getPrisma();
      const testEmail = "test.me.endpoint@example.com";
      const hashedPassword = await hashPassword("TestPass12345!");
      const user = await prisma.user.upsert({
        where: { email: testEmail },
        update: { isActive: true, mustChangePassword: false, passwordHash: hashedPassword },
        create: {
          email: testEmail,
          name: "Test Me User",
          department: "Support",
          role: "IT_STAFF",
          isActive: true,
          mustChangePassword: false,
          passwordHash: hashedPassword,
        },
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: testEmail, password: "TestPass12345!" });

      const cookie = loginRes.headers["set-cookie"];

      const meRes = await request(app).get("/api/auth/me").set("Cookie", cookie);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user).toEqual({
        id: user.id,
        name: "Test Me User",
        email: testEmail,
        role: "IT_STAFF",
        mustChangePassword: false,
      });
    });
  });

  // -------------------------------------------------------------------------
  // API-02 (AC-02, R02, BR-02): Mandatory password change guard
  // -------------------------------------------------------------------------
  describe("API-02: Mandatory password change required guard", () => {
    it("blocks access to /api/tickets with 403 PASSWORD_CHANGE_REQUIRED when mustChangePassword is true", async () => {
      const prisma = getPrisma();
      const testEmail = "forced.change.user@example.com";
      const hashedPassword = await hashPassword("InitialPass123!");
      await prisma.user.upsert({
        where: { email: testEmail },
        update: {
          isActive: true,
          mustChangePassword: true,
          passwordHash: hashedPassword,
          role: "REQUESTER",
        },
        create: {
          email: testEmail,
          name: "Forced Change User",
          department: "Sales",
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: true,
          passwordHash: hashedPassword,
        },
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: testEmail, password: "InitialPass123!" });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.mustChangePassword).toBe(true);
      const cookie = loginRes.headers["set-cookie"];

      // /api/auth/me is allowed even when mustChangePassword is true
      const meRes = await request(app).get("/api/auth/me").set("Cookie", cookie);
      expect(meRes.status).toBe(200);

      // /api/tickets must be blocked with 403 PASSWORD_CHANGE_REQUIRED
      const ticketsRes = await request(app).get("/api/tickets").set("Cookie", cookie);
      expect(ticketsRes.status).toBe(403);
      expect(ticketsRes.body).toEqual({
        error: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password before accessing this resource.",
      });
    });
  });

  // -------------------------------------------------------------------------
  // API-04 & API-40: Password Change and Session Rotation
  // -------------------------------------------------------------------------
  describe("API-04 & API-40: Change Password Lifecycle", () => {
    it("validates short password (<12), mismatched confirm, and same password with 400", async () => {
      const prisma = getPrisma();
      const testEmail = "change.pwd.validation@example.com";
      const hashedPassword = await hashPassword("CurrentSecure123!");
      await prisma.user.upsert({
        where: { email: testEmail },
        update: {
          isActive: true,
          passwordHash: hashedPassword,
        },
        create: {
          email: testEmail,
          name: "Change Pwd User",
          department: "IT",
          role: "REQUESTER",
          isActive: true,
          passwordHash: hashedPassword,
        },
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: testEmail, password: "CurrentSecure123!" });
      const cookie = loginRes.headers["set-cookie"];

      // Fetch CSRF token
      const csrfRes = await request(app).get("/api/auth/csrf").set("Cookie", cookie);
      const csrfToken = csrfRes.body.csrfToken;

      // Short password (<12)
      const shortRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .set("Origin", DEFAULT_ORIGIN)
        .set("X-CSRF-Token", csrfToken)
        .send({
          currentPassword: "CurrentSecure123!",
          newPassword: "short",
          confirmPassword: "short",
        });
      expect(shortRes.status).toBe(400);
      expect(shortRes.body.details.newPassword).toBe("New password must be between 12 and 128 characters");

      // Mismatched confirmation
      const mismatchRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .set("Origin", DEFAULT_ORIGIN)
        .set("X-CSRF-Token", csrfToken)
        .send({
          currentPassword: "CurrentSecure123!",
          newPassword: "NewValidPassword2026!",
          confirmPassword: "DifferentPassword2026!",
        });
      expect(mismatchRes.status).toBe(400);
      expect(mismatchRes.body.details.confirmPassword).toBe("Passwords do not match");

      // Identical to current password
      const sameRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .set("Origin", DEFAULT_ORIGIN)
        .set("X-CSRF-Token", csrfToken)
        .send({
          currentPassword: "CurrentSecure123!",
          newPassword: "CurrentSecure123!",
          confirmPassword: "CurrentSecure123!",
        });
      expect(sameRes.status).toBe(400);
      expect(sameRes.body.details.newPassword).toBe("New password must be different from current password");

      // Wrong current password
      const wrongCurrentRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .set("Origin", DEFAULT_ORIGIN)
        .set("X-CSRF-Token", csrfToken)
        .send({
          currentPassword: "WrongCurrentPassword123!",
          newPassword: "BrandNewSecurePassword2026!",
          confirmPassword: "BrandNewSecurePassword2026!",
        });
      expect(wrongCurrentRes.status).toBe(400);
      expect(wrongCurrentRes.body.details.currentPassword).toBe("Incorrect current password");
    });

    it("API-40: succeeds with valid input, rotates cookie, revokes old cookie, and clears mustChangePassword", async () => {
      const prisma = getPrisma();
      const testEmail = "change.pwd.success@example.com";
      const hashedPassword = await hashPassword("TempPassword123!");
      await prisma.user.upsert({
        where: { email: testEmail },
        update: {
          isActive: true,
          mustChangePassword: true,
          passwordHash: hashedPassword,
        },
        create: {
          email: testEmail,
          name: "Success Change User",
          department: "HR",
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: true,
          passwordHash: hashedPassword,
        },
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: testEmail, password: "TempPassword123!" });
      const oldCookie = loginRes.headers["set-cookie"];

      const csrfRes = await request(app).get("/api/auth/csrf").set("Cookie", oldCookie);
      const csrfToken = csrfRes.body.csrfToken;

      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", oldCookie)
        .set("Origin", DEFAULT_ORIGIN)
        .set("X-CSRF-Token", csrfToken)
        .send({
          currentPassword: "TempPassword123!",
          newPassword: "PermanentSecurePassword2026!",
          confirmPassword: "PermanentSecurePassword2026!",
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.message).toBe("Password changed successfully");
      expect(changeRes.body.user.mustChangePassword).toBe(false);

      const newCookie = changeRes.headers["set-cookie"];
      expect(newCookie).toBeDefined();

      // Old cookie is revoked (returns 401)
      const oldCookieRes = await request(app).get("/api/auth/me").set("Cookie", oldCookie);
      expect(oldCookieRes.status).toBe(401);

      // New cookie works
      const newCookieRes = await request(app).get("/api/auth/me").set("Cookie", newCookie);
      expect(newCookieRes.status).toBe(200);

      // Login with new password succeeds
      const newLoginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: testEmail, password: "PermanentSecurePassword2026!" });
      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.user.mustChangePassword).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // API-06 (AC-08, R01, BR-01): Logout
  // -------------------------------------------------------------------------
  describe("API-06: Logout Lifecycle", () => {
    it("invalidates session, clears cookie with 204, and denies subsequent access with 401", async () => {
      const prisma = getPrisma();
      const testEmail = "logout.test@example.com";
      const hashedPassword = await hashPassword("LogoutPass123!");
      await prisma.user.upsert({
        where: { email: testEmail },
        update: { isActive: true, passwordHash: hashedPassword },
        create: {
          email: testEmail,
          name: "Logout User",
          department: "Ops",
          role: "REQUESTER",
          isActive: true,
          passwordHash: hashedPassword,
        },
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: testEmail, password: "LogoutPass123!" });
      const cookie = loginRes.headers["set-cookie"];

      const csrfRes = await request(app).get("/api/auth/csrf").set("Cookie", cookie);
      const csrfToken = csrfRes.body.csrfToken;

      const logoutRes = await request(app)
        .post("/api/auth/logout")
        .set("Cookie", cookie)
        .set("Origin", DEFAULT_ORIGIN)
        .set("X-CSRF-Token", csrfToken);

      expect(logoutRes.status).toBe(204);

      const clearCookie = logoutRes.headers["set-cookie"];
      const cookieStr = Array.isArray(clearCookie) ? clearCookie.join(";") : clearCookie;
      expect(cookieStr).toContain("toktickit_session=;");
      expect(cookieStr).toContain("1970");

      // Old cookie is no longer valid in database
      const subsequentRes = await request(app).get("/api/auth/me").set("Cookie", cookie);
      expect(subsequentRes.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // SEC-03: Rate Limiting on Login
  // -------------------------------------------------------------------------
  describe("SEC-03: Rate limiting on login (5 attempts / 15 minutes)", () => {
    it("allows 5 failed attempts and blocks the 6th with HTTP 429 and Retry-After header", async () => {
      const email = "rate.limited@example.com";

      // 5 failed attempts return 401
      for (let i = 1; i <= 5; i++) {
        const res = await request(app)
          .post("/api/auth/login")
          .set("Origin", DEFAULT_ORIGIN)
          .send({ email, password: `WrongPassword${i}!` });
        expect(res.status).toBe(401);
      }

      // 6th attempt is rate limited -> 429
      const sixthRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email, password: "AnotherAttempt123!" });

      expect(sixthRes.status).toBe(429);
      expect(sixthRes.body).toEqual({
        error: "TOO_MANY_ATTEMPTS",
        message: "Too many failed login attempts. Please try again later.",
      });
      expect(sixthRes.headers["retry-after"]).toBeDefined();
      const retryAfter = Number(sixthRes.headers["retry-after"]);
      expect(retryAfter).toBeGreaterThanOrEqual(1);
      expect(retryAfter).toBeLessThanOrEqual(900);
    });
  });

  // -------------------------------------------------------------------------
  // SEC-12: CSRF Validation
  // -------------------------------------------------------------------------
  describe("SEC-12: CSRF Origin and Token Enforcement", () => {
    it("rejects state-changing requests with invalid or missing CSRF token with 403 CSRF_INVALID", async () => {
      const prisma = getPrisma();
      const testEmail = "csrf.test@example.com";
      const hashedPassword = await hashPassword("CsrfPass123!");
      await prisma.user.upsert({
        where: { email: testEmail },
        update: { isActive: true, passwordHash: hashedPassword },
        create: {
          email: testEmail,
          name: "CSRF Test User",
          department: "IT",
          role: "REQUESTER",
          isActive: true,
          passwordHash: hashedPassword,
        },
      });

      const loginRes = await request(app)
        .post("/api/auth/login")
        .set("Origin", DEFAULT_ORIGIN)
        .send({ email: testEmail, password: "CsrfPass123!" });
      const cookie = loginRes.headers["set-cookie"];

      // Missing CSRF token
      const missingTokenRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .set("Origin", DEFAULT_ORIGIN)
        .send({
          currentPassword: "CsrfPass123!",
          newPassword: "NewValidPassword2026!",
          confirmPassword: "NewValidPassword2026!",
        });
      expect(missingTokenRes.status).toBe(403);
      expect(missingTokenRes.body).toEqual({
        error: "CSRF_INVALID",
        message: "Refresh the page and try again.",
      });

      // Wrong CSRF token
      const wrongTokenRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .set("Origin", DEFAULT_ORIGIN)
        .set("X-CSRF-Token", "wrong-token-value")
        .send({
          currentPassword: "CsrfPass123!",
          newPassword: "NewValidPassword2026!",
          confirmPassword: "NewValidPassword2026!",
        });
      expect(wrongTokenRes.status).toBe(403);
      expect(wrongTokenRes.body).toEqual({
        error: "CSRF_INVALID",
        message: "Refresh the page and try again.",
      });

      // Untrusted Origin header
      const untrustedOriginRes = await request(app)
        .post("/api/auth/change-password")
        .set("Cookie", cookie)
        .set("Origin", "http://evil-attacker.com")
        .set("X-CSRF-Token", "some-token")
        .send({});
      expect(untrustedOriginRes.status).toBe(403);
      expect(untrustedOriginRes.body).toEqual({
        error: "CSRF_INVALID",
        message: "Refresh the page and try again.",
      });
    });
  });
});
