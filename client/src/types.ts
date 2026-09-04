export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  department: string;
  isActive?: boolean;
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
export type TicketStatus = "NEW" | "IN_PROGRESS" | "RESOLVED";

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
  attachments?: Attachment[];
}
