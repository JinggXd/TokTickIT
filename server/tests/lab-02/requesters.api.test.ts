// Lab 3 api-spec §3 retires the Lab 2 development identity directory.
// Original assertions remain in git at a7ca120; session/ownership regression
// coverage is retained in the other Lab 2 suites and Lab 3 authorization tests.
import request from "supertest";
import { afterEach, describe, it, expect, vi } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { sessionHeaders } from "../helpers/session.js";

describe("Retired GET /api/requesters/active (Lab 3 api-spec §3)", () => {
  afterEach(() => vi.restoreAllMocks());
  it("does not expose the requester directory without authentication", async () => {
    const res = await request(app).get("/api/requesters/active");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Endpoint retired" });
  });
  it("remains retired for an authenticated requester", async () => {
    const res = await request(app).get("/api/requesters/active").set(await sessionHeaders());
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Endpoint retired" });
  });
  it("does not query user records even if the directory database operation fails", async () => {
    const lookup = vi.spyOn(getPrisma().user, "findMany").mockRejectedValue(new Error("database unavailable"));
    const res = await request(app).get("/api/requesters/active");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Endpoint retired" });
    expect(lookup).not.toHaveBeenCalled();
  });
});
