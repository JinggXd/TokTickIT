import express, { Request, Response } from "express";
import { getPrisma } from "../prisma.js";
import {
  generateSessionToken,
  hashSessionToken,
  generateCsrfToken,
  setSessionCookie,
  clearSessionCookie,
} from "../utils/session.js";
import {
  hashPassword,
  verifyPassword,
  validateNewPassword,
} from "../utils/password.js";
import {
  checkLoginRateLimit,
  recordFailedLogin,
  clearLoginRateLimit,
} from "../utils/rateLimit.js";
import { requireAuth } from "../middleware/sessionAuth.js";

export const authRouter = express.Router();

function getClientIp(req: Request): string {
  // Use connection IP / Express trusted ip; do not trust client-supplied X-Forwarded-For headers
  return req.ip || req.socket.remoteAddress || "127.0.0.1";
}

// ---------------------------------------------------------------------------
// 2.1 POST /api/auth/login
// ---------------------------------------------------------------------------
authRouter.post("/login", async (req: Request, res: Response): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const { email, password } = req.body || {};

  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({
      error: "Validation failed",
      details: {
        ...(!email || typeof email !== "string" ? { email: "Email is required" } : {}),
        ...(!password || typeof password !== "string" ? { password: "Password is required" } : {}),
      },
    });
    return;
  }

  const clientIp = getClientIp(req);
  const rateLimit = checkLoginRateLimit(email, clientIp);
  if (rateLimit.isLimited) {
    res
      .setHeader("Retry-After", String(rateLimit.retryAfterSeconds))
      .status(429)
      .json({
        error: "TOO_MANY_ATTEMPTS",
        message: "Too many failed login attempts. Please try again later.",
      });
    return;
  }

  try {
    const prisma = getPrisma();
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email.trim(), mode: "insensitive" },
      },
    });

    const isPasswordValid = user?.passwordHash ? await verifyPassword(password, user.passwordHash) : false;

    if (!user || !user.isActive || !user.passwordHash || !isPasswordValid) {
      recordFailedLogin(email, clientIp);
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    clearLoginRateLimit(email, clientIp);

    const rawToken = generateSessionToken();
    const hashedId = hashSessionToken(rawToken);
    const csrfToken = generateCsrfToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    let activeUser = user;
    try {
      await prisma.$transaction(async (tx) => {
        const freshUser = await tx.user.findUnique({
          where: { id: user.id },
        });

        if (
          !freshUser ||
          !freshUser.isActive ||
          !freshUser.passwordHash ||
          freshUser.passwordHash !== user.passwordHash ||
          freshUser.sessionVersion !== user.sessionVersion
        ) {
          throw new Error("CREDENTIALS_INVALIDATED");
        }

        await tx.session.create({
          data: {
            id: hashedId,
            userId: freshUser.id,
            sessionVersion: freshUser.sessionVersion,
            csrfToken,
            expiresAt,
          },
        });
        activeUser = freshUser;
      });
    } catch (err: any) {
      if (err.message === "CREDENTIALS_INVALIDATED") {
        recordFailedLogin(email, clientIp);
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }
      throw err;
    }

    setSessionCookie(res, rawToken);

    res.status(200).json({
      user: {
        id: activeUser.id,
        name: activeUser.name,
        email: activeUser.email,
        role: activeUser.role,
        mustChangePassword: activeUser.mustChangePassword,
      },
    });
  } catch (err) {
    res.status(500).json({ error: "Unable to process login. Please try again." });
  }
});

// ---------------------------------------------------------------------------
// 2.2 GET /api/auth/me
// ---------------------------------------------------------------------------
authRouter.get("/me", requireAuth, (req: Request, res: Response): void => {
  res.setHeader("Cache-Control", "no-store");
  const user = req.user!;
  res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  });
});

// ---------------------------------------------------------------------------
// 2.5 GET /api/auth/csrf
// ---------------------------------------------------------------------------
authRouter.get("/csrf", requireAuth, (req: Request, res: Response): void => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    csrfToken: req.session!.csrfToken,
  });
});

