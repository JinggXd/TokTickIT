import { PrismaClient } from "@prisma/client";

export class TicketNumberGenerationError extends Error {
  constructor(message = "Failed to generate a unique ticket number after maximum retries") {
    super(message);
    this.name = "TicketNumberGenerationError";
  }
}

/**
 * Generates a unique ticket number formatted as TKT-YYYY-XXXXXX (BR-01).
 * If a unique-constraint collision occurs, retries up to `maxRetries` times.
 */
export async function generateTicketNumber(
  prisma: PrismaClient,
  year: number = new Date().getFullYear(),
  attemptRunner?: (ticketNo: string) => Promise<unknown>,
  maxRetries: number = 3
): Promise<string> {
  const prefix = `TKT-${year}-`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Find the ticket with the highest ticket number for the given year.
    // Database read failures are not collisions and must not be retried here.
    const latestTicket = await prisma.ticket.findFirst({
      where: {
        ticketNo: {
          startsWith: prefix,
        },
      },
      orderBy: {
        ticketNo: "desc",
      },
      select: {
        ticketNo: true,
      },
    });

    let nextSeq = 1;
    if (latestTicket?.ticketNo) {
      const parts = latestTicket.ticketNo.split("-");
      if (parts.length === 3) {
        const parsed = parseInt(parts[2], 10);
        if (!isNaN(parsed)) {
          nextSeq = parsed + 1;
        }
      }
    }

    if (nextSeq > 999_999) {
      throw new TicketNumberGenerationError(
        `Ticket number sequence exhausted for ${year}`
      );
    }

    const ticketNo = `${prefix}${String(nextSeq).padStart(6, "0")}`;

    if (!attemptRunner) {
      return ticketNo;
    }

    try {
      // Phase 3 passes its prisma.ticket.create attempt here. A successful
      // callback reserves the candidate; P2002 on ticketNo triggers a retry.
      await attemptRunner(ticketNo);
      return ticketNo;
    } catch (error: unknown) {
      if (!isTicketNumberCollision(error)) {
        throw error;
      }

      if (attempt === maxRetries) {
        throw new TicketNumberGenerationError(
          `Unable to generate a unique ticket number after ${maxRetries} attempts`
        );
      }
    }
  }

  throw new TicketNumberGenerationError();
}

function isTicketNumberCollision(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") {
    return false;
  }

  const meta = "meta" in error ? error.meta : undefined;
  if (!meta || typeof meta !== "object" || !("target" in meta)) {
    return false;
  }

  const target = meta.target;
  return Array.isArray(target)
    ? target.some((field) => field === "ticketNo")
    : String(target).includes("ticketNo");
}
