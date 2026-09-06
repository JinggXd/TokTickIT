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
const MAX_INT4 = 2147483647;

export async function requireRequester(
  req: AuthenticatedRequesterRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const headerVal = req.header("X-Requester-Id");

  // 1. Missing header entirely -> 401 Unauthorized
  if (headerVal === undefined || headerVal === null) {
    res.status(401).json({ error: "Requester context is missing or invalid" });
    return;
  }

  const trimmed = headerVal.trim();

  // 2. Empty header -> 400 Bad Request
  if (trimmed === "") {
    res.status(400).json({ error: "Bad Request: Malformed X-Requester-Id header" });
    return;
  }

  // 3. Validate format: must be a positive integer (e.g. "1", "2")
  // Reject negative numbers, floats, non-numeric strings, 0
  const isPositiveInt = /^[1-9]\d*$/.test(trimmed);
  if (!isPositiveInt) {
    res.status(400).json({ error: "Bad Request: Malformed X-Requester-Id header" });
    return;
  }

  // 4. Prevent integer overflow on DB query:
  // PostgreSQL INT4 range max is 2,147,483,647.
  // Any positive integer exceeding MAX_INT4 cannot match any RequesterUser.id in the DB.
  // Returning 401 Unauthorized directly avoids a DB crash (500) from Prisma/PostgreSQL.
  if (trimmed.length > 10 || Number(trimmed) > MAX_INT4) {
    res.status(401).json({ error: "Requester context is missing or invalid" });
    return;
  }

  const requesterId = parseInt(trimmed, 10);

  // 5. Query database for active Requester
  try {
    const user = await getPrisma().requesterUser.findUnique({
      where: { id: requesterId },
    });

    // 6. Nonexistent or inactive -> 401 Unauthorized
    if (!user || !user.isActive) {
      res.status(401).json({ error: "Requester context is missing or invalid" });
      return;
    }

    // 7. Valid active requester -> attach to request object
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
