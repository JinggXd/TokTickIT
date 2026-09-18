export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  department: string;
  isActive?: boolean;
  role?: Role;
  mustChangePassword?: boolean;
}

export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role: Role;
  department?: string;
  mustChangePassword: boolean;
}

export interface Category {
  id: number;
  name: string;
  isActive?: boolean;
}

export interface RelatedSystem {
  id: number;
  name: string;
  isActive?: boolean;
}

export type Priority = "LOW" | "MEDIUM" | "HIGH";

export type TicketStatus =
  | "NEW"
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_REQUESTER"
  | "RESOLVED"
  | "CLOSED"
  | "REOPENED"
  | "CANCELLED";

export interface Attachment {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  removedAt: string | null;
  removalReason: string | null;
  uploader?: RequesterUser;
}

export interface Ticket {
  id: number;
  ticketNo: string;
  summary: string;
  description: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  createdAt: string;
  updatedAt: string;
  requesterId: number;
  requester?: RequesterUser;
  categoryId: number;
  category?: Category;
  relatedSystemId: number;
  relatedSystem?: RelatedSystem;
  ticketOwnerId?: number | null;
  ticketOwnerName?: string;
  version?: number;
  appearsResolvedAt?: string | null;
  appearsResolvedById?: number | null;
  attachments?: Attachment[];
}
