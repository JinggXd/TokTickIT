import express, { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requirePasswordChanged, requireRole } from "../middleware/sessionAuth.js";
import {
  ALL_STATUSES,
  TicketStatus,
  validateStatusTransition,
  shouldClearAppearsResolved,
} from "../utils/workflow.js";

export const staffRouter = express.Router();

const ALLOWED_QUERY_KEYS = new Set([
  "search",
  "categoryId",
  "requestedPriority",
  "itPriority",
  "status",
  "owner",
  "sortBy",
  "sortOrder",
  "page",
  "pageSize",
]);

const ALLOWED_SORT_BY = new Set([
  "itPriority",
  "createdAt",
  "updatedAt",
  "currentStatus",
  "ticketNo",
]);

const ALLOWED_PRIORITIES = new Set(["LOW", "MEDIUM", "HIGH"]);
const ALLOWED_PAGE_SIZES = new Set([10, 20, 50]);

function parseTicketId(param: string): number | null {
  if (!/^[1-9]\d*$/.test(param)) return null;
  return parseInt(param, 10);
}

function validateExpectedVersion(body: any): { isValid: boolean; expectedVersion?: number; error?: string } {
  if (body?.expectedVersion === undefined || !Number.isInteger(body.expectedVersion) || body.expectedVersion <= 0) {
    return {
      isValid: false,
      error: "expectedVersion must be a positive integer",
    };
  }
  return { isValid: true, expectedVersion: body.expectedVersion };
}

/**
 * GET /api/staff/tickets — IT Staff Queue (AC-23 to AC-27, api-spec §5.1)
 */
