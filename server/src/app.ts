import express, { Request, Response } from "express";
import cors from "cors";
import { TicketStatus } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import {
  sessionMiddleware,
  requireAuth,
  requirePasswordChanged,
  requireRole,
  csrfProtection,
} from "./middleware/sessionAuth.js";
import { authRouter } from "./routes/auth.js";
import { staffRouter, getDetailedTicket } from "./routes/staff.js";
import { communicationRouter } from "./routes/communication.js";
import { adminUsersRouter } from "./routes/adminUsers.js";
import { actionsRouter } from "./routes/actions.js";
import { validateTicketInput } from "./utils/validation.js";
import { generateTicketNumber, TicketNumberGenerationError } from "./utils/ticketNumber.js";
import fs from "fs";
import path from "path";
import multer from "multer";
import { clampPagination, ALLOWED_PAGE_SIZES } from "./utils/pagination.js";
import { sanitizeFileName, validateAttachmentType } from "./utils/safeFilename.js";
import { getUploadDirectory } from "./config/testEnvironment.js";

export const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  }),
);

// 16 KiB limit on JSON body (api-spec.md Section 2.6)
app.use(express.json({ limit: "16kb", strict: false }));

// JSON error handling: 413 for oversized body, 400 for malformed JSON
app.use((err: any, _req: Request, res: Response, next: express.NextFunction) => {
  if (err && (err.type === "entity.too.large" || err.status === 413)) {
    res.status(413).json({ error: "Request body too large" });
    return;
  }
  if (err instanceof SyntaxError && "status" in err && err.status === 400) {
    res.status(400).json({
      error: "Validation failed",
      details: { body: "Invalid JSON payload" },
    });
    return;
  }
  next(err);
});

// Session hydration and CSRF protection
app.use(sessionMiddleware);
app.use(csrfProtection);

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Authentication routes
// ---------------------------------------------------------------------------
app.use("/api/auth", authRouter);
app.use("/api/staff", staffRouter);
app.use("/api", communicationRouter);
app.use("/api", actionsRouter);
app.use("/api/admin/users", adminUsersRouter);

// Administrator read-only ticket detail (api-spec §5.6)
app.get(
  "/api/admin/tickets/:id",
  requireAuth,
  requirePasswordChanged,
  requireRole("ADMINISTRATOR"),
  async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    if (!/^[1-9]\d*$/.test(rawId)) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    const ticketId = parseInt(rawId, 10);
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

// ---------------------------------------------------------------------------
// Categories list — requires completed-password active session
// ---------------------------------------------------------------------------
app.get(
  "/api/categories",
  requireAuth,
  requirePasswordChanged,
  async (_req: Request, res: Response) => {
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
  },
);

// ---------------------------------------------------------------------------
// Related Systems list — requires completed-password active session
// ---------------------------------------------------------------------------
app.get(
  "/api/related-systems",
  requireAuth,
  requirePasswordChanged,
  async (_req: Request, res: Response) => {
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
  },
);

// ---------------------------------------------------------------------------
// Active Development Requesters — RETIRED in Lab 3 (api-spec.md §3)
// ---------------------------------------------------------------------------
app.get("/api/requesters/active", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Endpoint retired" });
});

// ---------------------------------------------------------------------------
// Create Ticket — requires REQUESTER role with completed password change
// Scoped to authenticated session (X-Requester-Id is strictly ignored)
// ---------------------------------------------------------------------------
app.post(
  "/api/tickets",
  requireAuth,
  requirePasswordChanged,
  requireRole("REQUESTER"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const validation = validateTicketInput(req.body);
      const errors: Record<string, string> = { ...validation.errors };
      const prisma = getPrisma();

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

      const requesterId = req.user!.id;
      const { summary, description, categoryId, relatedSystemId, requestedPriority } = validation.data!;

      let createdTicket: {
        id: number;
        ticketNo: string;
        summary: string;
        description: string;
        requestedPriority: "LOW" | "MEDIUM" | "HIGH";
        itPriority: "LOW" | "MEDIUM" | "HIGH";
        currentStatus: TicketStatus;
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
              itPriority: requestedPriority,
              currentStatus: "NEW",
              requesterId,
              categoryId,
              relatedSystemId,
              ticketOwnerId: null,
            },
          });
        },
      );

      if (!createdTicket) {
        res.status(500).json({ error: "Unable to create ticket. Please try again." });
        return;
      }

      const ticket = createdTicket as any;
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
  },
);

