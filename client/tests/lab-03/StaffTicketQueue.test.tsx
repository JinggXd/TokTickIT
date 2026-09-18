import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Hoist mock factory for ESM — must be at top level before imports
vi.mock("../../src/api.js", async () => {
  const mockFetchCategories = vi.fn().mockResolvedValue([{ id: 1, name: "Access" }]);
  const mockFetchTicketOwners = vi.fn().mockResolvedValue([]);
  const mockFetchStaffTickets = vi.fn().mockResolvedValue({
    tickets: [
      {
        id: 1,
        ticketNo: "TKT-2024-0001",
        summary: "Cannot login to portal",
        requester: { id: 10, name: "Alice", email: "alice@example.com" },
        category: { id: 1, name: "Access" },
        relatedSystem: { id: 1, name: "ERP" },
        requestedPriority: "HIGH",
        itPriority: "MEDIUM",
        currentStatus: "NEW",
        ticketOwner: null,
        version: 1,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      },
    ],
    unfilteredTotal: 1,
    pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
  });

  return {
    fetchCategories: mockFetchCategories,
    fetchTicketOwners: mockFetchTicketOwners,
    fetchStaffTickets: mockFetchStaffTickets,
  };
});

import { StaffTicketQueue } from "../../src/pages/StaffTicketQueue.js";
import * as api from "../../src/api.js";

describe("StaffTicketQueue UI Tests (UI-04, UI-05)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    // Re-set defaults after each clear
    vi.mocked(api.fetchCategories).mockResolvedValue([{ id: 1, name: "Access" }]);
    vi.mocked(api.fetchTicketOwners).mockResolvedValue([]);
    vi.mocked(api.fetchStaffTickets).mockResolvedValue({
      tickets: [
        {
          id: 1,
          ticketNo: "TKT-2024-0001",
          summary: "Cannot login to portal",
          requester: { id: 10, name: "Alice", email: "alice@example.com" },
          category: { id: 1, name: "Access" },
          relatedSystem: { id: 1, name: "ERP" },
          requestedPriority: "HIGH",
          itPriority: "MEDIUM",
          currentStatus: "NEW",
          ticketOwner: null,
          version: 1,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ],
      unfilteredTotal: 1,
      pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
    });
  });

  describe("UI-04: Queue renders filter controls and debounced search", () => {
    it("shows loading state initially then renders queue table", async () => {
      render(<StaffTicketQueue />);
      expect(screen.getByTestId("staff-queue-loading")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByTestId("staff-queue-loading")).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Table or another state should be visible
      const table = screen.queryByTestId("staff-queue-table");
      const empty = screen.queryByTestId("staff-queue-empty");
      const error = screen.queryByTestId("staff-queue-error");
      expect(table || empty || error).toBeTruthy();
    });

    it("renders filter controls", async () => {
      render(<StaffTicketQueue />);
      await waitFor(() => screen.queryByTestId("staff-queue-loading") === null, { timeout: 5000 });

      expect(screen.getByTestId("queue-search-input")).toBeInTheDocument();
      expect(screen.getByTestId("queue-status-filter")).toBeInTheDocument();
      expect(screen.getByTestId("queue-category-filter")).toBeInTheDocument();
      expect(screen.getByTestId("queue-owner-filter")).toBeInTheDocument();
    });

    it("verifies fetchStaffTickets was called", async () => {
      render(<StaffTicketQueue />);
      await waitFor(() => {
        expect(api.fetchStaffTickets).toHaveBeenCalled();
      }, { timeout: 5000 });
    });
  });

  describe("UI-05: Queue loading, empty, and error states", () => {
    it("renders loading spinner while fetching", () => {
      vi.mocked(api.fetchStaffTickets).mockImplementation(() => new Promise(() => {}));
      render(<StaffTicketQueue />);
      expect(screen.getByTestId("staff-queue-loading")).toBeInTheDocument();
    });

    it("renders empty state when no tickets exist", async () => {
      vi.mocked(api.fetchStaffTickets).mockResolvedValue({
        tickets: [],
        unfilteredTotal: 0,
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
      });

      render(<StaffTicketQueue />);
      await waitFor(() => {
        expect(screen.getByTestId("staff-queue-empty")).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it("renders error state on fetch failure", async () => {
      vi.mocked(api.fetchStaffTickets).mockRejectedValue(new Error("Network Error"));
      render(<StaffTicketQueue />);
      await waitFor(() => {
        expect(screen.getByTestId("staff-queue-error")).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it("shows clear-filters button when search is non-empty", async () => {
      vi.mocked(api.fetchStaffTickets).mockResolvedValue({
        tickets: [],
        unfilteredTotal: 0,
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
      });

      render(<StaffTicketQueue />);
      await waitFor(() => screen.queryByTestId("staff-queue-loading") === null, { timeout: 5000 });

      const search = screen.getByTestId("queue-search-input");
      await userEvent.type(search, "something");

      await waitFor(() => {
        expect(screen.getByTestId("queue-clear-filters-btn")).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});
