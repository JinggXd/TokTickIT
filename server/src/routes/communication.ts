import express, { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requirePasswordChanged, requireRole } from "../middleware/sessionAuth.js";

export const communicationRouter = express.Router();

function parseTicketId(param: string): number | null {
  if (!/^[1-9]\d*$/.test(param)) return null;
  return parseInt(param, 10);
}

// ---------------------------------------------------------------------------
// Append-only 405 guards (AC-37, api-spec §4.5)
// ---------------------------------------------------------------------------
communicationRouter.all("/tickets/:id/public-comments", (req: Request, res: Response, next) => {
  if (["PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST").status(405).json({
      error: "Method Not Allowed",
      message: "Comments are strictly append-only. Mutation or deletion is not permitted.",
    });
    return;
  }
  next();
});

communicationRouter.all("/tickets/:id/internal-notes", (req: Request, res: Response, next) => {
  if (["PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST").status(405).json({
      error: "Method Not Allowed",
      message: "Notes are strictly append-only. Mutation or deletion is not permitted.",
    });
    return;
  }
  next();
});

// ---------------------------------------------------------------------------
// Public Comments Endpoints (api-spec §4.1, §4.2)
// ---------------------------------------------------------------------------

/**
 * GET /api/tickets/:id/public-comments — List public comments
 */
communicationRouter.get(
  "/tickets/:id/public-comments",
  requireAuth,
  requirePasswordChanged,
  async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      // Requester must own the ticket; IT Staff & Admin can view
      if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      const comments = await prisma.publicComment.findMany({
        where: { ticketId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      });

      res.status(200).json(
        comments.map((c) => ({
          id: c.id,
          author: c.author,
          body: c.body,
          createdAt: c.createdAt.toISOString(),
        })),
      );
    } catch (err) {
      res.status(500).json({ error: "Unable to retrieve comments." });
    }
  },
);

/**
 * POST /api/tickets/:id/public-comments — Post public comment
 */
communicationRouter.post(
  "/tickets/:id/public-comments",
  requireAuth,
  requirePasswordChanged,
  async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      // Only Ticket Owner (Requester) or IT Staff can post. Admin has read-only access.
      if (req.user!.role === "REQUESTER") {
        if (ticket.requesterId !== req.user!.id) {
          res.status(403).json({ error: "Access denied" });
          return;
        }
      } else if (req.user!.role !== "IT_STAFF") {
        res.status(403).json({ error: "Access denied: Only ticket requester or IT Staff may post public comments" });
        return;
      }

      // Validate body
      const rawBody = req.body?.body;
      const trimmed = typeof rawBody === "string" ? rawBody.trim() : "";
      if (trimmed.length < 1 || trimmed.length > 2000) {
        res.status(400).json({
          error: "Validation failed",
          details: { body: "Comment body must be between 1 and 2,000 characters" },
        });
        return;
      }

      const comment = await prisma.publicComment.create({
        data: {
          ticketId,
          authorId: req.user!.id,
          body: trimmed,
        },
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      });

      res.status(201).json({
        id: comment.id,
        author: comment.author,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: "Unable to post comment." });
    }
  },
);

// ---------------------------------------------------------------------------
// Internal Notes Endpoints (api-spec §4.3, §4.4)
// ---------------------------------------------------------------------------

/**
 * GET /api/tickets/:id/internal-notes — List internal notes (IT Staff & Admin only)
 */
communicationRouter.get(
  "/tickets/:id/internal-notes",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      const notes = await prisma.internalNote.findMany({
        where: { ticketId },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      });

      res.status(200).json(
        notes.map((n) => ({
          id: n.id,
          author: n.author,
          body: n.body,
          createdAt: n.createdAt.toISOString(),
        })),
      );
    } catch (err) {
      res.status(500).json({ error: "Unable to retrieve internal notes." });
    }
  },
);

/**
 * POST /api/tickets/:id/internal-notes — Post internal note (IT Staff only)
 */
communicationRouter.post(
  "/tickets/:id/internal-notes",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF"),
  async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      // Validate body
      const rawBody = req.body?.body;
      const trimmed = typeof rawBody === "string" ? rawBody.trim() : "";
      if (trimmed.length < 1 || trimmed.length > 2000) {
        res.status(400).json({
          error: "Validation failed",
          details: { body: "Note body must be between 1 and 2,000 characters" },
        });
        return;
      }

      const note = await prisma.internalNote.create({
        data: {
          ticketId,
          authorId: req.user!.id,
          body: trimmed,
        },
        include: {
          author: { select: { id: true, name: true, role: true } },
        },
      });

      res.status(201).json({
        id: note.id,
        author: note.author,
        body: note.body,
        createdAt: note.createdAt.toISOString(),
      });
    } catch (err) {
      res.status(500).json({ error: "Unable to post internal note." });
    }
  },
);
