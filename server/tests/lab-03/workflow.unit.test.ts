import { describe, it, expect } from "vitest";
import {
  ALL_STATUSES,
  ALLOWED_TRANSITIONS,
  validateStatusTransition,
  requiresEligibleOwner,
  shouldClearAppearsResolved,
  type TicketStatus,
} from "../../src/utils/workflow.js";

describe("Workflow Status Transitions Engine (AC-32, BR-14, BR-15, UNIT-02)", () => {
  it("defines exactly 8 distinct ticket statuses", () => {
    expect(ALL_STATUSES).toHaveLength(8);
    expect(new Set(ALL_STATUSES).size).toBe(8);
    expect(ALL_STATUSES).toEqual([
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
      "CLOSED",
      "REOPENED",
      "CANCELLED",
    ]);
  });

  it("verifies the exact 64 status transition matrix: 17 allowed, 47 rejected", () => {
    let allowedCount = 0;
    let rejectedCount = 0;

    for (const from of ALL_STATUSES) {
      for (const to of ALL_STATUSES) {
        const isAllowedBySpec = ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
        const result = validateStatusTransition(from, to, { hasEligibleOwner: true });

        if (isAllowedBySpec) {
          allowedCount++;
          expect(result.isValid, `Expected ${from} -> ${to} to be allowed`).toBe(true);
        } else {
          rejectedCount++;
          expect(result.isValid, `Expected ${from} -> ${to} to be rejected`).toBe(false);
          expect(result.error).toBe("ILLEGAL_STATUS_TRANSITION");
          expect(result.message).toBe(`Cannot transition status from '${from}' directly to '${to}'.`);
        }
      }
    }

    expect(allowedCount).toBe(17);
    expect(rejectedCount).toBe(47);
  });

  it("confirms CANCELLED is strictly terminal with 0 outbound transitions", () => {
    expect(ALLOWED_TRANSITIONS.CANCELLED).toEqual([]);
    for (const to of ALL_STATUSES) {
      const result = validateStatusTransition("CANCELLED", to, { hasEligibleOwner: true });
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("ILLEGAL_STATUS_TRANSITION");
    }
  });

  it("enforces BR-15: transitions to OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, and RESOLVED require an active eligible owner", () => {
    const statusesRequiringOwner: TicketStatus[] = [
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "RESOLVED",
    ];

    for (const to of statusesRequiringOwner) {
      expect(requiresEligibleOwner(to)).toBe(true);

      // Find a valid from status for this target
      const validFrom = ALL_STATUSES.find((from) => ALLOWED_TRANSITIONS[from]?.includes(to));
      expect(validFrom).toBeDefined();

      // When hasEligibleOwner is false
      const failed = validateStatusTransition(validFrom!, to, { hasEligibleOwner: false });
      expect(failed.isValid).toBe(false);
      expect(failed.error).toBe("ELIGIBLE_OWNER_REQUIRED");
      expect(failed.message).toBe("Assign an active IT Staff or Administrator before this transition.");

      // When hasEligibleOwner is true
      const success = validateStatusTransition(validFrom!, to, { hasEligibleOwner: true });
      expect(success.isValid).toBe(true);
    }
  });

  it("allows transitions to CANCELLED, CLOSED, and REOPENED without an assigned owner", () => {
    const statusesNotRequiringOwner: TicketStatus[] = ["CANCELLED", "CLOSED", "REOPENED"];

    for (const to of statusesNotRequiringOwner) {
      expect(requiresEligibleOwner(to)).toBe(false);

      const validFrom = ALL_STATUSES.find((from) => ALLOWED_TRANSITIONS[from]?.includes(to));
      expect(validFrom).toBeDefined();

      const result = validateStatusTransition(validFrom!, to, { hasEligibleOwner: false });
      expect(result.isValid).toBe(true);
    }
  });

  it("identifies that transitioning to REOPENED clears appears-resolved fields per BR-15", () => {
    expect(shouldClearAppearsResolved("REOPENED")).toBe(true);
    for (const status of ALL_STATUSES) {
      if (status !== "REOPENED") {
        expect(shouldClearAppearsResolved(status)).toBe(false);
      }
    }
  });
});
