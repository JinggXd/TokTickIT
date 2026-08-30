import { describe, it, expect } from "vitest";
import { validateTicketInput } from "../../src/utils/validation.js";

describe("Validation Helper Unit Tests (BR-09)", () => {
  it("UNIT-03: Trim-then-validate helper - rejects whitespace-only or short strings, passes valid input", () => {
    // 1. Summary too short after trim ("  hi  " -> 2 chars, min is 5)
    const shortSummary = validateTicketInput({
      summary: "  hi  ",
      description: "This is a valid long description for testing.",
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "LOW",
    });
    expect(shortSummary.isValid).toBe(false);
    expect(shortSummary.errors.summary).toBe("Summary must be between 5 and 100 characters");

    // 2. Description too short after trim ("  short desc " -> 10 chars minimum)
    const shortDesc = validateTicketInput({
      summary: "Valid summary",
      description: "   12345   ",
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "MEDIUM",
    });
    expect(shortDesc.isValid).toBe(false);
    expect(shortDesc.errors.description).toBe("Description must be between 10 and 2000 characters");

    // 3. Summary exceeds 100 chars
    const longSummary = validateTicketInput({
      summary: "a".repeat(101),
      description: "This is a valid description.",
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "HIGH",
    });
    expect(longSummary.isValid).toBe(false);
    expect(longSummary.errors.summary).toBe("Summary must be between 5 and 100 characters");

    // 4. Invalid priority
    const invalidPriority = validateTicketInput({
      summary: "Valid summary",
      description: "This is a valid description.",
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: "INVALID_PRIORITY" as any,
    });
    expect(invalidPriority.isValid).toBe(false);
    expect(invalidPriority.errors.requestedPriority).toBe("Requested priority must be LOW, MEDIUM, or HIGH");

    // 5. Valid trimmed input passes and returns trimmed values
    const validResult = validateTicketInput({
      summary: "   Laptop battery problem   ",
      description: "   My laptop battery drains in 30 minutes after the latest update.   ",
      categoryId: 2,
      relatedSystemId: 1,
      requestedPriority: "MEDIUM",
    });
    expect(validResult.isValid).toBe(true);
    expect(validResult.data?.summary).toBe("Laptop battery problem");
    expect(validResult.data?.description).toBe("My laptop battery drains in 30 minutes after the latest update.");
    expect(validResult.errors).toEqual({});
  });
});
