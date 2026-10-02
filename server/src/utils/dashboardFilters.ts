import { TicketStatus } from "@prisma/client";

export const OPEN_STATUSES: TicketStatus[] = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
export const ACTIVE_STATUSES: TicketStatus[] = [...OPEN_STATUSES, "RESOLVED"];
export const recentCutoff = () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
