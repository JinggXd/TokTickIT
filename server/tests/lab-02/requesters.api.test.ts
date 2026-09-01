import request from "supertest";
import { describe, it, expect } from "vitest";
import { app } from "../../src/app.js";

describe("GET /api/requesters/active (api-spec.md Section 6.1, BR-05)", () => {
  it("returns only active Development Requesters in id order (200 OK)", async () => {
    const res = await request(app).get("/api/requesters/active");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);

    // Verify fields of each active requester
    expect(res.body[0]).toEqual({
      id: 1,
      name: "Jennifer Anderson",
      email: "jennifer.a@example.com",
      department: "Marketing",
    });
    expect(res.body[1]).toEqual({
      id: 2,
      name: "Sarah Johnson",
      email: "sarah.j@example.com",
      department: "Finance",
    });
    expect(res.body[2]).toEqual({
      id: 3,
      name: "David Lee",
      email: "david.l@example.com",
      department: "Academic Affairs",
    });
    expect(res.body[3]).toEqual({
      id: 4,
      name: "Emily Chen",
      email: "emily.c@example.com",
      department: "Sales",
    });

    // Inactive requester (Robert Wilson, id: 5) must not be present
    const inactiveUser = res.body.find((r: { name: string }) => r.name === "Robert Wilson");
    expect(inactiveUser).toBeUndefined();
  });
});
