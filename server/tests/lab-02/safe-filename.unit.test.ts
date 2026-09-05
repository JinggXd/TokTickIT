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

  it("UNIT-05: flags MIME / magic bytes mismatch detector (BR-19)", () => {
    // 1. Valid files with matching magic bytes
    const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const validPng = validateAttachmentType("image.png", "image/png", validPngBuffer);
    expect(validPng.isValid).toBe(true);

    const validPdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const validPdf = validateAttachmentType("document.pdf", "application/pdf", validPdfBuffer);
    expect(validPdf.isValid).toBe(true);

    const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const validJpeg = validateAttachmentType("photo.jpg", "image/jpeg", validJpegBuffer);
    expect(validJpeg.isValid).toBe(true);

    // 2. Spoofed extension: named .jpg but magic bytes are PDF (%PDF)
    const spoofedPdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const spoofedJpgResult = validateAttachmentType("fake_photo.jpg", "image/jpeg", spoofedPdfBuffer);
    expect(spoofedJpgResult.isValid).toBe(false);
    expect(spoofedJpgResult.error).toMatch(/mismatch/i);

    // 3. Spoofed extension: named .png but magic bytes are JPEG (FF D8 FF)
    const spoofedJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    const spoofedPngResult = validateAttachmentType("fake_image.png", "image/png", spoofedJpegBuffer);
    expect(spoofedPngResult.isValid).toBe(false);
    expect(spoofedPngResult.error).toMatch(/mismatch/i);

    // 4. Empty or short file (< 4 bytes) must be rejected
    const emptyBuffer = Buffer.alloc(0);
    const emptyResult = validateAttachmentType("empty.pdf", "application/pdf", emptyBuffer);
    expect(emptyResult.isValid).toBe(false);

    const shortBuffer = Buffer.from([0x25, 0x50]); // 2 bytes
    const shortResult = validateAttachmentType("short.pdf", "application/pdf", shortBuffer);
    expect(shortResult.isValid).toBe(false);
    expect(shortResult.error).toMatch(/too short|empty/i);

    const oneBytePng = Buffer.from([0x89]); // 1 byte
    const oneByteResult = validateAttachmentType("one.png", "image/png", oneBytePng);
    expect(oneByteResult.isValid).toBe(false);
    expect(oneByteResult.error).toMatch(/too short|empty/i);
  });
});
