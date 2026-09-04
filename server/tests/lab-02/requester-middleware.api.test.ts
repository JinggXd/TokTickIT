// server/tests/lab-02/requester-middleware.api.test.ts
//
// Phase 2 — tests MW-03, MW-04, MW-05 (middleware-level equivalents of API-03/04/05)
// against the shared X-Requester-Id validation middleware directly, per SKILL.md Phase 2
// item 1, rather than against POST /api/tickets (which doesn't exist until Phase 3).
//
// See docs/lab-02/ambiguity-log.md, "Ambiguity 1" for why this file exists outside the path
// tests.md names, and how Phase 3 re-confirms wiring in create-ticket.api.test.ts.
//
// Run this first and confirm it fails for the right reason (middleware not implemented yet),
// per AGENTS.md Hard Rule #3, before implementing anything.

import express from "express";
import request from "supertest";
import { describe, it, expect, beforeAll } from "vitest";

import { requireRequester } from "../../src/middleware/requireRequester.js";
import { getPrisma } from "../../src/prisma.js";

describe("X-Requester-Id validation middleware (MW-03, MW-04, MW-05)", () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    // Mount the middleware on a throwaway route so these tests exercise ONLY the
    // header-validation logic (api-spec.md Section 2), independent of any real endpoint.
    app.post("/test", requireRequester, (_req, res) => res.sendStatus(200));
  });

  // MW-03 — AC-18: no X-Requester-Id header at all -> 401, generic message, no `details` key
  it("MW-03 (API-03 equivalent): rejects a request with no X-Requester-Id header", async () => {
    const res = await request(app).post("/test").send({});

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Requester context is missing or invalid" });
    expect(res.body).not.toHaveProperty("details");
  });

  // MW-04 — AC-18: malformed header (e.g. "abc", not a valid id) -> 400, NOT 401
  it("MW-04 (API-04 equivalent): rejects a malformed X-Requester-Id header with 400 (not 401)", async () => {
    const res = await request(app)
      .post("/test")
      .set("X-Requester-Id", "abc")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).not.toHaveProperty("details");
  });

  // MW-05 — AC-18: header references a real but inactive Requester -> 401
  it("MW-05 (API-05 equivalent): rejects a header referencing an inactive Requester with 401", async () => {
    const inactiveRequester = await getPrisma().requesterUser.findUniqueOrThrow({
      where: { email: "robert.w@example.com" },
      select: { id: true },
    });

    const res = await request(app)
      .post("/test")
      .set("X-Requester-Id", String(inactiveRequester.id))
      .send({});

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Requester context is missing or invalid" });
    expect(res.body).not.toHaveProperty("details");
  });

  // Valid active requester passes through with 200 OK
  it("passes when a valid active Requester ID is provided", async () => {
    const activeRequester = await getPrisma().requesterUser.findUniqueOrThrow({
      where: { email: "jennifer.a@example.com" },
      select: { id: true },
    });

    const res = await request(app)
      .post("/test")
      .set("X-Requester-Id", String(activeRequester.id))
      .send({});

    expect(res.status).toBe(200);
  });
});
