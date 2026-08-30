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
  attemptRunner?: () => Promise<any>,
  maxRetries: number = 3
): Promise<string> {
  const prefix = `TKT-${year}-`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attemptRunner) {
        await attemptRunner();
      }

      // Find the ticket with the highest ticket number for the given year
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

      const seqPadded = String(nextSeq).padStart(6, "0");
      return `${prefix}${seqPadded}`;
    } catch (err: any) {
      if (attempt === maxRetries) {
        throw new TicketNumberGenerationError(
          `Unable to generate a unique ticket number after ${maxRetries} attempts: ${err.message}`
        );
      }
      // Retry
    }
  }

  throw new TicketNumberGenerationError();
}
