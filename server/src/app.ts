import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { requireRequester, AuthenticatedRequesterRequest } from "./middleware/requireRequester.js";
import { validateTicketInput } from "./utils/validation.js";
import { generateTicketNumber, TicketNumberGenerationError } from "./utils/ticketNumber.js";
import fs from "fs";
import path from "path";
import multer from "multer";
import { clampPagination, ALLOWED_PAGE_SIZES } from "./utils/pagination.js";
import { sanitizeFileName, validateAttachmentType } from "./utils/safeFilename.js";
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

// ---------------------------------------------------------------------------
// Lab 2: Phase 4 — List My Tickets (api-spec.md Section 6.5, BR-04, BR-12, FR-06)
// Scoped strictly to the current Requester via X-Requester-Id.
// ---------------------------------------------------------------------------
const ALLOWED_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "ticketNo",
  "requestedPriority",
  "itPriority",
  "currentStatus",
] as const;

app.get(
  "/api/tickets",
  requireRequester as express.RequestHandler,
  async (req: AuthenticatedRequesterRequest, res: Response): Promise<void> => {
    try {
      const requesterId = req.requester!.id;
      const prisma = getPrisma();

      // 1. Validate query parameters (sortBy and limit)
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
      if (
        statusParam !== undefined &&
        !["NEW", "IN_PROGRESS", "RESOLVED", "ALL"].includes(statusParam)
      ) {
        validationDetails.status = "status must be one of NEW, IN_PROGRESS, RESOLVED, ALL";
      }

      if (Object.keys(validationDetails).length > 0) {
        res.status(400).json({
          error: "Validation failed",
          details: validationDetails,
        });
        return;
      }

      // 2. Build where filter (always scoped to requesterId)
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

      // 3. Count matching items for pagination
      const totalItems = await prisma.ticket.count({ where });

      // 4. Calculate pagination clamping (BR-12)
      const paginationResult = clampPagination({
        page: req.query.page as string | undefined,
        limit: parsedLimit,
        totalItems,
      });

      // 5. Build sort order (default: createdAt desc, id desc)
      const sortBy = sortByParam || "createdAt";
      const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === "asc" ? "asc" : "desc";
      const orderBy: any[] = [{ [sortBy]: sortOrder }];
      if (sortBy !== "id") {
        orderBy.push({ id: "desc" }); // tie breaker
      }

      // 6. Query tickets with joined relations
      const tickets = await prisma.ticket.findMany({
        where,
        orderBy,
        skip: paginationResult.skip,
        take: paginationResult.take,
        include: {
          category: { select: { name: true } },
          relatedSystem: { select: { name: true } },
        },
      });

      // 7. Format response data
      const data = tickets.map((t) => ({
        id: t.id,
        ticketNo: t.ticketNo,
        summary: t.summary,
        categoryName: t.category.name,
        relatedSystemName: t.relatedSystem.name,
        requestedPriority: t.requestedPriority,
        itPriority: t.itPriority,
        currentStatus: t.currentStatus,
        ticketOwnerName: "Unassigned", // No IT Staff model in Lab 2 (reserved for Lab 3)
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
  }
);

// ---------------------------------------------------------------------------
// Lab 2: Phase 5 — Ticket Detail (api-spec.md Section 6.6, API-10, 11, 12)
// Enforces ownership (403 if ticket does not belong to X-Requester-Id).
// ---------------------------------------------------------------------------
app.get(
  "/api/tickets/:id",
  requireRequester,
  async (req: AuthenticatedRequesterRequest, res: Response) => {
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

      if (ticket.requesterId !== req.requester!.id) {
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
        ticketOwnerName: "Unassigned",
        requesterId: ticket.requesterId,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
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
  }
);

// ---------------------------------------------------------------------------
// Lab 2: Phase 5 — Attachment Endpoints (api-spec.md Section 6.7, 6.8, 6.9)
// ---------------------------------------------------------------------------

const UPLOADS_DIR = fs.existsSync(path.resolve(process.cwd(), "server"))
  ? path.resolve(process.cwd(), "server", "uploads")
  : path.resolve(process.cwd(), "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Allow up to 10MB in memory so we can validate and return exact 5MB error
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

// 6.7 POST /api/tickets/:id/attachments — Upload Attachment
app.post(
  "/api/tickets/:id/attachments",
  requireRequester,
  handleFileUpload,
  async (req: AuthenticatedRequesterRequest, res: Response) => {
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

      if (ticket.requesterId !== req.requester!.id) {
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

      // Check size limit: 5 MB
      if (req.file.size > 5 * 1024 * 1024) {
        res.status(400).json({
          error: "Validation failed",
          details: { file: "File exceeds the 5 MB size limit" },
        });
        return;
      }

      // Validate file extension and magic bytes
      const validation = validateAttachmentType(req.file.originalname, req.file.mimetype, req.file.buffer);
      if (!validation.isValid) {
        res.status(400).json({
          error: "Validation failed",
          details: { file: "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed" },
        });
        return;
      }

      // Generate safe disk filename and save to uploads directory
      const { diskFileName } = sanitizeFileName(req.file.originalname);
      const filePath = path.join(UPLOADS_DIR, diskFileName);

      try {
        await fs.promises.writeFile(filePath, req.file.buffer);
      } catch (writeErr) {
        res.status(500).json({ error: "Unable to save the attachment. Please try again." });
        return;
      }

      // Execute DB insert inside interactive transaction with row lock on Ticket to prevent concurrent upload races
      try {
        const attachment = await getPrisma().$transaction(async (tx) => {
          // Lock ticket row to serialize concurrent uploads for this ticket
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
              uploadedByRequesterId: req.requester!.id,
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
        // Rollback disk file if DB write fails or limit was reached
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
  }
);

// 6.8 GET /api/attachments/:id/download — Download Attachment
app.get(
  "/api/attachments/:id/download",
  requireRequester,
  async (req: AuthenticatedRequesterRequest, res: Response) => {
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

      if (attachment.ticket.requesterId !== req.requester!.id) {
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
  }
);

// 6.9 DELETE /api/attachments/:id — Soft-remove Attachment
app.delete(
  "/api/attachments/:id",
  requireRequester,
  async (req: AuthenticatedRequesterRequest, res: Response) => {
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

      if (attachment.ticket.requesterId !== req.requester!.id) {
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
  }
);

export default app;
