import type { RequesterUser, SafeUser, Category, RelatedSystem, Priority, TicketStatus, Ticket, Role } from "./types.js";
export type { RequesterUser, SafeUser, Category, RelatedSystem, Priority, TicketStatus, Ticket, Role };

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

let globalCsrfToken: string | null = null;

export function setGlobalCsrfToken(token: string | null): void {
  globalCsrfToken = token;
}

export function getGlobalCsrfToken(): string | null {
  return globalCsrfToken;
}

async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headersObj: Record<string, string> = {};
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((v, k) => {
        headersObj[k] = v;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([k, v]) => {
        headersObj[k] = v;
      });
    } else {
      Object.assign(headersObj, options.headers);
    }
  }
  options.credentials = "include";

  const method = options.method?.toUpperCase() || "GET";
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && globalCsrfToken) {
    if (!headersObj["X-CSRF-Token"]) {
      headersObj["X-CSRF-Token"] = globalCsrfToken;
    }
  }

  options.headers = headersObj;
  return fetch(url, options);
}

// ---------------------------------------------------------------------------
// Health & Categories
// ---------------------------------------------------------------------------
export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await apiFetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }
  const categoriesRes = await apiFetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error("Unable to load categories");
  }
  const categories: Category[] = await categoriesRes.json();
  return { online: true, categories };
}

export async function fetchActiveRequesters(): Promise<RequesterUser[]> {
  const response = await fetch(`${API_URL}/api/requesters/active`);
  if (!response.ok) {
    throw new Error("Unable to load Development Requesters. Please try again.");
  }
  return response.json();
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await apiFetch(`${API_URL}/api/categories`);
  if (!response.ok) {
    throw new Error("Unable to load categories. Please try again.");
  }
  return response.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const response = await apiFetch(`${API_URL}/api/related-systems`);
  if (!response.ok) {
    throw new Error("Unable to load related systems. Please try again.");
  }
  return response.json();
}

// ---------------------------------------------------------------------------
// Authentication Endpoints (P04 & P06)
// ---------------------------------------------------------------------------
export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: SafeUser;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await apiFetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data.message || data.error || "Invalid email or password");
    err.status = response.status;
    err.details = data.details;
    err.retryAfter = response.headers.get("Retry-After");
    throw err;
  }
  return data;
}

