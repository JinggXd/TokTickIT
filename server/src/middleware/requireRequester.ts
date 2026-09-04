import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";

export interface AuthenticatedRequesterRequest extends Request {
  requester?: {
    id: number;
    name: string;
    email: string;
    department: string;
    isActive: boolean;
  };
}

/**
 * Shared Middleware: Validates X-Requester-Id header (BR-06, api-spec.md Section 2).
 * - Missing: 401 Unauthorized
 * - Malformed (non-positive integer, letters, floats): 400 Bad Request (flat error, no details)
 * - Nonexistent / Inactive user: 401 Unauthorized
 * - Valid active user: attaches req.requester and passes to next()
 */
export async function requireRequester(
  req: AuthenticatedRequesterRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const headerVal = req.header("X-Requester-Id");

  // 1. Missing header -> 401 Unauthorized
  if (headerVal === undefined || headerVal === null || headerVal === "") {
    res.status(401).json({ error: "Requester context is missing or invalid" });
    return;
  }

  // 2. Validate format: must be a positive integer (e.g. "1", "2")
  // Reject negative numbers, floats, non-numeric strings, 0
  const isPositiveInt = /^[1-9]\d*$/.test(headerVal.trim());
  if (!isPositiveInt) {
    res.status(400).json({ error: "Bad Request: Malformed X-Requester-Id header" });
    return;
  }

  const requesterId = parseInt(headerVal.trim(), 10);

  // 3. Query database for active Requester
  try {
    const user = await getPrisma().requesterUser.findUnique({
      where: { id: requesterId },
    });

    // 4. Nonexistent or inactive -> 401 Unauthorized
    if (!user || !user.isActive) {
      res.status(401).json({ error: "Requester context is missing or invalid" });
      return;
    }

    // 5. Valid active requester -> attach to request object
    req.requester = {
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      isActive: user.isActive,
    };

    next();
  } catch (error) {
    res.status(500).json({ error: "Database error during authentication" });
  }
}