// ---------------------------------------------------------------------------
// List My Tickets — requires REQUESTER role with completed password change
// Scoped strictly to authenticated session requesterId
// ---------------------------------------------------------------------------
const ALLOWED_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "ticketNo",
  "requestedPriority",
  "itPriority",
  "currentStatus",
] as const;

const ALLOWED_STATUS_QUERY = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
  "ALL",
] as const;

app.get(
  "/api/tickets",
  requireAuth,
  requirePasswordChanged,
  requireRole("REQUESTER"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const requesterId = req.user!.id;
      const prisma = getPrisma();

      const validationDetails: Record<string, string> = {};

      const sortByParam = req.query.sortBy as string | undefined;
      if (sortByParam !== undefined && !ALLOWED_SORT_FIELDS.includes(sortByParam as any)) {
        validationDetails.sortBy = `sortBy must be one of ${ALLOWED_SORT_FIELDS.join(", ")}`;
      }

      const sortOrderParam = req.query.sortOrder as string | undefined;
      if (sortOrderParam !== undefined && !["asc", "desc"].includes(sortOrderParam)) {
        validationDetails.sortOrder = "sortOrder must be one of asc, desc";
      }

      const limitParam = req.query.limit as string | undefined;
      let parsedLimit: number | undefined = undefined;
      if (limitParam !== undefined) {
        parsedLimit = Number(limitParam);
        if (!Number.isInteger(parsedLimit) || !ALLOWED_PAGE_SIZES.includes(parsedLimit as any)) {
          validationDetails.limit = "limit must be one of 5, 8, 10, 20";
        }
      }

      const pageParam = req.query.page as string | undefined;
      if (pageParam !== undefined) {
        const isIntString = typeof pageParam === "string" && /^-?\d+$/.test(pageParam.trim());
        const parsedPage = Number(pageParam);
        if (!isIntString || !Number.isSafeInteger(parsedPage)) {
          validationDetails.page = "page must be an integer";
        }
      }

      const categoryIdParam = req.query.categoryId as string | undefined;
      if (categoryIdParam !== undefined && categoryIdParam !== "ALL") {
        const catId = Number(categoryIdParam);
        if (!Number.isInteger(catId) || catId <= 0) {
          validationDetails.categoryId = "categoryId must be a positive integer or ALL";
        }
      }

      const reqPriorityParam = req.query.requestedPriority as string | undefined;
      if (
        reqPriorityParam !== undefined &&
        !["LOW", "MEDIUM", "HIGH", "ALL"].includes(reqPriorityParam)
      ) {
        validationDetails.requestedPriority = "requestedPriority must be one of LOW, MEDIUM, HIGH, ALL";
      }

      const itPriorityParam = req.query.itPriority as string | undefined;
      if (
        itPriorityParam !== undefined &&
        !["LOW", "MEDIUM", "HIGH", "ALL"].includes(itPriorityParam)
      ) {
        validationDetails.itPriority = "itPriority must be one of LOW, MEDIUM, HIGH, ALL";
      }

      const statusParam = req.query.status as string | undefined;
      if (statusParam !== undefined && !ALLOWED_STATUS_QUERY.includes(statusParam as any)) {
        validationDetails.status = `status must be one of ${ALLOWED_STATUS_QUERY.join(", ")}`;
      }

      if (Object.keys(validationDetails).length > 0) {
        res.status(400).json({
          error: "Validation failed",
          details: validationDetails,
        });
        return;
      }

      const where: any = { requesterId };

      if (req.query.search) {
        const term = String(req.query.search).trim();
        if (term) {
          where.OR = [
            { ticketNo: { contains: term, mode: "insensitive" } },
            { summary: { contains: term, mode: "insensitive" } },
          ];
        }
      }

      if (categoryIdParam && categoryIdParam !== "ALL") {
        where.categoryId = Number(categoryIdParam);
      }

      if (reqPriorityParam && reqPriorityParam !== "ALL") {
        where.requestedPriority = reqPriorityParam;
      }

      if (itPriorityParam && itPriorityParam !== "ALL") {
        where.itPriority = itPriorityParam;
      }

      if (statusParam && statusParam !== "ALL") {
        where.currentStatus = statusParam;
      }

      const totalItems = await prisma.ticket.count({ where });

      const paginationResult = clampPagination({
        page: req.query.page as string | undefined,
        limit: parsedLimit,
        totalItems,
      });

      const sortBy = sortByParam || "createdAt";
      const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === "asc" ? "asc" : "desc";
      const orderBy: any[] = [{ [sortBy]: sortOrder }];
      if (sortBy !== "id") {
        orderBy.push({ id: "desc" });
      }

      const tickets = await prisma.ticket.findMany({
        where,
        orderBy,
        skip: paginationResult.skip,
        take: paginationResult.take,
        include: {
          category: { select: { name: true } },
          relatedSystem: { select: { name: true } },
          ticketOwner: { select: { name: true } },
        },
      });

      const data = tickets.map((t) => ({
        id: t.id,
        ticketNo: t.ticketNo,
        summary: t.summary,
        categoryName: t.category.name,
        relatedSystemName: t.relatedSystem.name,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        ticketOwnerName: t.ticketOwner?.name || "Unassigned",
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));

      res.status(200).json({
        data,
        pagination: paginationResult.pagination,
      });
    } catch (err) {
      res.status(500).json({ error: "Unable to load tickets. Please try again." });
    }
  },
);

