import express, { Request, Response } from "express";
import { TicketStatus } from "@prisma/client";
import { getPrisma } from "../prisma.js";
import {
  requireAuth,
  requirePasswordChanged,
  requireRole,
} from "../middleware/sessionAuth.js";
import {
  validateActionDateTime,
  isValidUUIDv4,
  computeRequestPayloadHash,
} from "../utils/actionValidation.js";

export const actionsRouter = express.Router();

function formatActionResponse(action: any) {
  return {
    id: action.id,
    ticketId: action.ticketId,
    actionDateTime:
      action.actionDateTime instanceof Date
        ? action.actionDateTime.toISOString()
        : action.actionDateTime,
    actionDescription: action.actionDescription,
    result: action.result ?? null,
    status: action.status,
    version: action.version,
    createdById: action.createdById,
    performedBy: action.performedBy
      ? { id: action.performedBy.id, name: action.performedBy.name }
      : null,
    assignee: action.assignee
      ? { id: action.assignee.id, name: action.assignee.name }
      : null,
    followUpRequired: action.followUpRequired,
    followUpNote: action.followUpNote ?? null,
    attachmentNotes: action.attachmentNotes ?? null,
    createdAt:
      action.createdAt instanceof Date
        ? action.createdAt.toISOString()
        : action.createdAt,
    updatedAt:
      action.updatedAt instanceof Date
        ? action.updatedAt.toISOString()
        : action.updatedAt,
  };
}

function parseExpectedVersion(
  body: any,
  ifMatchHeader?: string
): { valid: boolean; version?: number; error?: string } {
  const raw =
    body?.expectedVersion !== undefined ? body.expectedVersion : ifMatchHeader;
  if (raw === undefined || raw === null || raw === "") {
    return {
      valid: false,
      error: "expectedVersion is required (must be a positive integer).",
    };
  }
  const num = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isInteger(num) || num <= 0) {
    return {
      valid: false,
      error: "expectedVersion must be a positive integer.",
    };
  }
  return { valid: true, version: num };
}