export async function fetchMe(): Promise<{ user: SafeUser }> {
  const response = await apiFetch(`${API_URL}/api/auth/me`);
  if (!response.ok) {
    const err: any = new Error("Authentication required");
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export async function fetchCsrf(): Promise<{ csrfToken: string }> {
  const response = await apiFetch(`${API_URL}/api/auth/csrf`);
  if (!response.ok) {
    throw new Error("Unable to fetch CSRF token");
  }
  return response.json();
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<{ message: string; user: SafeUser }> {
  const response = await apiFetch(`${API_URL}/api/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data.error || "Unable to change password");
    err.status = response.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

export async function logout(): Promise<void> {
  await apiFetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// Tickets (Requester)
// ---------------------------------------------------------------------------
export interface CreateTicketPayload {
  summary: string;
  description: string;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
}

export interface CreatedTicket {
  id: number;
  ticketNo: string;
  summary: string;
  description: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  requesterId: number;
  createdAt: string;
}

export async function createTicket(
  payload: CreateTicketPayload,
  requesterId?: number,
): Promise<CreatedTicket> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requesterId !== undefined) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  const response = await apiFetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const error: any = new Error(data.error || "Unable to create ticket. Please try again.");
    error.status = response.status;
    error.details = data.details;
    throw error;
  }
  return data;
}

export interface GetTicketsParams {
  search?: string;
  categoryId?: number | string;
  requestedPriority?: string;
  itPriority?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface TicketListItem {
  id: number;
  ticketNo: string;
  summary: string;
  categoryName: string;
  relatedSystemName: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  ticketOwnerName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationMetadata {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface TicketsResponse {
  data: TicketListItem[];
  pagination: PaginationMetadata;
}

export async function fetchMyTickets(
  params: GetTicketsParams = {},
  requesterId?: number,
): Promise<TicketsResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId && params.categoryId !== "ALL") query.set("categoryId", String(params.categoryId));
  if (params.requestedPriority && params.requestedPriority !== "ALL") query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority && params.itPriority !== "ALL") query.set("itPriority", params.itPriority);
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));

  const queryString = query.toString();
  const url = `${API_URL}/api/tickets${queryString ? `?${queryString}` : ""}`;

  const headers: Record<string, string> = {};
  if (requesterId !== undefined) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  const response = await apiFetch(url, { headers });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err: any = new Error(errorData.error || "Unable to load tickets. Please try again.");
    err.status = response.status;
    err.details = errorData.details;
    throw err;
  }
  return response.json();
}

export interface AttachmentItem {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  removedAt: string | null;
  removalReason: string | null;
  createdAt: string;
}

export interface TicketDetail {
  id: number;
  ticketNo: string;
  summary: string;
  description: string;
  categoryName: string;
  relatedSystemName: string;
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  ticketOwnerName: string;
  requesterId: number;
  createdAt: string;
  updatedAt: string;
  version?: number;
  appearsResolvedAt?: string | null;
  appearsResolvedById?: number | null;
  attachments: AttachmentItem[];
}

export async function fetchTicketDetail(id: number, requesterId?: number): Promise<TicketDetail> {
  const headers: Record<string, string> = {};
  if (requesterId !== undefined) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  const response = await apiFetch(`${API_URL}/api/tickets/${id}`, { headers });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data.error || "Unable to load ticket detail. Please try again.");
    err.status = response.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

export async function uploadAttachment(
  ticketId: number,
  file: File,
  requesterId?: number,
): Promise<AttachmentItem> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  if (requesterId !== undefined) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  const response = await apiFetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data.error || "Unable to upload attachment. Please try again.");
    err.status = response.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

export async function downloadAttachment(
  attachmentId: number,
  requesterId?: number,
): Promise<{ blob: Blob; fileName: string }> {
  const headers: Record<string, string> = {};
  if (requesterId !== undefined) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  const response = await apiFetch(`${API_URL}/api/attachments/${attachmentId}/download`, { headers });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const err: any = new Error(data.error || "Unable to download attachment.");
    err.status = response.status;
    throw err;
  }

  let fileName = "attachment";
  const disposition = response.headers.get("Content-Disposition");
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      fileName = match[1];
    }
  }

  const blob = await response.blob();
  return { blob, fileName };
}

export async function softRemoveAttachment(
  attachmentId: number,
  removalReason: string,
  requesterId?: number,
): Promise<{ id: number; removedAt: string; removalReason: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requesterId !== undefined) {
    headers["X-Requester-Id"] = String(requesterId);
  }

  const response = await apiFetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers,
    body: JSON.stringify({ removalReason }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data.error || "Unable to remove attachment. Please try again.");
    err.status = response.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

export async function markAppearsResolved(ticketId: number): Promise<any> {
  const response = await apiFetch(`${API_URL}/api/tickets/${ticketId}/appears-resolved`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data.error || "Unable to mark appears resolved.");
    err.status = response.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Phase F3: IT Staff Queue & Operations
// ---------------------------------------------------------------------------

export interface StaffTicketItem {
  id: number;
  ticketNo: string;
  summary: string;
  requester: { id: number; name: string; email: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  ticketOwner: { id: number; name: string; role: Role } | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface StaffQueueParams {
  search?: string;
  categoryId?: number | string;
  requestedPriority?: string;
  itPriority?: string;
  status?: string;
  owner?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface StaffQueueResponse {
  tickets: StaffTicketItem[];
  unfilteredTotal: number;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface TicketOwner {
  id: number;
  name: string;
  role: Role;
}

export async function fetchStaffTickets(params: StaffQueueParams = {}): Promise<StaffQueueResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search.trim());
  if (params.categoryId && params.categoryId !== "ALL") query.set("categoryId", String(params.categoryId));
  if (params.requestedPriority && params.requestedPriority !== "ALL") query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority && params.itPriority !== "ALL") query.set("itPriority", params.itPriority);
  if (params.status && params.status !== "ALL") query.set("status", params.status);
  if (params.owner && params.owner !== "ALL") query.set("owner", params.owner);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  const url = `${API_URL}/api/staff/tickets${queryString ? `?${queryString}` : ""}`;
  const response = await apiFetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err: any = new Error(errorData.error || "Unable to load staff queue. Please try again.");
    err.status = response.status;
    err.details = errorData.details;
    throw err;
  }
  return response.json();
}

export async function fetchTicketOwners(): Promise<TicketOwner[]> {
  const response = await apiFetch(`${API_URL}/api/staff/ticket-owners`);
  if (!response.ok) {
    throw new Error("Unable to load ticket owners.");
  }
  return response.json();
}

export interface AttachmentItem {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
  removedAt: string | null;
  removalReason: string | null;
}

export interface StaffTicketDetail {
  id: number;
  ticketNo: string;
  summary: string;
  description: string;
  requester: { id: number; name: string; email: string; department?: string };
  category: { id: number; name: string };
  relatedSystem: { id: number; name: string };
  requestedPriority: Priority;
  itPriority: Priority;
  currentStatus: TicketStatus;
  ticketOwner: { id: number; name: string; role: Role } | null;
  version: number;
  appearsResolvedAt: string | null;
  appearsResolvedById: number | null;
  createdAt: string;
  updatedAt: string;
  attachments: AttachmentItem[];
}

export async function fetchStaffTicketDetail(ticketId: number): Promise<StaffTicketDetail> {
  const response = await apiFetch(`${API_URL}/api/staff/tickets/${ticketId}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const err: any = new Error(data.error || "Unable to load ticket details.");
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export async function fetchAdminTicketDetail(ticketId: number): Promise<StaffTicketDetail> {
  const response = await apiFetch(`${API_URL}/api/admin/tickets/${ticketId}`);
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const err: any = new Error(data.error || "Unable to load ticket details.");
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export async function claimTicket(ticketId: number, expectedVersion: number): Promise<any> {
  const response = await apiFetch(`${API_URL}/api/staff/tickets/${ticketId}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expectedVersion }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data.message || data.error || "Unable to claim ticket.");
    err.status = response.status;
    err.error = data.error;
    err.currentVersion = data.currentVersion;
    throw err;
  }
  return data;
}

export async function reassignTicket(ticketId: number, ownerId: number, expectedVersion: number): Promise<any> {
  const response = await apiFetch(`${API_URL}/api/staff/tickets/${ticketId}/owner`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ownerId, expectedVersion }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data.message || data.error || "Unable to reassign ticket.");
    err.status = response.status;
    err.error = data.error;
    err.currentVersion = data.currentVersion;
    throw err;
  }
  return data;
}

export async function updateItPriority(ticketId: number, itPriority: Priority, expectedVersion: number): Promise<any> {
  const response = await apiFetch(`${API_URL}/api/staff/tickets/${ticketId}/it-priority`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itPriority, expectedVersion }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data.message || data.error || "Unable to update priority.");
    err.status = response.status;
    err.error = data.error;
    err.currentVersion = data.currentVersion;
    throw err;
  }
  return data;
}

export async function updateTicketStatus(ticketId: number, status: TicketStatus, expectedVersion: number): Promise<any> {
  const response = await apiFetch(`${API_URL}/api/staff/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, expectedVersion }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data.message || data.error || "Unable to update status.");
    err.status = response.status;
    err.error = data.error;
    err.currentVersion = data.currentVersion;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Phase F3: Public Comments & Internal Notes
// ---------------------------------------------------------------------------

export interface CommentItem {
  id: number;
  author: { id: number; name: string; role: Role };
  body: string;
  createdAt: string;
}

export async function fetchPublicComments(ticketId: number): Promise<CommentItem[]> {
  const response = await apiFetch(`${API_URL}/api/tickets/${ticketId}/public-comments`);
  if (!response.ok) {
    throw new Error("Unable to load comments.");
  }
  return response.json();
}

export async function postPublicComment(ticketId: number, body: string): Promise<CommentItem> {
  const response = await apiFetch(`${API_URL}/api/tickets/${ticketId}/public-comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data.error || "Unable to post comment.");
    err.status = response.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

export async function fetchInternalNotes(ticketId: number): Promise<CommentItem[]> {
  const response = await apiFetch(`${API_URL}/api/tickets/${ticketId}/internal-notes`);
  if (!response.ok) {
    throw new Error("Unable to load internal notes.");
  }
  return response.json();
}

export async function postInternalNote(ticketId: number, body: string): Promise<CommentItem> {
  const response = await apiFetch(`${API_URL}/api/tickets/${ticketId}/internal-notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err: any = new Error(data.error || "Unable to post internal note.");
    err.status = response.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

