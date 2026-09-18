import crypto from "node:crypto";
import { getPrisma } from "../prisma.js";
import { hashPassword } from "./password.js";

export interface ProvisionUserOptions {
  email?: string;
  userId?: number;
  temporaryPassword?: string;
}

export interface ProvisionedUserResult {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  mustChangePassword: boolean;
  temporaryPassword: string;
}

/**
 * Local provisioning helper for unprovisioned legacy or new accounts (Specification §7.2 Rule 6, MIG-04).
 *
 * Rules:
 * - Accepts per-user temporary secrets at runtime.
 * - Restricted strictly and atomically to unprovisioned accounts where passwordHash is null.
 *   Throws an error if the user already has a provisioned password to prevent accidental reset.
 * - Invalidates all active sessions for the user atomically.
 * - Validates secret length (12-128 Unicode code points) or generates a secure random 16-character temporary secret.
 * - Computes Argon2id hash using standard OWASP profile.
 * - Updates user with passwordHash and sets mustChangePassword: true.
 * - Never prints or commits plaintext secrets to console or disk.
 */
export async function provisionUserCredentials(
  options: ProvisionUserOptions,
  prismaClient?: any
): Promise<ProvisionedUserResult> {
  const prisma = prismaClient || getPrisma();
  const { email, userId, temporaryPassword } = options;

  if (!email && (userId === undefined || userId === null)) {
    throw new Error("Either email or userId must be specified for credential provisioning.");
  }

  const user = await prisma.user.findFirst({
    where: {
      ...(email ? { email: { equals: email.trim(), mode: "insensitive" } } : {}),
      ...(userId !== undefined && userId !== null ? { id: userId } : {}),
    },
  });

  if (!user) {
    throw new Error(`User not found for provisioning (${email ? `email: ${email}` : `id: ${userId}`}).`);
  }

  if (user.passwordHash !== null) {
    throw new Error(
      `Cannot provision credentials: user ${user.email} already has a provisioned password hash. Provisioning helper is strictly restricted to accounts with passwordHash: null. To reset credentials, use the administrator credential reset workflow.`
    );
  }

  let secret = temporaryPassword;
  if (secret === undefined || secret === null) {
    // Generate a secure 16-character random temporary secret
    secret = `Temp-${crypto.randomBytes(8).toString("hex")}!`;
  }

  const codePointLength = Array.from(secret).length;
  if (codePointLength < 12 || codePointLength > 128) {
    throw new Error("Temporary password must be between 12 and 128 Unicode characters (code points).");
  }

  const passwordHash = await hashPassword(secret);

  // Atomically update only if passwordHash is still null (prevents race-condition overwrites)
  // and revoke existing sessions within a transaction
  return await prisma.$transaction(async (tx: any) => {
    const updateResult = await tx.user.updateMany({
      where: {
        id: user.id,
        passwordHash: null,
      },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    if (updateResult.count === 0) {
      throw new Error(
        `Cannot provision credentials: user ${user.email} already has a provisioned password hash or was concurrently provisioned.`
      );
    }

    // Invalidate any existing sessions for this user
    await tx.session.deleteMany({
      where: { userId: user.id },
    });

    const updated = await tx.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    });

    // Never console.log or persist plaintext secret to disk
    return {
      ...updated,
      temporaryPassword: secret,
    };
  });
}
