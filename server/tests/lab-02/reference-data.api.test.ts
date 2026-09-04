import request from "supertest";
import { describe, it, expect } from "vitest";
import { app } from "../../src/app.js";

describe("Reference Data Endpoints (API-27)", () => {
  describe("GET /api/categories", () => {
    it("returns active categories in id ascending order (200 OK)", async () => {
      const res = await request(app).get("/api/categories");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(4);

      // Verify shape: { id: number, name: string }
      for (const item of res.body) {
        expect(typeof item.id).toBe("number");
        expect(typeof item.name).toBe("string");
        expect(item).not.toHaveProperty("isActive");
      }

      // Verify ordering
      for (let i = 1; i < res.body.length; i++) {
        expect(res.body[i].id).toBeGreaterThan(res.body[i - 1].id);
      }
    });
  });

  describe("GET /api/related-systems", () => {
    it("returns active related systems in id ascending order (200 OK)", async () => {
      const res = await request(app).get("/api/related-systems");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(3);

      // Verify shape: { id: number, name: string }
      for (const item of res.body) {
        expect(typeof item.id).toBe("number");
        expect(typeof item.name).toBe("string");
        expect(item).not.toHaveProperty("isActive");
      }

      // Verify ordering
      for (let i = 1; i < res.body.length; i++) {
        expect(res.body[i].id).toBeGreaterThan(res.body[i - 1].id);
      }
    });
  });
});
