import { describe, it, expect } from "vitest";
import { sanitizeFileName, validateAttachmentType } from "../../src/utils/safeFilename.js";

describe("Safe Filename & MIME Sanitizer Unit Tests (BR-19, Section 5)", () => {
  it("UNIT-04: strips path traversal, collapses special characters, and preserves extensions", () => {
    // 1. Path traversal characters (/, \, ..) must be rejected
    expect(() => sanitizeFileName("../../etc/passwd.jpg")).toThrow(/Path traversal/);
    expect(() => sanitizeFileName("folder/nested\\file.png")).toThrow(/Path traversal/);
    expect(() => sanitizeFileName("..\\..\\secret.pdf")).toThrow(/Path traversal/);

    // 2. Special characters collapsed to safe format with timestamp & random prefix
    const result = sanitizeFileName("my report (final)!!.pdf");
    expect(result.sanitizedOriginalName).toBe("my_report_final_.pdf");
    expect(result.diskFileName).toMatch(/^\d+-[a-f0-9]{6}-my_report_final_\.pdf$/);

    // 3. Name truncation to 100 chars while preserving extension
    const veryLongName = "a".repeat(150) + ".png";
    const truncatedResult = sanitizeFileName(veryLongName);
    expect(truncatedResult.sanitizedOriginalName.length).toBeLessThanOrEqual(104); // 100 chars base + .png
    expect(truncatedResult.sanitizedOriginalName.endsWith(".png")).toBe(true);
  });

  it("UNIT-05: verifies allowed extensions and flags MIME / magic bytes mismatch", () => {
    // Valid PNG file (PNG magic bytes: 89 50 4E 47)
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const validPng = validateAttachmentType("image.png", "image/png", validPngBuffer);
    expect(validPng.isValid).toBe(true);

    // Valid PDF file (%PDF magic bytes: 25 50 44 46)
    const validPdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const validPdf = validateAttachmentType("document.pdf", "application/pdf", validPdfBuffer);
    expect(validPdf.isValid).toBe(true);

    // Disallowed extension (e.g. .exe)
    const exeResult = validateAttachmentType("program.exe", "application/x-msdownload");
    expect(exeResult.isValid).toBe(false);
    expect(exeResult.error).toBe("Only JPG, JPEG, PNG, WEBP, and PDF files are allowed");

    // Spoofed extension: named .jpg but magic bytes are PDF
    const spoofedBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]); // PDF magic bytes
    const spoofedResult = validateAttachmentType("fake_photo.jpg", "image/jpeg", spoofedBuffer);
    expect(spoofedResult.isValid).toBe(false);
    expect(spoofedResult.error).toMatch(/mismatch/i);
  });
});
