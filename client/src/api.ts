import type { RequesterUser } from "./types.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export interface Category {
  id: number;
  name: string;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

// Issue 2 + Issue 4 — call the backend.
// Steps: fetch `${API_URL}/api/health`; if not ok, throw.
//        then fetch `${API_URL}/api/categories`; if not ok, throw.
//        return { online: true, categories }.
// Throwing on failure lets the UI show a single Offline/error state.
export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }
  // TODO(Issue 4): also fetch `${API_URL}/api/categories` and return real categories here.
  const categoriesRes = await fetch(`${API_URL}/api/categories`);
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
  const response = await fetch(`${API_URL}/api/categories`);
  if (!response.ok) {
    throw new Error("Unable to load categories. Please try again.");
  }
  return response.json();
}

export interface RelatedSystem {
  id: number;
  name: string;
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const response = await fetch(`${API_URL}/api/related-systems`);
  if (!response.ok) {
    throw new Error("Unable to load related systems. Please try again.");
  }
  return response.json();
}

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
  requestedPriority: "LOW" | "MEDIUM" | "HIGH";
  itPriority: "LOW" | "MEDIUM" | "HIGH";
  currentStatus: "NEW" | "IN_PROGRESS" | "RESOLVED";
  requesterId: number;
  createdAt: string;
}

export async function createTicket(
  payload: CreateTicketPayload,
  requesterId: number
): Promise<CreatedTicket> {
  const response = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Requester-Id": String(requesterId),
    },
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

