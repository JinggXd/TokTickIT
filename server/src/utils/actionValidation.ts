import crypto from "node:crypto";

export function validateActionDateTime(rawDate: any): { valid: boolean; date?: Date; error?: string } {
  if (rawDate === undefined || rawDate === null || rawDate === "") {
    return { valid: true, date: new Date() };
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
  const followUpRequired = Boolean(body.followUpRequired);
  return {
    actionDateTime: body.actionDateTime ? new Date(body.actionDateTime).toISOString() : null,
    actionDescription: (body.actionDescription || "").trim(),
    status: body.status === "PENDING" ? "PENDING" : "COMPLETED",
    result: body.result ? body.result.trim() : null,
    assigneeId: typeof body.assigneeId === "number" ? body.assigneeId : null,
    followUpRequired,
    followUpNote: followUpRequired && body.followUpNote ? body.followUpNote.trim() : null,
    attachmentNotes: body.attachmentNotes ? body.attachmentNotes.trim() : null,
  };
}

export function computeRequestPayloadHash(body: any): string {
  const normalized = normalizeActionPayload(body);
  return crypto.createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}
