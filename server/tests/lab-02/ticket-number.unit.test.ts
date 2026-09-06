import { describe, it, expect, vi } from "vitest";
import { generateTicketNumber, TicketNumberGenerationError } from "../../src/utils/ticketNumber.js";

describe("Ticket Number Generator Unit Tests", () => {
  it("UNIT-01: format TKT-YYYY-XXXXXX, strictly increasing, zero-padded to 6 digits", async () => {
    const year = 2026;
    const mockPrisma = {
      ticket: {
        findFirst: vi.fn().mockResolvedValueOnce(null), // no tickets yet
      },
    } as any;

    const firstTicketNo = await generateTicketNumber(mockPrisma, year);
    expect(firstTicketNo).toBe("TKT-2026-000001");

    // Next ticket with previous ticket existing
    mockPrisma.ticket.findFirst.mockResolvedValueOnce({
      ticketNo: "TKT-2026-000042",
    });

    const nextTicketNo = await generateTicketNumber(mockPrisma, year);
    expect(nextTicketNo).toBe("TKT-2026-000043");
  });

  it("UNIT-01: never emits a sequence wider than 6 digits", async () => {
    const mockPrisma = {
      ticket: {
        findFirst: vi.fn().mockResolvedValue({
          ticketNo: "TKT-2026-999999",
        }),
      },
    } as any;

    await expect(generateTicketNumber(mockPrisma, 2026)).rejects.toThrow(
      TicketNumberGenerationError
    );
  });

  it("UNIT-02: retries up to 3 times on unique-constraint collisions and throws TicketNumberGenerationError on exhaustion", async () => {
    const year = 2026;
    const mockPrisma = {
      ticket: {
        findFirst: vi.fn()
          .mockResolvedValueOnce({ ticketNo: "TKT-2026-000100" })
          .mockResolvedValueOnce({ ticketNo: "TKT-2026-000101" })
          .mockResolvedValueOnce({ ticketNo: "TKT-2026-000102" }),
      },
    } as any;

    // Simulate the actual ticket insert failing on ticketNo's unique constraint.
    // The callback receives the generated candidate so this test proves the
    // collision happens after generation, at the same point as prisma.ticket.create().
    const collision = Object.assign(
      new Error("Unique constraint failed on the fields: (`ticketNo`)"),
      { code: "P2002", meta: { target: ["ticketNo"] } }
    );
    const attemptWithCollision = vi.fn().mockRejectedValue(collision);

    await expect(
      generateTicketNumber(mockPrisma, year, attemptWithCollision, 3)
    ).rejects.toThrow(TicketNumberGenerationError);

    // Verify it attempted 3 times
    expect(attemptWithCollision).toHaveBeenCalledTimes(3);
    expect(attemptWithCollision).toHaveBeenNthCalledWith(1, "TKT-2026-000101");
    expect(attemptWithCollision).toHaveBeenNthCalledWith(2, "TKT-2026-000102");
    expect(attemptWithCollision).toHaveBeenNthCalledWith(3, "TKT-2026-000103");
  });

  it("UNIT-02: does not retry an unrelated database failure", async () => {
    const mockPrisma = {
      ticket: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    } as any;
    const databaseFailure = new Error("Database connection lost");
    const attemptWithFailure = vi.fn().mockRejectedValue(databaseFailure);

    await expect(
      generateTicketNumber(mockPrisma, 2026, attemptWithFailure, 3)
    ).rejects.toBe(databaseFailure);

    expect(attemptWithFailure).toHaveBeenCalledTimes(1);
  });
});