// ---------------------------------------------------------------------------
// Ticket Detail — requires active session with completed password change
// Foreign tickets return 403 for Requester
// ---------------------------------------------------------------------------
app.get(
  "/api/tickets/:id",
  requireAuth,
  requirePasswordChanged,
  async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    if (!/^[1-9]\d*$/.test(rawId)) {
      res.status(400).json({ error: "Invalid ticket ID" });
      return;
    }

    const ticketId = parseInt(rawId, 10);

    try {
      const ticket = await getPrisma().ticket.findUnique({
        where: { id: ticketId },
        include: {
          category: { select: { name: true } },
          relatedSystem: { select: { name: true } },
          ticketOwner: { select: { name: true } },
          attachments: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              removedAt: true,
              removalReason: true,
              createdAt: true,
            },
          },
        },
      });

      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      // Requester role check: must own the ticket (AC-08, BR-04)
      if (req.user!.role === "REQUESTER" && ticket.requesterId !== req.user!.id) {
        res.status(403).json({ error: "Access denied: You do not own this ticket" });
        return;
      }

      res.status(200).json({
        id: ticket.id,
        ticketNo: ticket.ticketNo,
        summary: ticket.summary,
        description: ticket.description,
        categoryName: ticket.category.name,
        relatedSystemName: ticket.relatedSystem.name,
        requestedPriority: ticket.requestedPriority,
        itPriority: ticket.itPriority,
        currentStatus: ticket.currentStatus,
        ticketOwnerName: ticket.ticketOwner?.name || "Unassigned",
        requesterId: ticket.requesterId,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
        version: ticket.version,
        appearsResolvedAt: ticket.appearsResolvedAt ? ticket.appearsResolvedAt.toISOString() : null,
        appearsResolvedById: ticket.appearsResolvedById,
        attachments: ticket.attachments.map((a) => ({
          id: a.id,
          fileName: a.fileName,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
          removedAt: a.removedAt ? a.removedAt.toISOString() : null,
          removalReason: a.removalReason,
          createdAt: a.createdAt.toISOString(),
        })),
      });
    } catch (err) {
      res.status(500).json({ error: "Unable to load ticket. Please try again." });
    }
  },
);

// ---------------------------------------------------------------------------
// Appears Resolved — requires REQUESTER role owning the ticket
// Permitted statuses: OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED
// ---------------------------------------------------------------------------
const PERMITTED_APPEARS_RESOLVED_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "REOPENED",
];