staffRouter.get(
  "/tickets",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const details: Record<string, string> = {};

      // Reject unknown query parameters
      for (const key of Object.keys(req.query)) {
        if (!ALLOWED_QUERY_KEYS.has(key)) {
          details[key] = "Invalid query parameter";
        }
      }

      const {
        search,
        categoryId,
        requestedPriority,
        itPriority,
        status,
        owner,
        sortBy = "updatedAt",
        sortOrder = "desc",
        page = "1",
        pageSize = "10",
      } = req.query as Record<string, string | undefined>;

      // Validate sortBy
      if (sortBy && !ALLOWED_SORT_BY.has(sortBy)) {
        details.sortBy = "Invalid query parameter";
      }

      // Validate sortOrder
      if (sortOrder && sortOrder !== "asc" && sortOrder !== "desc") {
        details.sortOrder = "Invalid query parameter";
      }

      // Validate page
      const pageNum = Number(page);
      if (!Number.isInteger(pageNum) || pageNum <= 0) {
        details.page = "Invalid query parameter";
      }

      // Validate pageSize
      const pageSizeNum = Number(pageSize);
      if (!Number.isInteger(pageSizeNum) || !ALLOWED_PAGE_SIZES.has(pageSizeNum)) {
        details.pageSize = "Invalid query parameter";
      }

      // Validate priorities
      if (requestedPriority && !ALLOWED_PRIORITIES.has(requestedPriority)) {
        details.requestedPriority = "Invalid query parameter";
      }
      if (itPriority && !ALLOWED_PRIORITIES.has(itPriority)) {
        details.itPriority = "Invalid query parameter";
      }

      // Validate status
      if (status && !ALL_STATUSES.includes(status as TicketStatus)) {
        details.status = "Invalid query parameter";
      }

      // Validate categoryId
      let catIdNum: number | undefined;
      if (categoryId !== undefined) {
        catIdNum = Number(categoryId);
        if (!Number.isInteger(catIdNum) || catIdNum <= 0) {
          details.categoryId = "Invalid query parameter";
        }
      }

      // Validate owner
      let targetOwnerId: number | null | undefined = undefined;
      if (owner !== undefined && owner !== "all") {
        if (owner === "me") {
          targetOwnerId = req.user!.id;
        } else if (owner === "unassigned") {
          targetOwnerId = null;
        } else {
          const ownerNum = Number(owner);
          if (Number.isInteger(ownerNum) && ownerNum > 0) {
            targetOwnerId = ownerNum;
          } else {
            details.owner = "Invalid query parameter";
          }
        }
      }

      if (Object.keys(details).length > 0) {
        res.status(400).json({
          error: "Validation failed",
          details,
        });
        return;
      }

      const prisma = getPrisma();

      // Build where clause
      const where: any = {};

      if (search && search.trim() !== "") {
        const term = search.trim();
        where.OR = [
          { ticketNo: { contains: term, mode: "insensitive" } },
          { summary: { contains: term, mode: "insensitive" } },
        ];
      }

      if (catIdNum !== undefined) {
        where.categoryId = catIdNum;
      }

      if (requestedPriority) {
        where.requestedPriority = requestedPriority;
      }

      if (itPriority) {
        where.itPriority = itPriority;
      }

      if (status) {
        where.currentStatus = status;
      }

      if (targetOwnerId !== undefined) {
        where.ticketOwnerId = targetOwnerId;
      }

      // Count queries
      const [unfilteredTotal, total] = await Promise.all([
        prisma.ticket.count(),
        prisma.ticket.count({ where }),
      ]);

      const totalPages = total === 0 ? 0 : Math.ceil(total / pageSizeNum);
      const skip = (pageNum - 1) * pageSizeNum;

      // Construct orderBy
      const primarySortField = (sortBy || "updatedAt") as string;
      const orderDir = (sortOrder || "desc") as "asc" | "desc";
      const orderBy: any[] = [{ [primarySortField]: orderDir }];
      if (primarySortField !== "id") {
        orderBy.push({ id: "desc" });
      }

      const tickets = await prisma.ticket.findMany({
        where,
        orderBy,
        skip,
        take: pageSizeNum,
        include: {
          requester: { select: { id: true, name: true, email: true, department: true } },
          category: { select: { id: true, name: true } },
          relatedSystem: { select: { id: true, name: true } },
          ticketOwner: { select: { id: true, name: true, role: true } },
        },
      });

      const formattedTickets = tickets.map((t) => ({
        id: t.id,
        ticketNo: t.ticketNo,
        summary: t.summary,
        requester: {
          id: t.requester.id,
          name: t.requester.name,
          email: t.requester.email,
        },
        category: {
          id: t.category.id,
          name: t.category.name,
        },
        relatedSystem: {
          id: t.relatedSystem.id,
          name: t.relatedSystem.name,
        },
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        ticketOwner: t.ticketOwner
          ? {
              id: t.ticketOwner.id,
              name: t.ticketOwner.name,
              role: t.ticketOwner.role,
            }
          : null,
        version: t.version,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));

      res.status(200).json({
        tickets: formattedTickets,
        unfilteredTotal,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total,
          totalPages,
        },
      });
    } catch (err) {
      res.status(500).json({ error: "Unable to retrieve staff tickets." });
    }
  },
);

/**
 * GET /api/staff/ticket-owners — Active Staff/Admin eligible ticket owners (api-spec §5.7)
 */
staffRouter.get(
  "/ticket-owners",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF"),
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const prisma = getPrisma();
      const owners = await prisma.user.findMany({
        where: {
          role: { in: ["IT_STAFF", "ADMINISTRATOR"] },
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          role: true,
        },
        orderBy: [{ name: "asc" }, { id: "asc" }],
      });

      res.status(200).json(owners);
    } catch (err) {
      res.status(500).json({ error: "Unable to retrieve ticket owners." });
    }
  },
);

/**
 * Helper to fetch detailed ticket representation
 */
export async function getDetailedTicket(ticketId: number) {
  const prisma = getPrisma();
  return prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      requester: { select: { id: true, name: true, email: true, department: true } },
      category: { select: { id: true, name: true } },
      relatedSystem: { select: { id: true, name: true } },
      ticketOwner: { select: { id: true, name: true, role: true } },
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          removedAt: true,
          removalReason: true,
          createdAt: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });
}

/**
 * GET /api/staff/tickets/:id — Staff Ticket Detail (api-spec §5.6)
 */
