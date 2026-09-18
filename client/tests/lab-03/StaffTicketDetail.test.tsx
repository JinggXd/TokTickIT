import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../src/api.js", () => ({
  fetchStaffTicketDetail: vi.fn(),
  fetchAdminTicketDetail: vi.fn(),
  fetchTicketOwners: vi.fn(),
  fetchPublicComments: vi.fn(),
  fetchInternalNotes: vi.fn(),
  postPublicComment: vi.fn(),
  postInternalNote: vi.fn(),
  downloadAttachment: vi.fn(),
  claimTicket: vi.fn(),
  reassignTicket: vi.fn(),
  updateItPriority: vi.fn(),
  updateTicketStatus: vi.fn(),
}));

import { StaffTicketDetail } from "../../src/pages/StaffTicketDetail.js";
import * as api from "../../src/api.js";

const mockTicketDetail = {
  id: 1,
  ticketNo: "TKT-2024-0001",
  summary: "Cannot login to portal",
  description: "User cannot access the ERP portal.",
  requester: { id: 10, name: "Alice", email: "alice@test.local", department: "HR" },
  category: { id: 1, name: "Access" },
  relatedSystem: { id: 1, name: "ERP" },
  requestedPriority: "HIGH" as const,
  itPriority: "MEDIUM" as const,
  currentStatus: "NEW" as const,
  ticketOwner: null,
  version: 1,
  appearsResolvedAt: null,
  appearsResolvedById: null,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  attachments: [],
};

describe("StaffTicketDetail UI Tests (UI-06, UI-07, UI-08)", () => {
  beforeEach(() => {
    vi.mocked(api.fetchTicketOwners).mockResolvedValue([
      { id: 20, name: "Bob Staff", role: "IT_STAFF" as const },
    ]);
    vi.mocked(api.fetchPublicComments).mockResolvedValue([]);
    vi.mocked(api.fetchInternalNotes).mockResolvedValue([]);
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue(mockTicketDetail);
  });

  describe("UI-06: Staff Detail renders read-only info vs operational panels", () => {
    it("renders loading state initially", () => {
      vi.mocked(api.fetchStaffTicketDetail).mockReturnValue(new Promise(() => {}));
      render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
      expect(screen.getByTestId("staff-detail-loading")).toBeInTheDocument();
    });

    it("renders ticket details after load", async () => {
      render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByTestId("staff-ticket-detail-page")).toBeInTheDocument();
        expect(screen.getByTestId("staff-detail-ticket-no")).toHaveTextContent("TKT-2024-0001");
        expect(screen.getByText("Cannot login to portal")).toBeInTheDocument();
        expect(screen.getByText("Alice")).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it("renders operational actions panel", async () => {
      render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByTestId("staff-operations-panel")).toBeInTheDocument();
        expect(screen.getByTestId("staff-claim-ticket-btn")).toBeInTheDocument();
        expect(screen.getByTestId("staff-it-priority-select")).toBeInTheDocument();
        expect(screen.getByTestId("staff-status-select")).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it("renders error state on load failure", async () => {
      vi.mocked(api.fetchStaffTicketDetail).mockRejectedValue(new Error("Not found"));
      render(<StaffTicketDetail ticketId={999} onBack={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByTestId("staff-detail-error")).toBeInTheDocument();
      }, { timeout: 4000 });
    });
  });

  describe("UI-07: Status dropdown shows permitted transitions", () => {
    it("shows OPEN and CANCELLED (but not RESOLVED) as valid next states from NEW", async () => {
      render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
      await waitFor(() => screen.getByTestId("staff-status-select"), { timeout: 4000 });

      const select = screen.getByTestId("staff-status-select") as HTMLSelectElement;
      const options = Array.from(select.options).map(o => o.value).filter(Boolean);
      expect(options).toContain("OPEN");
      expect(options).toContain("CANCELLED");
      expect(options).not.toContain("RESOLVED");
    });

    it("disables status select when ticket is in terminal CLOSED status", async () => {
      vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue({ ...mockTicketDetail, currentStatus: "CLOSED" as const });
      render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
      await waitFor(() => {
        const select = screen.getByTestId("staff-status-select") as HTMLSelectElement;
        expect(select).toBeDisabled();
      }, { timeout: 4000 });
    });
  });

  describe("UI-08: Public comments and internal notes panels", () => {
    it("renders both panels with text areas and submit buttons", async () => {
      render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByTestId("public-comments-panel")).toBeInTheDocument();
        expect(screen.getByTestId("internal-notes-panel")).toBeInTheDocument();
        expect(screen.getByTestId("public-comment-input")).toBeInTheDocument();
        expect(screen.getByTestId("internal-note-input")).toBeInTheDocument();
      }, { timeout: 4000 });
    });

    it("shows existing public comments in the panel", async () => {
      vi.mocked(api.fetchPublicComments).mockResolvedValue([
        { id: 1, author: { id: 20, name: "Bob Staff", role: "IT_STAFF" as const }, body: "Working on it.", createdAt: "2024-01-02T00:00:00Z" },
      ]);
      render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByTestId("public-comments-panel")).toHaveTextContent("Working on it.");
      }, { timeout: 4000 });
    });

    it("shows existing internal notes in the panel", async () => {
      vi.mocked(api.fetchInternalNotes).mockResolvedValue([
        { id: 1, author: { id: 20, name: "Bob Staff", role: "IT_STAFF" as const }, body: "Internal note here.", createdAt: "2024-01-02T00:00:00Z" },
      ]);
      render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
      await waitFor(() => {
        expect(screen.getByTestId("internal-notes-panel")).toHaveTextContent("Internal note here.");
      }, { timeout: 4000 });
    });

    it("submit-public-comment-btn is disabled when input is empty", async () => {
      render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} />);
      await waitFor(() => screen.getByTestId("submit-public-comment-btn"), { timeout: 4000 });
      expect(screen.getByTestId("submit-public-comment-btn")).toBeDisabled();
    });

    it("back button calls onBack callback", async () => {
      const onBack = vi.fn();
      render(<StaffTicketDetail ticketId={1} onBack={onBack} />);
      await waitFor(() => screen.getByTestId("staff-back-to-queue-btn"), { timeout: 4000 });
      await userEvent.click(screen.getByTestId("staff-back-to-queue-btn"));
      expect(onBack).toHaveBeenCalled();
    });

    it("renders read-only mode without operational panels or comment forms (AC-28, AC-37)", async () => {
      vi.mocked(api.fetchAdminTicketDetail).mockResolvedValue(mockTicketDetail);
      render(<StaffTicketDetail ticketId={1} onBack={vi.fn()} readOnly={true} />);
      await waitFor(() => {
        expect(screen.getByTestId("staff-detail-ticket-no")).toHaveTextContent("TKT-2024-0001");
      }, { timeout: 4000 });

      expect(api.fetchAdminTicketDetail).toHaveBeenCalledWith(1);
      expect(screen.queryByTestId("staff-operations-panel")).not.toBeInTheDocument();
      expect(screen.queryByTestId("public-comment-input")).not.toBeInTheDocument();
      expect(screen.queryByTestId("internal-note-input")).not.toBeInTheDocument();
      expect(screen.getByTestId("public-comments-panel")).toBeInTheDocument();
      expect(screen.getByTestId("internal-notes-panel")).toBeInTheDocument();
    });
  });
});