app.post(
  "/api/tickets/:id/appears-resolved",
  requireAuth,
  requirePasswordChanged,
  requireRole("REQUESTER"),
  async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    if (!/^[1-9]\d*$/.test(rawId)) {
      res.status(400).json({ error: "Invalid ticket ID" });
      return;
    }
    const ticketId = parseInt(rawId, 10);
    if (req.body && typeof req.body === "object") {
      const disallowed = ["actor", "appearsResolvedAt", "appearsResolvedById", "status", "version", "requesterId"];
      const errors: Record<string, string> = {};
      for (const field of disallowed) {
        if (field in req.body) {
          errors[field] = `Field '${field}' is not permitted`;
        }
      }
      if (Object.keys(errors).length > 0) {
        res.status(400).json({ error: "Validation failed", details: errors });
        return;
      }
    }

    try {
      const prisma = getPrisma();
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      if (ticket.requesterId !== req.user!.id) {
        res.status(403).json({ error: "Access denied: You do not own this ticket" });
        return;
      }

      if (!PERMITTED_APPEARS_RESOLVED_STATUSES.includes(ticket.currentStatus)) {
        res.status(400).json({
          error: "APPEARS_RESOLVED_NOT_ALLOWED",
          message: "This ticket cannot be marked as appears resolved in its current status.",
        });
        return;
      }

      // Idempotent: if already marked, return existing without altering timestamp or status
      if (ticket.appearsResolvedAt !== null) {
        res.status(200).json({
          id: ticket.id,
          ticketNo: ticket.ticketNo,
          currentStatus: ticket.currentStatus,
          appearsResolvedAt: ticket.appearsResolvedAt.toISOString(),
          appearsResolvedById: ticket.appearsResolvedById,
          message: "Problem noted as appears resolved. IT Staff will verify and complete formal resolution.",
        });
        return;
      }

      const now = new Date();
      const updateResult = await prisma.ticket.updateMany({
        where: {
          id: ticketId,
          version: ticket.version,
          currentStatus: { in: PERMITTED_APPEARS_RESOLVED_STATUSES as any },
        },
        data: {
          appearsResolvedAt: now,
          appearsResolvedById: req.user!.id,
          version: { increment: 1 },
          updatedAt: now,
        },
      });

      if (updateResult.count === 0) {
        const freshTicket = await prisma.ticket.findUnique({
          where: { id: ticketId },
        });

        if (freshTicket && freshTicket.appearsResolvedAt !== null) {
          res.status(200).json({
            id: freshTicket.id,
            ticketNo: freshTicket.ticketNo,
            currentStatus: freshTicket.currentStatus,
            appearsResolvedAt: freshTicket.appearsResolvedAt.toISOString(),
            appearsResolvedById: freshTicket.appearsResolvedById,
            message: "Problem noted as appears resolved. IT Staff will verify and complete formal resolution.",
          });
          return;
        }

        if (freshTicket && !PERMITTED_APPEARS_RESOLVED_STATUSES.includes(freshTicket.currentStatus)) {
          res.status(400).json({
            error: "APPEARS_RESOLVED_NOT_ALLOWED",
            message: "This ticket cannot be marked as appears resolved in its current status.",
          });
          return;
        }

        res.status(409).json({
          error: "CONFLICT",
          message: "Ticket was modified concurrently. Please reload and try again.",
        });
        return;
      }

      const updated = (await prisma.ticket.findUnique({
        where: { id: ticketId },
      }))!;

      res.status(200).json({
        id: updated.id,
        ticketNo: updated.ticketNo,
        currentStatus: updated.currentStatus,
        appearsResolvedAt: updated.appearsResolvedAt!.toISOString(),
        appearsResolvedById: updated.appearsResolvedById,
        message: "Problem noted as appears resolved. IT Staff will verify and complete formal resolution.",
      });
    } catch (err) {
      res.status(500).json({ error: "Unable to mark ticket as appears resolved." });
    }
  },
);

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------
const UPLOADS_DIR = getUploadDirectory();
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

function handleFileUpload(req: Request, res: Response, next: express.NextFunction) {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({
          error: "Validation failed",
          details: { file: "File exceeds the 5 MB size limit" },
        });
        return;
      }
      res.status(400).json({
        error: "Validation failed",
        details: { file: err.message || "File upload error" },
      });
      return;
    }
    next();
  });
}

// Upload Attachment — REQUESTER role on own ticket
app.post(
  "/api/tickets/:id/attachments",
  requireAuth,
  requirePasswordChanged,
  requireRole("REQUESTER"),
  handleFileUpload,
  async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    if (!/^[1-9]\d*$/.test(rawId)) {
      res.status(400).json({ error: "Invalid ticket ID" });
      return;
    }
    const ticketId = parseInt(rawId, 10);

    try {
      const ticket = await getPrisma().ticket.findUnique({
        where: { id: ticketId },
      });

      if (!ticket) {
        res.status(404).json({ error: "Ticket not found" });
        return;
      }

      if (ticket.requesterId !== req.user!.id) {
        res.status(403).json({ error: "Access denied: You do not own this ticket" });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          error: "Validation failed",
          details: { file: "File is required" },
        });
        return;
      }

      if (req.file.size > 5 * 1024 * 1024) {
        res.status(400).json({
          error: "Validation failed",
          details: { file: "File exceeds the 5 MB size limit" },
        });
        return;
      }

      const validation = validateAttachmentType(req.file.originalname, req.file.mimetype, req.file.buffer);
      if (!validation.isValid) {
        res.status(400).json({
          error: "Validation failed",
          details: { file: "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed" },
        });
        return;
      }

      const { diskFileName } = sanitizeFileName(req.file.originalname);
      const filePath = path.join(UPLOADS_DIR, diskFileName);

      try {
        await fs.promises.writeFile(filePath, req.file.buffer);
      } catch (writeErr) {
        res.status(500).json({ error: "Unable to save the attachment. Please try again." });
        return;
      }

      try {
        const attachment = await getPrisma().$transaction(async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;

          const activeCount = await tx.attachment.count({
            where: { ticketId, removedAt: null },
          });

          if (activeCount >= 5) {
            throw new Error("LIMIT_REACHED");
          }

          return await tx.attachment.create({
            data: {
              ticketId,
              uploadedByRequesterId: req.user!.id,
              fileName: req.file!.originalname,
              storedFileName: diskFileName,
              fileSize: req.file!.size,
              mimeType: validation.mimeType || req.file!.mimetype,
            },
          });
        });

        res.status(201).json({
          id: attachment.id,
          ticketId: attachment.ticketId,
          fileName: attachment.fileName,
          fileSize: attachment.fileSize,
          mimeType: attachment.mimeType,
          removedAt: null,
          removalReason: null,
          createdAt: attachment.createdAt.toISOString(),
        });
      } catch (dbErr: any) {
        try {
          await fs.promises.unlink(filePath);
        } catch {}

        if (dbErr.message === "LIMIT_REACHED") {
          res.status(400).json({
            error: "Validation failed",
            details: { file: "This ticket already has 5 active attachments" },
          });
          return;
        }

        res.status(500).json({ error: "Unable to save the attachment. Please try again." });
      }
    } catch (err) {
      res.status(500).json({ error: "Unable to upload attachment. Please try again." });
    }
  },
);