staffRouter.get(
  "/tickets/:id",
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
      const ticket = await getDetailedTicket(ticketId);
      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      res.status(200).json({
        id: ticket.id,
        ticketNo: ticket.ticketNo,
        summary: ticket.summary,
        description: ticket.description,
        requester: ticket.requester,
        category: ticket.category,
        relatedSystem: ticket.relatedSystem,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        currentStatus: ticket.currentStatus,
        ticketOwner: ticket.ticketOwner,
        version: ticket.version,
        appearsResolvedAt: ticket.appearsResolvedAt?.toISOString() ?? null,
        appearsResolvedById: ticket.appearsResolvedById,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        attachments: ticket.attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          removedAt: a.removedAt?.toISOString() ?? null,
          removalReason: a.removalReason,
          createdAt: a.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      res.status(500).json({ error: "Unable to retrieve ticket detail." });
    }
  },
);

/**
 * POST /api/staff/tickets/:id/claim — Claim unassigned ticket (api-spec §5.2)
 */
staffRouter.post(
  "/tickets/:id/claim",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF"),
  async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const versionVal = validateExpectedVersion(req.body);
    if (!versionVal.isValid) {
      res.status(400).json({
        error: "Validation failed",
        details: { expectedVersion: versionVal.error! },
      });
      return;
    }

    try {
      const prisma = getPrisma();
      const result = await prisma.$transaction(async (tx) => {
        // Lock claiming user row with FOR SHARE to coordinate with concurrent deactivation
        const users = await tx.$queryRaw<Array<{ id: number; isActive: boolean; role: string }>>`
          SELECT id, "isActive", role FROM "RequesterUser" WHERE id = ${req.user!.id} FOR SHARE
        `;
        const claimingUser = users[0];
        if (!claimingUser || !claimingUser.isActive || !["IT_STAFF", "ADMINISTRATOR"].includes(claimingUser.role)) {
          return { inactiveClaimer: true };
        }

        const ticket = await tx.ticket.findUnique({
          where: { id: ticketId },
          include: { ticketOwner: true },
        });

        if (!ticket) {
          return { notFound: true };
        }

        if (ticket.ticketOwnerId !== null) {
          return { alreadyAssigned: true, currentVersion: ticket.version };
        }

        if (ticket.version !== versionVal.expectedVersion) {
          return { conflict: true, currentVersion: ticket.version };
        }

        try {
          const updated = await tx.ticket.update({
            where: { id: ticketId, version: versionVal.expectedVersion },
            data: {
              ticketOwnerId: req.user!.id,
              version: ticket.version + 1,
            },
            include: {
              ticketOwner: { select: { id: true, name: true, role: true } },
            },
          });
          return { updated };
        } catch (updateErr: any) {
          if (updateErr?.code === "P2025") {
            const fresh = await tx.ticket.findUnique({ where: { id: ticketId } });
            return { conflict: true, currentVersion: fresh?.version ?? ticket.version + 1 };
          }
          throw updateErr;
        }
      });

      if ("inactiveClaimer" in result) {
        res.status(403).json({ error: "Authenticated user is no longer an active IT Staff or Administrator" });
        return;
      }

      if ("notFound" in result) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      if ("alreadyAssigned" in result) {
        res.status(409).json({
          error: "CONFLICT",
          message: "Ticket is already assigned to an owner.",
          currentVersion: result.currentVersion,
        });
        return;
      }

      if ("conflict" in result) {
        res.status(409).json({
          error: "CONFLICT",
          message: "The ticket was modified by another user. Please refresh and try again.",
          currentVersion: result.currentVersion,
        });
        return;
      }

      res.status(200).json({
        id: result.updated.id,
        ticketNo: result.updated.ticketNo,
        ticketOwner: result.updated.ticketOwner,
        version: result.updated.version,
      });
    } catch (err) {
      res.status(500).json({ error: "Unable to claim ticket." });
    }
  },
);

/**
 * PATCH /api/staff/tickets/:id/owner — Reassign ticket owner (api-spec §5.3)
 */