// ---------------------------------------------------------------------------
// 2.3 POST /api/auth/change-password
// ---------------------------------------------------------------------------
authRouter.post(
  "/change-password",
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    res.setHeader("Cache-Control", "no-store");
    const { currentPassword, newPassword, confirmPassword } = req.body || {};

    if (!currentPassword || typeof currentPassword !== "string") {
      res.status(400).json({
        error: "Validation failed",
        details: { currentPassword: "Current password is required" },
      });
      return;
    }

    const validation = validateNewPassword(newPassword, confirmPassword, currentPassword);
    if (!validation.isValid) {
      res.status(400).json({
        error: "Validation failed",
        details: validation.errors,
      });
      return;
    }

    const prisma = getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    const isCurrentPasswordValid = user?.passwordHash
      ? await verifyPassword(currentPassword, user.passwordHash)
      : false;

    if (!user || !user.isActive || !user.passwordHash || !isCurrentPasswordValid) {
      res.status(400).json({
        error: "Validation failed",
        details: { currentPassword: "Incorrect current password" },
      });
      return;
    }

    const newHash = await hashPassword(newPassword);
    const newSessionVersion = user.sessionVersion + 1;
    const rawToken = generateSessionToken();
    const hashedId = hashSessionToken(rawToken);
    const csrfToken = generateCsrfToken();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Lock user row FOR UPDATE in PostgreSQL
        const freshUsers = await tx.$queryRaw<
          Array<{ id: number; passwordHash: string | null; sessionVersion: number; isActive: boolean }>
        >`
          SELECT id, "passwordHash", "sessionVersion", "isActive"
          FROM "RequesterUser"
          WHERE id = ${user.id}
          FOR UPDATE
        `;
        const freshUser = freshUsers[0] ?? null;

        if (
          !freshUser ||
          !freshUser.isActive ||
          !freshUser.passwordHash ||
          freshUser.passwordHash !== user.passwordHash ||
          freshUser.sessionVersion !== user.sessionVersion
        ) {
          throw new Error("CREDENTIALS_INVALIDATED");
        }

        // 2. Perform conditional atomic update matching exact original hash and version
        const updateResult = await tx.user.updateMany({
          where: {
            id: user.id,
            passwordHash: user.passwordHash,
            sessionVersion: user.sessionVersion,
          },
          data: {
            passwordHash: newHash,
            mustChangePassword: false,
            sessionVersion: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new Error("CREDENTIALS_INVALIDATED");
        }

        const freshSessionVersion = freshUser.sessionVersion + 1;

        // Revoke all existing sessions for this user
        await tx.session.deleteMany({
          where: { userId: user.id },
        });

        // Create rotated session
        await tx.session.create({
          data: {
            id: hashedId,
            userId: user.id,
            sessionVersion: freshSessionVersion,
            csrfToken,
            expiresAt,
          },
        });
      });

      setSessionCookie(res, rawToken);

      res.status(200).json({
        message: "Password changed successfully",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: false,
        },
      });
    } catch (err: any) {
      if (err.message === "CREDENTIALS_INVALIDATED") {
        res.status(400).json({
          error: "Validation failed",
          details: { currentPassword: "Incorrect current password" },
        });
        return;
      }
      res.status(500).json({ error: "Unable to update password. Please try again." });
    }
  },
);

// ---------------------------------------------------------------------------
// 2.4 POST /api/auth/logout
// ---------------------------------------------------------------------------
authRouter.post("/logout", async (req: Request, res: Response): Promise<void> => {
  if (req.session) {
    try {
      await getPrisma().session.delete({
        where: { id: req.session.id },
      });
    } catch (err: any) {
      // P2025: Record to delete does not exist (already deleted / idempotent) -> safe to treat as 204
      if (err?.code !== "P2025") {
        res.status(500).json({ error: "Unable to complete logout. Please try again." });
        return;
      }
    }
  }

  clearSessionCookie(res);
  res.status(204).end();
});
