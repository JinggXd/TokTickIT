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

  it("UNIT-02: retries up to 3 times on unique-constraint collisions and throws TicketNumberGenerationError on exhaustion", async () => {
    const year = 2026;
    const mockPrisma = {
      ticket: {
        findFirst: vi.fn().mockResolvedValue({
          ticketNo: "TKT-2026-000100",
        }),
      },
    } as any;

    // Simulate an attempt runner that always fails with unique constraint collision
    const attemptWithCollision = vi.fn().mockRejectedValue(new Error("Unique constraint failed on the fields: (`ticketNo`)"));

    await expect(
      generateTicketNumber(mockPrisma, year, attemptWithCollision, 3)
    ).rejects.toThrow(TicketNumberGenerationError);

    // Verify it attempted 3 times
    expect(attemptWithCollision).toHaveBeenCalledTimes(3);
  });
});