staffRouter.patch(
  "/tickets/:id/owner",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF"),
  async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const versionVal = validateExpectedVersion(req.body);
    if (!versionVal.isValid) {
      res.status(400).json({
        error: "Validation failed",
        details: { expectedVersion: versionVal.error! },
      });
      return;
    }

    const { ownerId } = req.body;
    if (!ownerId || !Number.isInteger(ownerId) || ownerId <= 0) {
      res.status(400).json({
        error: "Validation failed",
        details: { ownerId: "ownerId must be a positive integer" },
      });
      return;
    }

    try {
      const prisma = getPrisma();
      const result = await prisma.$transaction(async (tx) => {
        // Lock target owner row with FOR SHARE to coordinate with concurrent deactivation
        const users = await tx.$queryRaw<Array<{ id: number; isActive: boolean; role: string }>>`
          SELECT id, "isActive", role FROM "RequesterUser" WHERE id = ${ownerId} FOR SHARE
        `;
        const targetUser = users[0];

        if (!targetUser || !targetUser.isActive || !["IT_STAFF", "ADMINISTRATOR"].includes(targetUser.role)) {
          return { invalidOwner: true };
        }

        const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
        if (!ticket) {
          return { notFound: true };
        }

        if (ticket.version !== versionVal.expectedVersion) {
          return { conflict: true, currentVersion: ticket.version };
        }

        try {
          const updatedOwner = await tx.ticket.update({
            where: { id: ticketId, version: versionVal.expectedVersion },
            data: {
              ticketOwnerId: targetUser.id,
              version: ticket.version + 1,
            },
            include: {
              ticketOwner: { select: { id: true, name: true, role: true } },
            },
          });
          return { updatedOwner };
        } catch (updateErr: any) {
          if (updateErr?.code === "P2025") {
            const fresh = await tx.ticket.findUnique({ where: { id: ticketId } });
            return { conflict: true, currentVersion: fresh?.version ?? ticket.version + 1 };
          }
          throw updateErr;
        }
      });

      if ("invalidOwner" in result) {
        res.status(400).json({
          error: "Validation failed",
          details: { ownerId: "Owner must be an active IT Staff or Administrator" },
        });
        return;
      }

      if ("notFound" in result) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      if ("conflict" in result) {
        res.status(409).json({
          error: "CONFLICT",
          message: "The ticket was modified by another user. Please refresh and try again.",
          currentVersion: result.currentVersion,
        });
        return;
      }

      res.status(200).json({
        id: result.updatedOwner.id,
        ticketNo: result.updatedOwner.ticketNo,
        ticketOwner: result.updatedOwner.ticketOwner,
        version: result.updatedOwner.version,
      });
    } catch (err) {
      res.status(500).json({ error: "Unable to reassign ticket owner." });
    }
  },
);

/**
 * PATCH /api/staff/tickets/:id/it-priority — Update IT priority (api-spec §5.4)
 */
staffRouter.patch(
  "/tickets/:id/it-priority",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF"),
  async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const versionVal = validateExpectedVersion(req.body);
    if (!versionVal.isValid) {
      res.status(400).json({
        error: "Validation failed",
        details: { expectedVersion: versionVal.error! },
      });
      return;
    }

    const { itPriority } = req.body;
    if (!itPriority || !ALLOWED_PRIORITIES.has(itPriority)) {
      res.status(400).json({
        error: "Validation failed",
        details: { itPriority: "itPriority must be LOW, MEDIUM, or HIGH" },
      });
      return;
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      if (ticket.version !== versionVal.expectedVersion) {
        res.status(409).json({
          error: "CONFLICT",
          message: "The ticket was modified by another user. Please refresh and try again.",
          currentVersion: ticket.version,
        });
        return;
      }

      let updatedPriority;
      try {
        updatedPriority = await prisma.ticket.update({
          where: { id: ticketId, version: versionVal.expectedVersion },
          data: {
            itPriority,
            version: ticket.version + 1,
          },
        });
      } catch (updateErr: any) {
        if (updateErr?.code === "P2025") {
          const fresh = await prisma.ticket.findUnique({ where: { id: ticketId } });
          res.status(409).json({
            error: "CONFLICT",
            message: "The ticket was modified by another user. Please refresh and try again.",
            currentVersion: fresh?.version ?? ticket.version + 1,
          });
          return;
        }
        throw updateErr;
      }

      res.status(200).json({
        id: updatedPriority.id,
        ticketNo: updatedPriority.ticketNo,
        itPriority: updatedPriority.itPriority,
        requestedPriority: updatedPriority.requestedPriority,
        version: updatedPriority.version,
      });
    } catch (err) {
      res.status(500).json({ error: "Unable to update IT priority." });
    }
  },
);