// ---------------------------------------------------------------------------
// 2.1 List Actions Taken for Ticket
// GET /api/tickets/:id/actions
// ---------------------------------------------------------------------------
actionsRouter.get(
  "/tickets/:id/actions",
  requireAuth,
  requirePasswordChanged,
  async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    if (!/^[1-9]\d*$/.test(rawId)) {
      res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found." });
      return;
    }
    const ticketId = parseInt(rawId, 10);
    const prisma = getPrisma();

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        select: { id: true, requesterId: true },
      });

      if (!ticket) {
        res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found." });
        return;
      }

      // Requester authorization check
      if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
        res.status(403).json({ error: "Access denied: You do not own this ticket" });
        return;
      }

      const actions = await (prisma as any).actionTaken.findMany({
        where: { ticketId },
        orderBy: [{ actionDateTime: "asc" }, { id: "asc" }],
        include: {
          performedBy: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
      });

      res.status(200).json({
        ticketId,
        actions: actions.map(formatActionResponse),
      });
    } catch (err: any) {
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// 2.2 Create Action Taken & Idempotent Retry Protocol
// POST /api/tickets/:id/actions
// ---------------------------------------------------------------------------
actionsRouter.post(
  "/tickets/:id/actions",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    if (!/^[1-9]\d*$/.test(rawId)) {
      res.status(404).json({ error: "NOT_FOUND", message: "Ticket not found." });
      return;
    }
    const ticketId = parseInt(rawId, 10);
    const prisma = getPrisma();

    // Idempotency key extraction & validation
    const headerKey = req.header("x-client-request-id")?.trim();
    const bodyKey =
      typeof req.body.clientRequestId === "string"
        ? req.body.clientRequestId.trim()
        : undefined;

    // 1. Parameter & Input Validation
    if (headerKey && bodyKey && headerKey !== bodyKey) {
      res.status(400).json({
        error: "VALIDATION_FAILED",
        message: "Header and body clientRequestId must match.",
      });
      return;
    }

    const clientRequestId = headerKey || bodyKey;
    if (clientRequestId && !isValidUUIDv4(clientRequestId)) {
      res.status(400).json({
        error: "VALIDATION_FAILED",
        message: "Invalid clientRequestId format; must be UUIDv4.",
      });
      return;
    }

    const dateRes = validateActionDateTime(req.body.actionDateTime);
    if (!dateRes.valid) {
      res.status(400).json({
        error: "VALIDATION_FAILED",
        message: dateRes.error,
      });
      return;
    }
    const actionDateTime = dateRes.date!;

    if (
      req.body.actionDescription === undefined ||
      typeof req.body.actionDescription !== "string"
    ) {
      res.status(400).json({
        error: "VALIDATION_FAILED",
        message: "actionDescription must be a string between 1 and 1000 characters.",
      });
      return;
    }
    const actionDesc = req.body.actionDescription.trim();
    if (!actionDesc || actionDesc.length < 1 || actionDesc.length > 1000) {
      res.status(400).json({
        error: "VALIDATION_FAILED",
        message: "actionDescription must be between 1 and 1000 characters.",
      });
      return;
    }

    if (
      req.body.status !== undefined &&
      req.body.status !== "PENDING" &&
      req.body.status !== "COMPLETED"
    ) {
      res.status(400).json({
        error: "VALIDATION_FAILED",
        message: "status must be PENDING or COMPLETED.",
      });
      return;
    }
    const status = req.body.status === "PENDING" ? "PENDING" : "COMPLETED";

    let resText: string | null = null;
    if (status === "COMPLETED") {
      if (
        req.body.result === undefined ||
        typeof req.body.result !== "string" ||
        !req.body.result.trim() ||
        req.body.result.trim().length > 1000
      ) {
        res.status(400).json({
          error: "VALIDATION_FAILED",
          message: "result is mandatory for completed actions (1-1000 characters).",
        });
        return;
      }
      resText = req.body.result.trim();
    } else {
      if (req.body.result !== undefined && req.body.result !== null) {
        if (
          typeof req.body.result !== "string" ||
          req.body.result.trim().length > 1000
        ) {
          res.status(400).json({
            error: "VALIDATION_FAILED",
            message: "result cannot exceed 1000 characters.",
          });
          return;
        }
        resText = req.body.result.trim();
      }
    }

    const followUpRequired = Boolean(req.body.followUpRequired);
    let followUpNote: string | null = null;
    if (followUpRequired) {
      if (
        req.body.followUpNote === undefined ||
        typeof req.body.followUpNote !== "string" ||
        !req.body.followUpNote.trim() ||
        req.body.followUpNote.trim().length > 1000
      ) {
        res.status(400).json({
          error: "VALIDATION_FAILED",
          message: "followUpNote is mandatory when followUpRequired is true.",
        });
        return;
      }
      followUpNote = req.body.followUpNote.trim();
    }

    let attachmentNotes: string | null = null;
    if (req.body.attachmentNotes !== undefined && req.body.attachmentNotes !== null) {
      if (
        typeof req.body.attachmentNotes !== "string" ||
        req.body.attachmentNotes.trim().length > 500
      ) {
        res.status(400).json({
          error: "VALIDATION_FAILED",
          message: "attachmentNotes cannot exceed 500 characters.",
        });
        return;
      }
      attachmentNotes = req.body.attachmentNotes.trim();
    }

    let assigneeId: number | null = null;
    if (req.body.assigneeId !== undefined && req.body.assigneeId !== null) {
      if (
        typeof req.body.assigneeId !== "number" ||
        !Number.isInteger(req.body.assigneeId) ||
        req.body.assigneeId <= 0
      ) {
        res.status(422).json({
          error: "INVALID_ASSIGNEE",
          message: "Assignee must be an active IT Staff or Administrator.",
        });
        return;
      }
      assigneeId = req.body.assigneeId;
    }

    const requestPayloadHash = computeRequestPayloadHash(req.body);

    try {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Lock parent Ticket row FOR UPDATE
        const ticketRows = await tx.$queryRaw<
          Array<{ id: number; version: number; currentStatus: TicketStatus }>
        >`SELECT id, version, "currentStatus" FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;

        if (ticketRows.length === 0) {
          throw { status: 404, error: "NOT_FOUND", message: "Ticket not found." };
        }
        const parentTicket = ticketRows[0];

        // 2. Idempotency Check (Executed BEFORE Ticket Status Check)
        if (clientRequestId) {
          const existingAction = await (tx as any).actionTaken.findUnique({
            where: {
              createdById_ticketId_clientRequestId: {
                createdById: req.user!.id,
                ticketId,
                clientRequestId,
              },
            },
            include: {
              performedBy: { select: { id: true, name: true } },
              assignee: { select: { id: true, name: true } },
            },
          });

          if (existingAction) {
            if (existingAction.requestPayloadHash === requestPayloadHash) {
              return { isReplay: true, action: existingAction };
            } else {
              throw {
                status: 409,
                error: "CONFLICT",
                message: "Idempotency key reused with mismatched request payload.",
              };
            }
          }
        }

        // 3. Parent Ticket Status Check (Executed ONLY for New Creations)
        if (["RESOLVED", "CLOSED", "CANCELLED"].includes(parentTicket.currentStatus)) {
          throw {
            status: 400,
            error: "BAD_REQUEST",
            message: "Cannot modify actions on a resolved, closed, or cancelled ticket.",
          };
        }

        let assigneeId: number | null = null;
        if (req.body.assigneeId !== undefined && req.body.assigneeId !== null) {
          if (typeof req.body.assigneeId !== "number" || !Number.isInteger(req.body.assigneeId)) {
            throw {
              status: 422,
              error: "INVALID_ASSIGNEE",
              message: "Assignee must be an active IT Staff or Administrator.",
            };
          }
          const assignee = await tx.user.findUnique({
            where: { id: req.body.assigneeId },
          });
          if (
            !assignee ||
            !assignee.isActive ||
            !["IT_STAFF", "ADMINISTRATOR"].includes(assignee.role)
          ) {
            throw {
              status: 422,
              error: "INVALID_ASSIGNEE",
              message: "Assignee must be an active IT Staff or Administrator.",
            };
          }
          assigneeId = assignee.id;
        }

        const performedById = status === "COMPLETED" ? req.user!.id : null;

        // 5. Insert ActionTaken row
        const newAction = await (tx as any).actionTaken.create({
          data: {
            ticketId,
            actionDateTime,
            createdById: req.user!.id,
            performedById,
            actionDescription: actionDesc,
            status,
            result: resText,
            assigneeId,
            followUpRequired,
            followUpNote: followUpRequired ? followUpNote : null,
            attachmentNotes,
            version: 1,
            clientRequestId: clientRequestId ?? null,
            requestPayloadHash,
          },
          include: {
            performedBy: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
          },
        });

        // 6. Increment parent Ticket version
        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        return { isReplay: false, action: newAction };
      });

      if (result.isReplay) {
        res.setHeader("X-Idempotent-Replay", "true");
        res.status(200).json({
          ticketId,
          action: formatActionResponse(result.action),
        });
      } else {
        res.status(201).json({
          ticketId,
          action: formatActionResponse(result.action),
        });
      }
    } catch (err: any) {
      if (err.status) {
        res.status(err.status).json({
          error: err.error,
          message: err.message,
        });
        return;
      }
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// 2.3 Update Action Taken / Assignment
// PATCH /api/tickets/:id/actions/:actionId
// ---------------------------------------------------------------------------
actionsRouter.patch(
  "/tickets/:id/actions/:actionId",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response): Promise<void> => {
    const rawTicketId = req.params.id;
    const rawActionId = req.params.actionId;
    if (!/^[1-9]\d*$/.test(rawTicketId) || !/^[1-9]\d*$/.test(rawActionId)) {
      res.status(404).json({ error: "NOT_FOUND", message: "Resource not found." });
      return;
    }
    const ticketId = parseInt(rawTicketId, 10);
    const actionId = parseInt(rawActionId, 10);
    const prisma = getPrisma();

    try {
      const updatedAction = await prisma.$transaction(async (tx) => {
        // 1. Lock parent Ticket row FOR UPDATE
        const ticketRows = await tx.$queryRaw<
          Array<{ id: number; version: number; currentStatus: TicketStatus }>
        >`SELECT id, version, "currentStatus" FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;

        if (ticketRows.length === 0) {
          throw { status: 404, error: "NOT_FOUND", message: "Ticket not found." };
        }
        const parentTicket = ticketRows[0];

        // 2. Verify nested resource (404 takes precedence over terminal status 400)
        const action = await (tx as any).actionTaken.findUnique({
          where: { id: actionId },
          include: {
            performedBy: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
          },
        });

        if (!action || action.ticketId !== ticketId) {
          throw {
            status: 404,
            error: "NOT_FOUND",
            message: "Action Taken not found under this ticket.",
          };
        }

        // 3. Validate parent status
        if (["RESOLVED", "CLOSED", "CANCELLED"].includes(parentTicket.currentStatus)) {
          throw {
            status: 400,
            error: "BAD_REQUEST",
            message: "Cannot modify actions on a resolved, closed, or cancelled ticket.",
          };
        }

        // 4. State & Permission validation
        if (action.status === "CANCELLED") {
          throw {
            status: 400,
            error: "BAD_REQUEST",
            message: "Cannot modify a cancelled action.",
          };
        }

        if (action.status === "COMPLETED") {
          const isPerformer = action.performedById === req.user!.id;
          const isAdmin = req.user!.role === "ADMINISTRATOR";
          if (!isPerformer && !isAdmin) {
            throw {
              status: 403,
              error: "FORBIDDEN",
              message: "Only the performer or an administrator can edit a completed action.",
            };
          }

          if (
            req.body.assigneeId !== undefined ||
            req.body.result !== undefined ||
            (req.body.status && req.body.status !== "COMPLETED")
          ) {
            throw {
              status: 400,
              error: "BAD_REQUEST",
              message: "Cannot change assignee, result, or revert status of a completed action.",
            };
          }
        }

        // 5. Optimistic concurrency version validation (400 if missing or invalid)
        const versionRes = parseExpectedVersion(req.body, req.header("if-match"));
        if (!versionRes.valid) {
          throw {
            status: 400,
            error: "VALIDATION_FAILED",
            message: versionRes.error,
          };
        }
        const expectedVersion = versionRes.version!;

        // Validate edits
        const dataToUpdate: any = {
          version: { increment: 1 },
        };

        if (req.body.status && req.body.status === "PENDING" && action.status !== "PENDING") {
          throw {
            status: 400,
            error: "BAD_REQUEST",
            message: "Cannot revert status to pending.",
          };
        }

        if (req.body.actionDescription !== undefined) {
          if (
            typeof req.body.actionDescription !== "string" ||
            !req.body.actionDescription.trim() ||
            req.body.actionDescription.trim().length > 1000
          ) {
            throw {
              status: 400,
              error: "VALIDATION_FAILED",
              message: "actionDescription must be between 1 and 1000 characters.",
            };
          }
          dataToUpdate.actionDescription = req.body.actionDescription.trim();
        }

        if (action.status === "PENDING" && req.body.assigneeId !== undefined) {
          if (req.body.assigneeId === null) {
            dataToUpdate.assigneeId = null;
          } else {
            if (typeof req.body.assigneeId !== "number" || !Number.isInteger(req.body.assigneeId)) {
              throw {
                status: 422,
                error: "INVALID_ASSIGNEE",
                message: "Assignee must be an active IT Staff or Administrator.",
              };
            }
            const assignee = await tx.user.findUnique({
              where: { id: req.body.assigneeId },
            });
            if (
              !assignee ||
              !assignee.isActive ||
              !["IT_STAFF", "ADMINISTRATOR"].includes(assignee.role)
            ) {
              throw {
                status: 422,
                error: "INVALID_ASSIGNEE",
                message: "Assignee must be an active IT Staff or Administrator.",
              };
            }
            dataToUpdate.assigneeId = assignee.id;
          }
        }

        if (req.body.followUpRequired !== undefined) {
          const followUpRequired = Boolean(req.body.followUpRequired);
          dataToUpdate.followUpRequired = followUpRequired;
          if (followUpRequired) {
            if (req.body.followUpNote !== undefined) {
              if (
                typeof req.body.followUpNote !== "string" ||
                !req.body.followUpNote.trim() ||
                req.body.followUpNote.trim().length > 1000
              ) {
                throw {
                  status: 400,
                  error: "VALIDATION_FAILED",
                  message: "followUpNote is mandatory when followUpRequired is true.",
                };
              }
              dataToUpdate.followUpNote = req.body.followUpNote.trim();
            } else {
              if (!action.followUpNote || !action.followUpNote.trim()) {
                throw {
                  status: 400,
                  error: "VALIDATION_FAILED",
                  message: "followUpNote is mandatory when followUpRequired is true.",
                };
              }
              dataToUpdate.followUpNote = action.followUpNote;
            }
          } else {
            dataToUpdate.followUpNote = null;
          }
        } else if (req.body.followUpNote !== undefined) {
          if (action.followUpRequired) {
            if (
              typeof req.body.followUpNote !== "string" ||
              !req.body.followUpNote.trim() ||
              req.body.followUpNote.trim().length > 1000
            ) {
              throw {
                status: 400,
                error: "VALIDATION_FAILED",
                message: "followUpNote cannot be empty when followUpRequired is true.",
              };
            }
            dataToUpdate.followUpNote = req.body.followUpNote.trim();
          } else {
            dataToUpdate.followUpNote = null;
          }
        }

        if (req.body.attachmentNotes !== undefined) {
          if (req.body.attachmentNotes === null || req.body.attachmentNotes === "") {
            dataToUpdate.attachmentNotes = null;
          } else if (
            typeof req.body.attachmentNotes !== "string" ||
            req.body.attachmentNotes.trim().length > 500
          ) {
            throw {
              status: 400,
              error: "VALIDATION_FAILED",
              message: "attachmentNotes cannot exceed 500 characters.",
            };
          } else {
            dataToUpdate.attachmentNotes = req.body.attachmentNotes.trim();
          }
        }

        if (expectedVersion !== action.version) {
          throw {
            status: 409,
            error: "CONFLICT",
            message: "Action Taken was modified by another user. Please refresh and try again.",
            currentVersion: action.version,
          };
        }

        const savedAction = await (tx as any).actionTaken.update({
          where: { id: actionId },
          data: dataToUpdate,
          include: {
            performedBy: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
          },
        });

        // Increment parent Ticket version
        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        return savedAction;
      });

      res.status(200).json({
        ticketId,
        action: formatActionResponse(updatedAction),
      });
    } catch (err: any) {
      if (err.status) {
        const body: any = { error: err.error, message: err.message };
        if (err.currentVersion !== undefined) body.currentVersion = err.currentVersion;
        res.status(err.status).json(body);
        return;
      }
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// 2.4 Complete Action Taken
// POST /api/tickets/:id/actions/:actionId/complete
// ---------------------------------------------------------------------------
actionsRouter.post(
  "/tickets/:id/actions/:actionId/complete",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response): Promise<void> => {
    const rawTicketId = req.params.id;
    const rawActionId = req.params.actionId;
    if (!/^[1-9]\d*$/.test(rawTicketId) || !/^[1-9]\d*$/.test(rawActionId)) {
      res.status(404).json({ error: "NOT_FOUND", message: "Resource not found." });
      return;
    }
    const ticketId = parseInt(rawTicketId, 10);
    const actionId = parseInt(rawActionId, 10);
    const prisma = getPrisma();

    try {
      const completedAction = await prisma.$transaction(async (tx) => {
        // 1. Lock parent Ticket row FOR UPDATE
        const ticketRows = await tx.$queryRaw<
          Array<{ id: number; version: number; currentStatus: TicketStatus }>
        >`SELECT id, version, "currentStatus" FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;

        if (ticketRows.length === 0) {
          throw { status: 404, error: "NOT_FOUND", message: "Ticket not found." };
        }
        const parentTicket = ticketRows[0];

        const action = await (tx as any).actionTaken.findUnique({
          where: { id: actionId },
          include: {
            performedBy: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
          },
        });

        if (!action || action.ticketId !== ticketId) {
          throw {
            status: 404,
            error: "NOT_FOUND",
            message: "Action Taken not found under this ticket.",
          };
        }

        if (["RESOLVED", "CLOSED", "CANCELLED"].includes(parentTicket.currentStatus)) {
          throw {
            status: 400,
            error: "BAD_REQUEST",
            message: "Cannot modify actions on a resolved, closed, or cancelled ticket.",
          };
        }

        if (action.status !== "PENDING") {
          throw {
            status: 400,
            error: "BAD_REQUEST",
            message: "Only pending actions can be completed.",
          };
        }

        const versionRes = parseExpectedVersion(req.body, req.header("if-match"));
        if (!versionRes.valid) {
          throw {
            status: 400,
            error: "VALIDATION_FAILED",
            message: versionRes.error,
          };
        }
        const expectedVersion = versionRes.version!;

        if (
          req.body.result === undefined ||
          typeof req.body.result !== "string" ||
          !req.body.result.trim() ||
          req.body.result.trim().length > 1000
        ) {
          throw {
            status: 400,
            error: "VALIDATION_FAILED",
            message: "result is mandatory when completing an action (1-1000 characters).",
          };
        }
        const resultText = req.body.result.trim();

        if (req.body.attachmentNotes !== undefined && req.body.attachmentNotes !== null) {
          if (
            typeof req.body.attachmentNotes !== "string" ||
            req.body.attachmentNotes.trim().length > 500
          ) {
            throw {
              status: 400,
              error: "VALIDATION_FAILED",
              message: "attachmentNotes cannot exceed 500 characters.",
            };
          }
        }

        if (expectedVersion !== action.version) {
          throw {
            status: 409,
            error: "CONFLICT",
            message: "Action Taken was modified by another user. Please refresh and try again.",
            currentVersion: action.version,
          };
        }

        const dataToUpdate: any = {
          status: "COMPLETED",
          performedById: req.user!.id,
          result: resultText,
          version: { increment: 1 },
        };

        if (req.body.attachmentNotes !== undefined) {
          const notes = req.body.attachmentNotes ? String(req.body.attachmentNotes).trim() : null;
          dataToUpdate.attachmentNotes = notes;
        }

        const savedAction = await (tx as any).actionTaken.update({
          where: { id: actionId },
          data: dataToUpdate,
          include: {
            performedBy: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
          },
        });

        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        return savedAction;
      });

      res.status(200).json({
        ticketId,
        action: formatActionResponse(completedAction),
      });
    } catch (err: any) {
      if (err.status) {
        const body: any = { error: err.error, message: err.message };
        if (err.currentVersion !== undefined) body.currentVersion = err.currentVersion;
        res.status(err.status).json(body);
        return;
      }
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);

// ---------------------------------------------------------------------------
// 2.5 Cancel Action Taken
// POST /api/tickets/:id/actions/:actionId/cancel
// ---------------------------------------------------------------------------
actionsRouter.post(
  "/tickets/:id/actions/:actionId/cancel",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: Request, res: Response): Promise<void> => {
    const rawTicketId = req.params.id;
    const rawActionId = req.params.actionId;
    if (!/^[1-9]\d*$/.test(rawTicketId) || !/^[1-9]\d*$/.test(rawActionId)) {
      res.status(404).json({ error: "NOT_FOUND", message: "Resource not found." });
      return;
    }
    const ticketId = parseInt(rawTicketId, 10);
    const actionId = parseInt(rawActionId, 10);
    const prisma = getPrisma();

    try {
      const cancelledAction = await prisma.$transaction(async (tx) => {
        // 1. Lock parent Ticket row FOR UPDATE
        const ticketRows = await tx.$queryRaw<
          Array<{ id: number; version: number; currentStatus: TicketStatus }>
        >`SELECT id, version, "currentStatus" FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;

        if (ticketRows.length === 0) {
          throw { status: 404, error: "NOT_FOUND", message: "Ticket not found." };
        }
        const parentTicket = ticketRows[0];

        const action = await (tx as any).actionTaken.findUnique({
          where: { id: actionId },
          include: {
            performedBy: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
          },
        });

        if (!action || action.ticketId !== ticketId) {
          throw {
            status: 404,
            error: "NOT_FOUND",
            message: "Action Taken not found under this ticket.",
          };
        }

        if (["RESOLVED", "CLOSED", "CANCELLED"].includes(parentTicket.currentStatus)) {
          throw {
            status: 400,
            error: "BAD_REQUEST",
            message: "Cannot modify actions on a resolved, closed, or cancelled ticket.",
          };
        }

        if (action.status !== "PENDING") {
          throw {
            status: 400,
            error: "BAD_REQUEST",
            message: "Only pending actions can be cancelled.",
          };
        }

        const versionRes = parseExpectedVersion(req.body, req.header("if-match"));
        if (!versionRes.valid) {
          throw {
            status: 400,
            error: "VALIDATION_FAILED",
            message: versionRes.error,
          };
        }
        const expectedVersion = versionRes.version!;

        let cancelReason: string | null = null;
        if (req.body.reason !== undefined && req.body.reason !== null) {
          if (
            typeof req.body.reason !== "string" ||
            req.body.reason.trim().length > 500
          ) {
            throw {
              status: 400,
              error: "VALIDATION_FAILED",
              message: "reason cannot exceed 500 characters.",
            };
          }
          cancelReason = req.body.reason.trim();
        }

        if (expectedVersion !== action.version) {
          throw {
            status: 409,
            error: "CONFLICT",
            message: "Action Taken was modified by another user. Please refresh and try again.",
            currentVersion: action.version,
          };
        }

        const dataToUpdate: any = {
          status: "CANCELLED",
          version: { increment: 1 },
        };

        if (cancelReason) {
          dataToUpdate.result = cancelReason;
        }

        const savedAction = await (tx as any).actionTaken.update({
          where: { id: actionId },
          data: dataToUpdate,
          include: {
            performedBy: { select: { id: true, name: true } },
            assignee: { select: { id: true, name: true } },
          },
        });

        await tx.ticket.update({
          where: { id: ticketId },
          data: {
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });

        return savedAction;
      });

      res.status(200).json({
        ticketId,
        action: formatActionResponse(cancelledAction),
      });
    } catch (err: any) {
      if (err.status) {
        const body: any = { error: err.error, message: err.message };
        if (err.currentVersion !== undefined) body.currentVersion = err.currentVersion;
        res.status(err.status).json(body);
        return;
      }
      res.status(500).json({ error: "INTERNAL_ERROR", message: err.message });
    }
  }
);
