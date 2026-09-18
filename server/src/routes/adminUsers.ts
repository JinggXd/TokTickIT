import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requirePasswordChanged, requireRole, csrfProtection } from "../middleware/sessionAuth.js";
import { hashPassword } from "../utils/password.js";
import { Role } from "@prisma/client";

export const adminUsersRouter = Router();

// Apply global middleware for admin users routes
adminUsersRouter.use(requireAuth);
adminUsersRouter.use(requirePasswordChanged);
adminUsersRouter.use(requireRole("ADMINISTRATOR"));

const ALLOWED_QUERY_PARAMS = new Set(["search", "role"]);
const VALID_ROLES = new Set(["REQUESTER", "IT_STAFF", "ADMINISTRATOR"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 1. GET /api/admin/users
adminUsersRouter.get("/", async (req: Request, res: Response) => {
  const queryKeys = Object.keys(req.query);
  const invalidKeys = queryKeys.filter((k) => !ALLOWED_QUERY_PARAMS.has(k));

  if (invalidKeys.length > 0) {
    const details: Record<string, string> = {};
    for (const k of invalidKeys) {
      details[k] = "Invalid query parameter";
    }
    res.status(400).json({ error: "Validation failed", details });
    return;
  }

  const { search, role } = req.query;

  if (role !== undefined) {
    if (typeof role !== "string" || !VALID_ROLES.has(role)) {
      res.status(400).json({
        error: "Validation failed",
        details: { role: "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR" },
      });
      return;
    }
  }

  const whereClause: any = {};

  if (role) {
    whereClause.role = role as Role;
  }

  if (search && typeof search === "string") {
    const term = search.trim();
    if (term.length > 0) {
      whereClause.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { email: { contains: term, mode: "insensitive" } },
      ];
    }
  }

  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
    },
    orderBy: [
      { name: "asc" },
      { id: "asc" },
    ],
  });

  res.status(200).json({ users });
});

// 2. POST /api/admin/users (Create user)
adminUsersRouter.post("/", csrfProtection, async (req: Request, res: Response) => {
  const allowedKeys = new Set(["name", "email", "role", "isActive", "initialPassword"]);
  const bodyKeys = Object.keys(req.body);
  const extraKeys = bodyKeys.filter((k) => !allowedKeys.has(k));

  const details: Record<string, string> = {};

  if (extraKeys.length > 0) {
    for (const k of extraKeys) {
      details[k] = "Field is not permitted";
    }
  }

  const { name, email, role, isActive, initialPassword } = req.body;

  if (!name || typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100) {
    details.name = "Name must be between 1 and 100 characters";
  }

  const trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!trimmedEmail || trimmedEmail.length > 254 || !EMAIL_REGEX.test(trimmedEmail)) {
    details.email = "Valid email address is required (max 254 characters)";
  }

  if (!role || typeof role !== "string" || !VALID_ROLES.has(role)) {
    details.role = "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR";
  }

  if (typeof isActive !== "boolean") {
    details.isActive = "isActive must be a boolean";
  }

  if (
    !initialPassword ||
    typeof initialPassword !== "string" ||
    initialPassword.length < 12 ||
    initialPassword.length > 128
  ) {
    details.initialPassword = "Initial password must be between 12 and 128 characters";
  }

  if (Object.keys(details).length > 0) {
    res.status(400).json({ error: "Validation failed", details });
    return;
  }

  const prisma = getPrisma();

  // Check duplicate email
  const existing = await prisma.user.findUnique({
    where: { email: trimmedEmail },
  });

  if (existing) {
    res.status(409).json({
      error: "DUPLICATE_EMAIL",
      message: "An account with this email address already exists.",
    });
    return;
  }

  const passwordHash = await hashPassword(initialPassword);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: trimmedEmail,
      role: role as Role,
      isActive,
      passwordHash,
      mustChangePassword: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  res.status(201).json(newUser);
});

