import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { requireRequester, AuthenticatedRequesterRequest } from "./middleware/requireRequester.js";
import { validateTicketInput } from "./utils/validation.js";
import { generateTicketNumber, TicketNumberGenerationError } from "./utils/ticketNumber.js";
// getPrisma() is your lazy database handle. Call it INSIDE a route when you
// need the DB (Issue 4). It is intentionally unused until then.
void getPrisma;

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());          // already wired: lets the Vite dev server call this API
app.use(express.json({ strict: false }));
app.use((err: any, _req: Request, res: Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && "status" in err && err.status === 400) {
    res.status(400).json({
      error: "Validation failed",
      details: { body: "Invalid JSON payload" },
    });
    return;
  }
  next(err);
});

// ---------------------------------------------------------------------------
// Issue 2 — API health check
// Make the test in tests/lab-01/health.test.ts pass.
// It must return HTTP 200 with JSON: { status: "ok", service: "TokTickIT API" }
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Issue 4 & Lab 2 Phase 3 — Category list (api-spec.md Section 6.2, API-27)
// Returns active Categories ordered by id asc.
// ---------------------------------------------------------------------------
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: "Unable to load categories" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2: Phase 3 — Related Systems list (api-spec.md Section 6.3, API-27)
// Returns active Related Systems ordered by id asc.
// ---------------------------------------------------------------------------
app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(systems);
  } catch (err) {
    res.status(500).json({ error: "Unable to load related systems" });
  }
});

// ---------------------------------------------------------------------------
// Lab 2: Phase 2 — Active Development Requesters (api-spec.md Section 6.1, BR-05)
// ---------------------------------------------------------------------------
app.get("/api/requesters/active", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().requesterUser.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
      },
    });
    res.status(200).json(requesters);
  } catch (err) {
    res.status(500).json({ error: "Unable to load Development Requesters. Please try again." });
  }
});

// ---------------------------------------------------------------------------
// Lab 2: Phase 3 — Create Ticket (api-spec.md Section 6.4, API-01 to API-05, API-21, API-28, API-29)
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets",
  requireRequester as express.RequestHandler,
  async (req: AuthenticatedRequesterRequest, res: Response): Promise<void> => {
    try {
      // 1. Validate payload syntax and length (BR-09)
      const validation = validateTicketInput(req.body);
      const errors: Record<string, string> = { ...validation.errors };

      const prisma = getPrisma();

      // 2. Reference checks: use candidate IDs so reference errors are collected alongside syntax errors
      if (validation.candidates?.categoryId) {
        const category = await prisma.category.findUnique({
          where: { id: validation.candidates.categoryId },
        });
        if (!category || !category.isActive) {
          errors.categoryId = "Category does not exist or is inactive";
        }
      }

      if (validation.candidates?.relatedSystemId) {
        const system = await prisma.relatedSystem.findUnique({
          where: { id: validation.candidates.relatedSystemId },
        });
        if (!system || !system.isActive) {
          errors.relatedSystemId = "Related system does not exist or is inactive";
        }
      }

      if (Object.keys(errors).length > 0) {
        res.status(400).json({
          error: "Validation failed",
          details: errors,
        });
        return;
      }

      // 3. Create ticket with ticket number generation and collision retries
      const requesterId = req.requester!.id;
      const { summary, description, categoryId, relatedSystemId, requestedPriority } = validation.data!;

      let createdTicket: {
        id: number;
        ticketNo: string;
        summary: string;
        description: string;
        requestedPriority: "LOW" | "MEDIUM" | "HIGH";
        itPriority: "LOW" | "MEDIUM" | "HIGH";
        currentStatus: "NEW" | "IN_PROGRESS" | "RESOLVED";
        requesterId: number;
        createdAt: Date;
      } | null = null;

      await generateTicketNumber(
        prisma,
        new Date().getFullYear(),
        async (ticketNo: string) => {
          createdTicket = await prisma.ticket.create({
            data: {
              ticketNo,
              summary,
              description,
              requestedPriority,
              itPriority: requestedPriority, // BR-16: itPriority = requestedPriority
              currentStatus: "NEW",          // BR-02: always starts with NEW
              requesterId,
              categoryId,
              relatedSystemId,
              ticketOwnerId: null,          // BR-17: unassigned
            },
          });
        }
      );

      if (!createdTicket) {
        res.status(500).json({ error: "Unable to create ticket. Please try again." });
        return;
      }

      const ticket = createdTicket as {
        id: number;
        ticketNo: string;
        summary: string;
        description: string;
        requestedPriority: string;
        itPriority: string;
        currentStatus: string;
        requesterId: number;
        createdAt: Date;
      };

      res.status(201).json({
        id: ticket.id,
        ticketNo: ticket.ticketNo,
        summary: ticket.summary,
        description: ticket.description,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        currentStatus: ticket.currentStatus,
        requesterId: ticket.requesterId,
        createdAt: ticket.createdAt.toISOString(),
      });
    } catch (error: unknown) {
      if (error instanceof TicketNumberGenerationError) {
        res.status(500).json({ error: "Unable to create ticket. Please try again." });
        return;
      }
      res.status(500).json({ error: "Unable to create ticket. Please try again." });
    }
  }
);

export default app;
