import crypto from "node:crypto";
import { afterAll } from "vitest";
import { getPrisma } from "../../src/prisma.js";
import { requireTestEnvironment } from "../../src/config/testEnvironment.js";
import { hashSessionToken } from "../../src/utils/session.js";

const sessions: string[] = [];
const changedUsers = new Map<number, boolean>();

// Database fixtures for business API regression tests. Login itself is tested
// through the real endpoint in auth.api.test.ts and browser authentication tests.
export async function sessionHeaders(userId?: number): Promise<Record<string, string>> {
  requireTestEnvironment();
  const prisma = getPrisma();
  const user = userId === undefined
    ? await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER", isActive: true } })
    : await prisma.user.findUnique({ where: { id: userId } });
  const headers: Record<string, string> = { Origin: "http://localhost:5173" };
  if (!user) return headers;
  if (!changedUsers.has(user.id)) changedUsers.set(user.id, user.mustChangePassword);
  await prisma.user.update({ where: { id: user.id }, data: { mustChangePassword: false } });
  const token = crypto.randomBytes(32).toString("base64url");
  const csrfToken = crypto.randomBytes(32).toString("base64url");
  const id = hashSessionToken(token);
  await prisma.session.create({ data: {
    id, csrfToken, userId: user.id, sessionVersion: user.sessionVersion,
    expiresAt: new Date(Date.now() + 3600000),
  } });
  sessions.push(id);
  return { ...headers, Cookie: `toktickit_session=${token}`, "X-CSRF-Token": csrfToken };
}

afterAll(async () => {
  const prisma = getPrisma();
  await prisma.session.deleteMany({ where: { id: { in: sessions } } });
  for (const [id, mustChangePassword] of changedUsers) {
    await prisma.user.updateMany({ where: { id }, data: { mustChangePassword } });
  }
});
