import { describe, it, expect } from "vitest";
import { validateActionDateTime, isValidUUIDv4, normalizeActionPayload, computeRequestPayloadHash } from "../../src/utils/actionValidation.js";

describe("Phase F2 / L4-P04: Action Validation Unit Tests (UNIT-L4-01, UNIT-L4-02)", () => {
  describe("UNIT-L4-01: Action event datetime validation with 5m clock-skew tolerance (BR-08)", () => {
    it("accepts undefined or null (defaults to now)", () => {
      const result = validateActionDateTime(undefined);
      expect(result.valid).toBe(true);
      expect(result.date).toBeInstanceOf(Date);
    });

    it("accepts a past date/time", () => {
      const past = new Date(Date.now() - 3600 * 1000).toISOString();
      const result = validateActionDateTime(past);
      expect(result.valid).toBe(true);
      expect(result.date?.toISOString()).toBe(new Date(past).toISOString());
    });

    it("accepts a date up to 5 minutes in the future", () => {
      const future4m = new Date(Date.now() + 4 * 60 * 1000).toISOString();
      const result = validateActionDateTime(future4m);
      expect(result.valid).toBe(true);
    });

    it("rejects a date more than 5 minutes in the future", () => {
      const future6m = new Date(Date.now() + 6 * 60 * 1000).toISOString();
      const result = validateActionDateTime(future6m);
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/5 minutes/i);
    });

    it("rejects invalid date strings", () => {
      const result = validateActionDateTime("invalid-date-string");
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/invalid/i);
    });
  });

  describe("UNIT-L4-02: Idempotency UUIDv4 format validation (D09)", () => {
    it("accepts valid RFC 4122 UUIDv4 strings", () => {
      expect(isValidUUIDv4("c2b4899c-36b3-4f9e-a892-0b29841804b4")).toBe(true);
      expect(isValidUUIDv4("C2B4899C-36B3-4F9E-A892-0B29841804B4")).toBe(true);
      expect(isValidUUIDv4("123e4567-e89b-42d3-a456-426614174000")).toBe(true);
    });

    it("rejects malformed UUID strings", () => {
      expect(isValidUUIDv4("")).toBe(false);
      expect(isValidUUIDv4("not-a-uuid")).toBe(false);
      expect(isValidUUIDv4("12345678-1234-1234-1234-123456789012")).toBe(false); // version 1, not 4
      expect(isValidUUIDv4("c2b4899c-36b3-4f9e-2892-0b29841804b4")).toBe(false); // variant 2, not [89ab]
      expect(isValidUUIDv4("c2b4899c36b34f9ea8920b29841804b4")).toBe(false); // missing dashes
    });
  });

  describe("Canonical Request Payload Hash normalization (D09)", () => {
    it("normalizes and deterministically hashes the 8 fields", () => {
      const payload1 = {
        actionDateTime: "2026-09-25T14:30:00.000Z",
        actionDescription: "  Checked switch port  ",
        status: "COMPLETED",
        result: "  Fixed cord  ",
        assigneeId: null,
        followUpRequired: false,
        followUpNote: "  ignored since false  ",
        attachmentNotes: "  notes  ",
      };

      const payload2 = {
        actionDateTime: "2026-09-25T14:30:00.000Z",
        actionDescription: "Checked switch port",
        status: "COMPLETED",
        result: "Fixed cord",
        assigneeId: null,
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: "notes",
      };

      const hash1 = computeRequestPayloadHash(payload1);
      const hash2 = computeRequestPayloadHash(payload2);

      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe("string");
      expect(hash1.length).toBe(64);
    });
  });
});
