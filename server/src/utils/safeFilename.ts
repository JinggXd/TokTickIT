import crypto from "crypto";
import path from "path";

export interface SanitizeResult {
  originalName: string;
  sanitizedOriginalName: string;
  diskFileName: string;
}

export interface AttachmentValidationResult {
  isValid: boolean;
  error?: string;
  mimeType?: string;
}

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]);

const MIME_MAP: Record<string, string[]> = {
  ".jpg": ["image/jpeg", "image/jpg"],
  ".jpeg": ["image/jpeg", "image/jpg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".pdf": ["application/pdf"],
};

/**
 * Sanitizes original filename and generates safe on-disk filename (BR-19, API spec Section 5).
 */
export function sanitizeFileName(originalName: string): SanitizeResult {
  if (!originalName || typeof originalName !== "string") {
    throw new Error("Invalid filename");
  }

  // 1. Strip path component — reject /, \, and .. outright
  if (originalName.includes("/") || originalName.includes("\\") || originalName.includes("..")) {
    throw new Error("Path traversal characters detected in filename");
  }

  const ext = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, ext);

  // 2. Replace any character outside [A-Za-z0-9._-] with _
  let sanitizedBase = baseName.replace(/[^A-Za-z0-9._-]/g, "_");

  // 3. Collapse repeated _ into one
  sanitizedBase = sanitizedBase.replace(/_+/g, "_");

  // 4. Truncate base name to 100 characters preserving extension
  if (sanitizedBase.length > 100) {
    sanitizedBase = sanitizedBase.substring(0, 100);
  }

  const sanitizedOriginalName = `${sanitizedBase}${ext}`;
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(3).toString("hex");
  const diskFileName = `${timestamp}-${randomSuffix}-${sanitizedOriginalName}`;

  return {
    originalName,
    sanitizedOriginalName,
    diskFileName,
  };
}

/**
 * Validates file extension and ensures it matches MIME type and magic bytes (BR-07, Section 5).
 */
export function validateAttachmentType(
  fileName: string,
  mimeType?: string,
  buffer?: Buffer
): AttachmentValidationResult {
  const ext = path.extname(fileName).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      isValid: false,
      error: "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed",
    };
  }

  // Check MIME type match if supplied
  if (mimeType) {
    const validMimes = MIME_MAP[ext] || [];
    if (!validMimes.includes(mimeType.toLowerCase())) {
      return {
        isValid: false,
        error: `File extension ${ext} does not match provided MIME type ${mimeType}`,
      };
    }
  }

  // Check Magic bytes if buffer is supplied
  if (buffer && buffer.length >= 4) {
    // PNG: 89 50 4E 47
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    // PDF: %PDF (25 50 44 46)
    const isPdf = buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    // JPEG: FF D8 FF
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    // WEBP: RIFF....WEBP
    const isWebp =
      buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && // RIFF
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50; // WEBP

    if ((ext === ".png" && !isPng) ||
        (ext === ".pdf" && !isPdf) ||
        ((ext === ".jpg" || ext === ".jpeg") && !isJpeg) ||
        (ext === ".webp" && !isWebp)) {
      return {
        isValid: false,
        error: `File content mismatch: file bytes do not match expected format for ${ext}`,
      };
    }
  }

  return {
    isValid: true,
    mimeType: mimeType || (MIME_MAP[ext] ? MIME_MAP[ext][0] : "application/octet-stream"),
  };
}
