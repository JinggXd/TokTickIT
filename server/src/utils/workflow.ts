export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

export const ALL_STATUSES: TicketStatus[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};

const STATUSES_REQUIRING_OWNER = new Set<TicketStatus>([
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
]);

export function requiresEligibleOwner(status: TicketStatus): boolean {
  return STATUSES_REQUIRING_OWNER.has(status);
}

export function shouldClearAppearsResolved(targetStatus: TicketStatus): boolean {
  return targetStatus === "REOPENED";
}

export interface TransitionValidationOptions {
  hasEligibleOwner: boolean;
}

export interface TransitionValidationResult {
  isValid: boolean;
  error?: "ILLEGAL_STATUS_TRANSITION" | "ELIGIBLE_OWNER_REQUIRED";
  message?: string;
}

/**
 * Validate status transition against the 8-state lifecycle matrix (AC-32, BR-14, BR-15).
 * - 17 permitted transitions across 64 possible pairs.
 * - CANCELLED is terminal.
 * - OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, and RESOLVED require an active eligible owner.
 */
export function validateStatusTransition(
  fromStatus: TicketStatus,
  toStatus: TicketStatus,
  options: TransitionValidationOptions,
): TransitionValidationResult {
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed || !allowed.includes(toStatus)) {
    return {
      isValid: false,
      error: "ILLEGAL_STATUS_TRANSITION",
      message: `Cannot transition status from '${fromStatus}' directly to '${toStatus}'.`,
    };
  }

  if (requiresEligibleOwner(toStatus) && !options.hasEligibleOwner) {
    return {
      isValid: false,
      error: "ELIGIBLE_OWNER_REQUIRED",
      message: "Assign an active IT Staff or Administrator before this transition.",
    };
  }

  return { isValid: true };
}
