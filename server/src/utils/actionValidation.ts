import crypto from "node:crypto";

export function validateActionDateTime(rawDate: any): { valid: boolean; date?: Date; error?: string } {
  if (rawDate === undefined || rawDate === null || rawDate === "") {
    return { valid: true, date: new Date() };
  }
  const iso = typeof rawDate === "string" && rawDate.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/,
  );
  if (!iso) return { valid: false, error: "Invalid actionDateTime format. Expected an ISO datetime with timezone." };
  const [year, month, day, hour, minute, second] = iso.slice(1).map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || (second || 0) > 59) {
    return { valid: false, error: "Invalid actionDateTime format." };
  }
  const date = new Date(rawDate);
  if (isNaN(date.getTime())) {
    return { valid: false, error: "Invalid actionDateTime format." };
  }
  // Clock skew tolerance: max 5 minutes in the future
  const maxFuture = Date.now() + 5 * 60 * 1000;
  if (date.getTime() > maxFuture) {
    return { valid: false, error: "actionDateTime cannot be more than 5 minutes in the future." };
  }
  return { valid: true, date };
}

export function isValidUUIDv4(uuid: string): boolean {
  if (typeof uuid !== "string") return false;
  const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidv4Regex.test(uuid);
}

export interface NormalizedActionPayload {
  actionDateTime: string | null;
  actionDescription: string;
  status: "COMPLETED" | "PENDING";
  result: string | null;
  assigneeId: number | null;
  followUpRequired: boolean;
  followUpNote: string | null;
  attachmentNotes: string | null;
}

export function normalizeActionPayload(body: any): NormalizedActionPayload {
  const followUpRequired = Boolean(body?.followUpRequired);

  let formattedDate: string | null = null;
  if (body?.actionDateTime) {
    const d = new Date(body.actionDateTime);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toISOString();
    } else {
      formattedDate = String(body.actionDateTime);
    }
  }

  const safeTrim = (val: any): string | null => {
    if (val === undefined || val === null) return null;
    if (typeof val === "string") return val.trim();
    return String(val).trim();
  };

  const actionDescription = typeof body?.actionDescription === "string"
    ? body.actionDescription.trim()
    : safeTrim(body?.actionDescription) || "";

  const status = body?.status === "PENDING" ? "PENDING" : "COMPLETED";

  return {
    actionDateTime: formattedDate,
    actionDescription,
    status,
    result: safeTrim(body?.result),
    assigneeId: typeof body?.assigneeId === "number" ? body.assigneeId : null,
    followUpRequired,
    followUpNote: followUpRequired ? safeTrim(body?.followUpNote) : null,
    attachmentNotes: safeTrim(body?.attachmentNotes),
  };
}

export function computeRequestPayloadHash(body: any): string {
  try {
    const normalized = normalizeActionPayload(body);
    return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
  } catch {
    return crypto.createHash("sha256").update(String(Date.now())).digest("hex");
  }
}
