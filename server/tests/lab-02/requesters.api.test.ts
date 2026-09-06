import request from "supertest";
import { afterEach, describe, it, expect, vi } from "vitest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/requesters/active (api-spec.md Section 6.1, BR-05)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns only active Development Requesters in id order (200 OK)", async () => {
    const res = await request(app).get("/api/requesters/active");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);

    expect(res.body).toEqual(expect.arrayContaining([
      expect.objectContaining({
        name: "Jennifer Anderson",
        email: "jennifer.a@example.com",
        department: "Marketing",
      }),
      expect.objectContaining({
        name: "Sarah Johnson",
        email: "sarah.j@example.com",
        department: "Finance",
      }),
      expect.objectContaining({
        name: "David Lee",
        email: "david.l@example.com",
        department: "Academic Affairs",
      }),
      expect.objectContaining({
        name: "Emily Chen",
        email: "emily.c@example.com",
        department: "Sales",
      }),
    ]));
    expect(res.body.every((r: { id: unknown }) => Number.isInteger(r.id))).toBe(true);
    const ids = res.body.map((r: { id: number }) => r.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));

    // The inactive seeded requester must not be present, regardless of its generated id.
    const inactiveUser = res.body.find((r: { name: string }) => r.name === "Robert Wilson");
    expect(inactiveUser).toBeUndefined();
  });

  it("API-26: returns 200 with an empty array when no active Requesters exist", async () => {
    vi.spyOn(getPrisma().requesterUser, "findMany").mockResolvedValueOnce([]);

    const res = await request(app).get("/api/requesters/active");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("API-26: returns the documented safe 500 response when the database fails", async () => {
    vi.spyOn(getPrisma().requesterUser, "findMany").mockRejectedValueOnce(
      new Error("database unavailable")
    );

    const res = await request(app).get("/api/requesters/active");

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: "Unable to load Development Requesters. Please try again.",
    });
  });
});
