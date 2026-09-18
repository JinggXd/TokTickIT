import argon2 from "argon2";

export const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19456 KiB
  timeCost: 2,
  parallelism: 1,
  hashLength: 32,
};

/**
 * Hash password using Argon2id per OWASP minimum profile (api-spec.md §2.6).
 * memoryCost: 19456 KiB, timeCost: 2, parallelism: 1, hashLength: 32
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { ...ARGON2_OPTIONS, raw: false });
}

/**
 * Verify password against stored Argon2id hash using timing-safe comparison.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!storedHash || !storedHash.startsWith("$argon2")) {
    return false;
  }
  try {
    return await argon2.verify(storedHash, password);
  } catch {
    return false;
  }
}

/**
 * Validate new password constraints (AC-06, BR-03, UNIT-01):
 * - Length: 12-128 Unicode code points (preserves whitespace and Unicode without trimming or normalizing)
 * - Confirmation must match
 * - Must differ from current password if provided
 */
export function validateNewPassword(
  newPassword: unknown,
  confirmPassword: unknown,
  currentPassword?: string,
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (typeof newPassword !== "string") {
    errors.newPassword = "New password must be between 12 and 128 characters";
  } else {
    const codePointLength = Array.from(newPassword).length;
    if (codePointLength < 12 || codePointLength > 128) {
      errors.newPassword = "New password must be between 12 and 128 characters";
    }
  }

  if (typeof confirmPassword !== "string" || confirmPassword !== newPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  if (
    typeof newPassword === "string" &&
    currentPassword !== undefined &&
    newPassword === currentPassword
  ) {
    errors.newPassword = "New password must be different from current password";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