// 3. PATCH /api/admin/users/:id (Edit user)
adminUsersRouter.patch("/:id", csrfProtection, async (req: Request, res: Response) => {
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId) || targetId <= 0) {
    res.status(400).json({
      error: "Validation failed",
      details: { id: "ID must be a positive integer" },
    });
    return;
  }

  const allowedKeys = new Set(["name", "email", "role", "isActive"]);
  const bodyKeys = Object.keys(req.body);

  if (bodyKeys.length === 0) {
    res.status(400).json({
      error: "Validation failed",
      message: "At least one field must be provided for update",
    });
    return;
  }

  const details: Record<string, string> = {};
  const extraKeys = bodyKeys.filter((k) => !allowedKeys.has(k));
  if (extraKeys.length > 0) {
    for (const k of extraKeys) {
      details[k] = "Field is not permitted";
    }
  }

  const { name, email, role, isActive } = req.body;

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length === 0 || name.trim().length > 100) {
      details.name = "Name must be between 1 and 100 characters";
    }
  }

  let trimmedEmail: string | undefined;
  if (email !== undefined) {
    trimmedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!trimmedEmail || trimmedEmail.length > 254 || !EMAIL_REGEX.test(trimmedEmail)) {
      details.email = "Valid email address is required (max 254 characters)";
    }
  }

  if (role !== undefined) {
    if (typeof role !== "string" || !VALID_ROLES.has(role)) {
      details.role = "Role must be REQUESTER, IT_STAFF, or ADMINISTRATOR";
    }
  }

  if (isActive !== undefined && typeof isActive !== "boolean") {
    details.isActive = "isActive must be a boolean";
  }

  if (Object.keys(details).length > 0) {
    res.status(400).json({ error: "Validation failed", details });
    return;
  }

  // Safety invariant 1: Self-deactivation (BR-19)
  if (targetId === req.user!.id && isActive === false) {
    res.status(400).json({
      error: "SELF_DEACTIVATION",
      message: "You cannot deactivate your own account.",
    });
    return;
  }

  const prisma = getPrisma();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const targetUser = await tx.user.findUnique({
        where: { id: targetId },
      });

      if (!targetUser) {
        return { notFound: true };
      }

      // Duplicate email check
      if (trimmedEmail && trimmedEmail !== targetUser.email.toLowerCase()) {
        const emailConflict = await tx.user.findUnique({
          where: { email: trimmedEmail },
        });
        if (emailConflict) {
          return { duplicateEmail: true };
        }
      }

      // Safety invariant 2: Last Active Admin Protection (BR-20)
      const isTargetActiveAdmin = targetUser.role === "ADMINISTRATOR" && targetUser.isActive === true;
      const targetBecomesInactiveOrDemoted =
        (isActive !== undefined && isActive === false) ||
        (role !== undefined && role !== "ADMINISTRATOR");

      if (isTargetActiveAdmin && targetBecomesInactiveOrDemoted) {
        const activeAdminCount = await tx.user.count({
          where: { role: "ADMINISTRATOR", isActive: true },
        });

        if (activeAdminCount <= 1) {
          return { lastActiveAdmin: true };
        }
      }

      // Safety invariant 3: Owner Deactivation / Demotion Cascade (BR-21)
      let unassignedTicketsCount = 0;
      const wasEligibleOwner =
        (targetUser.role === "IT_STAFF" || targetUser.role === "ADMINISTRATOR") && targetUser.isActive;
      const willBeEligibleOwner =
        (role !== undefined ? (role === "IT_STAFF" || role === "ADMINISTRATOR") : (targetUser.role === "IT_STAFF" || targetUser.role === "ADMINISTRATOR")) &&
        (isActive !== undefined ? isActive : targetUser.isActive);

      if (wasEligibleOwner && !willBeEligibleOwner) {
        const unassignResult = await tx.ticket.updateMany({
          where: { ticketOwnerId: targetId },
          data: {
            ticketOwnerId: null,
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        unassignedTicketsCount = unassignResult.count;
      }

      // Session revocation: if role or isActive changes
      const roleChanged = role !== undefined && role !== targetUser.role;
      const activeChanged = isActive !== undefined && isActive !== targetUser.isActive;

      if (roleChanged || activeChanged) {
        await tx.session.deleteMany({
          where: { userId: targetId },
        });
      }

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (trimmedEmail !== undefined) updateData.email = trimmedEmail;
      if (role !== undefined) updateData.role = role as Role;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updated = await tx.user.update({
        where: { id: targetId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      return {
        updated,
        unassignedTicketsCount,
      };
    });

    if ("notFound" in result) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if ("duplicateEmail" in result) {
      res.status(409).json({
        error: "DUPLICATE_EMAIL",
        message: "An account with this email address already exists.",
      });
      return;
    }

    if ("lastActiveAdmin" in result) {
      res.status(400).json({
        error: "LAST_ACTIVE_ADMIN",
        message: "At least one active Administrator must remain.",
      });
      return;
    }

    res.status(200).json({
      ...result.updated,
      unassignedTicketsCount: result.unassignedTicketsCount,
    });
  } catch (err: any) {
    res.status(500).json({
      error: "Unable to complete request. Please try again.",
    });
  }
});

// 4. POST /api/admin/users/:id/initial-password (Reset password)
adminUsersRouter.post("/:id/initial-password", csrfProtection, async (req: Request, res: Response) => {
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId) || targetId <= 0) {
    res.status(400).json({
      error: "Validation failed",
      details: { id: "ID must be a positive integer" },
    });
    return;
  }

  const allowedKeys = new Set(["initialPassword"]);
  const bodyKeys = Object.keys(req.body);
  const extraKeys = bodyKeys.filter((k) => !allowedKeys.has(k));

  if (extraKeys.length > 0) {
    const details: Record<string, string> = {};
    for (const k of extraKeys) {
      details[k] = "Field is not permitted";
    }
    res.status(400).json({ error: "Validation failed", details });
    return;
  }

  const { initialPassword } = req.body;
  if (
    !initialPassword ||
    typeof initialPassword !== "string" ||
    initialPassword.length < 12 ||
    initialPassword.length > 128
  ) {
    res.status(400).json({
      error: "Validation failed",
      details: { initialPassword: "Initial password must be between 12 and 128 characters" },
    });
    return;
  }

  const prisma = getPrisma();
  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
  });

  if (!targetUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const passwordHash = await hashPassword(initialPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    }),
    prisma.session.deleteMany({
      where: { userId: targetId },
    }),
  ]);

  res.status(204).send();
});