// Download Attachment — Shared download: REQUESTER (own) or IT_STAFF / ADMINISTRATOR (any)
app.get(
  "/api/attachments/:id/download",
  requireAuth,
  requirePasswordChanged,
  async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    if (!/^[1-9]\d*$/.test(rawId)) {
      res.status(400).json({ error: "Invalid attachment ID" });
      return;
    }
    const attachmentId = parseInt(rawId, 10);

    try {
      const attachment = await getPrisma().attachment.findUnique({
        where: { id: attachmentId },
        include: { ticket: true },
      });

      if (!attachment) {
        res.status(404).json({ error: "Attachment not found" });
        return;
      }

      // Shared download permissions (api-spec.md §3.5):
      // REQUESTER may only download own files; IT_STAFF and ADMINISTRATOR may download any active files
      if (req.user!.role === "REQUESTER" && attachment.ticket.requesterId !== req.user!.id) {
        res.status(403).json({ error: "Access denied: You do not own this attachment" });
        return;
      }

      if (attachment.removedAt !== null) {
        res.status(410).json({ error: "This attachment has been removed and cannot be downloaded" });
        return;
      }

      const filePath = path.join(UPLOADS_DIR, attachment.storedFileName);
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: "File not found on server" });
        return;
      }

      res.setHeader("Content-Type", attachment.mimeType);
      res.setHeader("Content-Disposition", `attachment; filename="${attachment.fileName}"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err) {
      res.status(500).json({ error: "Unable to download attachment. Please try again." });
    }
  },
);

// Soft-remove Attachment — REQUESTER role on own ticket
app.delete(
  "/api/attachments/:id",
  requireAuth,
  requirePasswordChanged,
  requireRole("REQUESTER"),
  async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params.id;
    if (!/^[1-9]\d*$/.test(rawId)) {
      res.status(400).json({ error: "Invalid attachment ID" });
      return;
    }
    const attachmentId = parseInt(rawId, 10);

    const { removalReason } = req.body || {};
    if (typeof removalReason !== "string" || removalReason.trim().length < 3 || removalReason.trim().length > 200) {
      res.status(400).json({
        error: "Validation failed",
        details: {
          removalReason: "A removal reason is required (3–200 characters)",
        },
      });
      return;
    }

    const trimmedReason = removalReason.trim();

    try {
      const attachment = await getPrisma().attachment.findUnique({
        where: { id: attachmentId },
        include: { ticket: true },
      });

      if (!attachment) {
        res.status(404).json({ error: "Attachment not found" });
        return;
      }

      if (attachment.ticket.requesterId !== req.user!.id) {
        res.status(403).json({ error: "Access denied: You do not own this attachment" });
        return;
      }

      if (attachment.removedAt !== null) {
        res.status(409).json({ error: "This attachment has already been removed" });
        return;
      }

      const updated = await getPrisma().attachment.update({
        where: { id: attachmentId },
        data: {
          removedAt: new Date(),
          removalReason: trimmedReason,
        },
      });

      res.status(200).json({
        id: updated.id,
        removedAt: updated.removedAt!.toISOString(),
        removalReason: updated.removalReason,
      });
    } catch (err) {
      res.status(500).json({ error: "Unable to remove attachment. Please try again." });
    }
  },
);

export default app;