/**
 * PATCH /api/staff/tickets/:id/status — Transition ticket status (api-spec §5.5)
 */
staffRouter.patch(
  "/tickets/:id/status",
  requireAuth,
  requirePasswordChanged,
  requireRole("IT_STAFF"),
  async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseTicketId(req.params.id);
    if (ticketId === null) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }

    const versionVal = validateExpectedVersion(req.body);
    if (!versionVal.isValid) {
      res.status(400).json({
        error: "Validation failed",
        details: { expectedVersion: versionVal.error! },
      });
      return;
    }

    const { status } = req.body;
    if (!status || !ALL_STATUSES.includes(status as TicketStatus)) {
      res.status(400).json({
        error: "Validation failed",
        details: { status: "Invalid ticket status" },
      });
      return;
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      if (ticket.version !== versionVal.expectedVersion) {
        res.status(409).json({
          error: "CONFLICT",
          message: "The ticket was modified by another user. Please refresh and try again.",
          currentVersion: ticket.version,
        });
        return;
      }

      const validation = validateStatusTransition(
        ticket.currentStatus as TicketStatus,
        status as TicketStatus,
        { hasEligibleOwner: ticket.ticketOwnerId !== null },
      );

      if (!validation.isValid) {
        if (validation.error === "ELIGIBLE_OWNER_REQUIRED") {
          res.status(400).json({
            error: "ELIGIBLE_OWNER_REQUIRED",
            message: validation.message,
          });
          return;
        }
        res.status(400).json({
          error: "ILLEGAL_STATUS_TRANSITION",
          message: validation.message,
        });
        return;
      }

      const updateData: Record<string, any> = {
        currentStatus: status,
        version: ticket.version + 1,
      };

      if (shouldClearAppearsResolved(status as TicketStatus)) {
        updateData.appearsResolvedAt = null;
        updateData.appearsResolvedById = null;
      }

      // P2: Re-verify owner eligibility at write time (not just at read time)
      // to prevent stale-role or deactivated-owner bypasses for owner-required transitions.
      if (validation.ownerRequired && ticket.ticketOwnerId !== null) {
        const currentOwner = await prisma.user.findUnique({ where: { id: ticket.ticketOwnerId } });
        if (!currentOwner || !currentOwner.isActive || !["IT_STAFF", "ADMINISTRATOR"].includes(currentOwner.role)) {
          res.status(400).json({
            error: "ELIGIBLE_OWNER_REQUIRED",
            message: "Ticket owner is no longer eligible (inactive or role changed). Reassign before progressing status.",
          });
          return;
        }
      }

      let updatedStatus;
      try {
        updatedStatus = await prisma.ticket.update({
          where: { id: ticketId, version: versionVal.expectedVersion },
          data: updateData,
        });
      } catch (updateErr: any) {
        if (updateErr?.code === "P2025") {
          const fresh = await prisma.ticket.findUnique({ where: { id: ticketId } });
          res.status(409).json({
            error: "CONFLICT",
            message: "The ticket was modified by another user. Please refresh and try again.",
            currentVersion: fresh?.version ?? ticket.version + 1,
          });
          return;
        }
        throw updateErr;
      }

      res.status(200).json({
        id: updatedStatus.id,
        ticketNo: updatedStatus.ticketNo,
        currentStatus: updatedStatus.currentStatus,
        version: updatedStatus.version,
      });
    } catch (err) {
      res.status(500).json({ error: "Unable to transition ticket status." });
    }
  },
);
