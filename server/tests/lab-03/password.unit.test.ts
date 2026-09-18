import { describe, it, expect } from "vitest";
import { validateNewPassword, hashPassword, verifyPassword } from "../../src/utils/password.js";

describe("UNIT-01: Password validation and hashing unit tests (AC-06, BR-03)", () => {
  it("rejects password shorter than 12 Unicode code points", () => {
    const res = validateNewPassword("Short1!", "Short1!", "OldPassword123!");
    expect(res.isValid).toBe(false);
    expect(res.errors.newPassword).toBe("New password must be between 12 and 128 characters");
  });

  it("rejects password longer than 128 Unicode code points", () => {
    const longPass = "a".repeat(129);
    const res = validateNewPassword(longPass, longPass, "OldPassword123!");
    expect(res.isValid).toBe(false);
    expect(res.errors.newPassword).toBe("New password must be between 12 and 128 characters");
  });

  it("accepts exactly 12 and 128 code points including spaces and multi-byte Unicode", () => {
    const pass12 = "Password 12 "; // 12 characters including spaces
    expect(Array.from(pass12).length).toBe(12);
    const res12 = validateNewPassword(pass12, pass12, "OldPassword123!");
    expect(res12.isValid).toBe(true);

    const emojiPass = "🔐".repeat(12); // 12 emoji code points
    expect(Array.from(emojiPass).length).toBe(12);
    const resEmoji = validateNewPassword(emojiPass, emojiPass, "OldPassword123!");
    expect(resEmoji.isValid).toBe(true);

    const pass128 = "a".repeat(128);
    const res128 = validateNewPassword(pass128, pass128, "OldPassword123!");
    expect(res128.isValid).toBe(true);
  });

  it("rejects when confirmPassword does not match newPassword", () => {
    const res = validateNewPassword("ValidPass1234!", "Mismatch1234!", "OldPassword123!");
    expect(res.isValid).toBe(false);
    expect(res.errors.confirmPassword).toBe("Passwords do not match");
  });

  it("rejects when newPassword is identical to currentPassword", () => {
    const same = "SamePassword123!";
    const res = validateNewPassword(same, same, same);
    expect(res.isValid).toBe(false);
    expect(res.errors.newPassword).toBe("New password must be different from current password");
  });

  it("correctly hashes and verifies passwords using Argon2id", async () => {
    const pass = "SecureP@ssw0rd2026!";
    const hash = await hashPassword(pass);
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
    expect(await verifyPassword(pass, hash)).toBe(true);
    expect(await verifyPassword("WrongPassword123!", hash)).toBe(false);
  });
});
