import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";
import { parseCookie, hashSessionToken, SESSION_COOKIE_NAME } from "../utils/session.js";
import type { Role } from "@prisma/client";

export interface AuthenticatedUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  department: string;
  isActive: boolean;
  mustChangePassword: boolean;
  sessionVersion: number;
}

export interface AuthenticatedSession {
  id: string;
  userId: number;
  sessionVersion: number;
  csrfToken: string;
  createdAt: Date;
  expiresAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      session?: AuthenticatedSession;
      sessionToken?: string;
    }
  }
}

/**
 * Parses toktickit_session cookie and hydrates req.user and req.session if valid.
 */
export async function sessionMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const token = parseCookie(req.headers.cookie, SESSION_COOKIE_NAME);
  if (!token) {
    next();
    return;
  }

  const hashedId = hashSessionToken(token);
  try {
    const session = await getPrisma().session.findUnique({
      where: { id: hashedId },
      include: { user: true },
    });

    if (!session) {
      next();
      return;
    }

    // Check expiration (8 hours absolute)
    if (new Date() >= session.expiresAt) {
      try {
        await getPrisma().session.delete({ where: { id: hashedId } });
      } catch {}
      next();
      return;
    }

    // Check user active and sessionVersion matches
    if (!session.user.isActive || session.sessionVersion !== session.user.sessionVersion) {
      try {
        await getPrisma().session.delete({ where: { id: hashedId } });
      } catch {}
      next();
      return;
    }

    req.user = session.user;
    req.session = {
      id: session.id,
      userId: session.userId,
      sessionVersion: session.sessionVersion,
      csrfToken: session.csrfToken,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    };
    req.sessionToken = token;
  } catch {
    // If DB is temporarily unavailable, proceed unauthenticated
  }

  next();
}

/**
 * Requires an authenticated active session (HTTP 401 if missing).
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || !req.session) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

/**
 * Requires that mandatory password change has been completed (HTTP 403 if mustChangePassword === true).
 */
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.mustChangePassword) {
    res.status(403).json({
      error: "PASSWORD_CHANGE_REQUIRED",
      message: "You must change your password before accessing this resource.",
    });
    return;
  }
  next();
}

/**
 * Requires one of the specified roles (HTTP 403 if unauthorized).
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: "Access denied",
        message: "You do not have permission to perform this action.",
      });
      return;
    }
    next();
  };
}

const TRUSTED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
]);

if (process.env.CLIENT_ORIGIN) {
  TRUSTED_ORIGINS.add(process.env.CLIENT_ORIGIN);
}

export function isTrustedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return TRUSTED_ORIGINS.has(origin);
}

/**
 * CSRF protection middleware (api-spec.md §2.6):
 * - POST/PATCH/PUT/DELETE require trusted Origin AND matching X-CSRF-Token
 * - Missing or untrusted Origin on mutation is 403 CSRF_INVALID
 * - Safe GETs pass; /csrf validates Origin when present
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  // Safe HTTP methods (GET, HEAD, OPTIONS)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    // GET /api/auth/csrf validates Origin when present
    if (origin && !isTrustedOrigin(origin)) {
      res.status(403).json({
        error: "CSRF_INVALID",
        message: "Refresh the page and try again.",
      });
      return;
    }
    next();
    return;
  }

  // State-changing requests (POST, PUT, PATCH, DELETE) REQUIRE a trusted Origin
  if (!origin || !isTrustedOrigin(origin)) {
    res.status(403).json({
      error: "CSRF_INVALID",
      message: "Refresh the page and try again.",
    });
    return;
  }

  // Public login doesn't have a session CSRF token yet
  if (req.path === "/api/auth/login" || req.path === "/login") {
    next();
    return;
  }

  // If unauthenticated (no session), pass to route handler where requireAuth will return 401
  if (!req.session) {
    next();
    return;
  }

  // For authenticated state-changing requests, require X-CSRF-Token matching session csrfToken
  const providedToken = req.headers["x-csrf-token"];
  if (!providedToken || providedToken !== req.session.csrfToken) {
    res.status(403).json({
      error: "CSRF_INVALID",
      message: "Refresh the page and try again.",
    });
    return;
  }

  next();
}
