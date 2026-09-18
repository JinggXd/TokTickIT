import crypto from "node:crypto";
import type { Request, Response } from "express";

export const SESSION_COOKIE_NAME = "toktickit_session";
export const SESSION_MAX_AGE_SECONDS = 28800; // 8 hours

/**
 * Generate a cryptographically secure 32-byte base64url session token.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/**
 * Hash raw token with SHA-256 (hex) for database primary key storage.
 * Raw cookie is never stored in DB.
 */
export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Generate a random 32-byte hex CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Parse a named cookie value from the Cookie header.
 */
export function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) {
      return decodeURIComponent(v.join("="));
    }
  }
  return null;
}

/**
 * Set the toktickit_session cookie on the response.
 */
export function setSessionCookie(
  res: Response,
  token: string,
  secure = process.env.NODE_ENV === "production",
): void {
  const flags = [
    `${SESSION_COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (secure) {
    flags.push("Secure");
  }
  res.setHeader("Set-Cookie", flags.join("; "));
}

/**
 * Clear the toktickit_session cookie on the response.
 */
export function clearSessionCookie(res: Response): void {
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`,
  );
}
