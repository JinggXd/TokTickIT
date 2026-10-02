import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../src/api.js", () => ({
  fetchTicketDetail: vi.fn(),
  fetchPublicComments: vi.fn(),
  postPublicComment: vi.fn(),
  markAppearsResolved: vi.fn(),
  fetchCategories: vi.fn().mockResolvedValue([]),
  fetchRelatedSystems: vi.fn().mockResolvedValue([]),
  fetchActionsTaken: vi.fn().mockResolvedValue({ ticketId: 101, actions: [] }),
}));

import { RequesterTicketDetail } from "../../src/pages/RequesterTicketDetail.js";
import * as api from "../../src/api.js";

const mockTicketDetail: api.TicketDetail = {
  id: 101,
  ticketNo: "TKT-2026-000101",
  summary: "VPN Disconnection issues",
  description: "VPN disconnects every 10 minutes.",
  categoryName: "Network",
  relatedSystemName: "Corporate VPN",
  requestedPriority: "MEDIUM",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  ticketOwnerName: "Alex Staff",
  requesterId: 1,
  createdAt: "2026-08-29T10:00:00.000Z",
  updatedAt: "2026-08-29T10:00:00.000Z",
  appearsResolvedAt: null,
  appearsResolvedById: null,
  attachments: [],
};

const mockComments: api.CommentItem[] = [
  {
    id: 1,
    body: "We have updated the VPN server configuration.",
    createdAt: "2026-08-29T11:00:00.000Z",
    author: {
      id: 2,
      name: "Alex Staff",
      role: "IT_STAFF",
    },
  },
];

describe("RequesterTicketDetail P10 Features (Public Comments & Problem Appears Resolved)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(mockTicketDetail);
    vi.mocked(api.fetchPublicComments).mockResolvedValue(mockComments);
  });

  it("renders public comments panel and loads existing comments", async () => {
    render(
      <RequesterTicketDetail
        ticketId={101}
        requesterId={1}
        requesterName="Somchai Prasert"
        onBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("public-comments-panel")).toBeInTheDocument();
      expect(screen.getByText("We have updated the VPN server configuration.")).toBeInTheDocument();
      expect(screen.getAllByText("Alex Staff").length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText("IT Staff")).toBeInTheDocument();
    });
  });

  it("allows submitting a new public comment", async () => {
    const user = userEvent.setup();
    vi.mocked(api.postPublicComment).mockResolvedValueOnce({
      id: 2,
      body: "Thanks, it seems more stable now.",
      createdAt: new Date().toISOString(),
      author: { id: 1, name: "Somchai Prasert", role: "REQUESTER" },
    });

    render(
      <RequesterTicketDetail
        ticketId={101}
        requesterId={1}
        requesterName="Somchai Prasert"
        onBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("public-comment-input")).toBeInTheDocument();
    });

    const input = screen.getByTestId("public-comment-input");
    await user.type(input, "Thanks, it seems more stable now.");

    const submitBtn = screen.getByTestId("submit-public-comment-btn");
    expect(submitBtn).toBeEnabled();
    await user.click(submitBtn);

    expect(api.postPublicComment).toHaveBeenCalledWith(101, "Thanks, it seems more stable now.");
  });

  it("renders Problem Appears Resolved button when status allows it and handles click", async () => {
    const user = userEvent.setup();
    vi.mocked(api.markAppearsResolved).mockResolvedValueOnce({
      id: 101,
      ticketNo: "TKT-2026-000101",
      appearsResolvedAt: new Date().toISOString(),
    });

    render(
      <RequesterTicketDetail
        ticketId={101}
        requesterId={1}
        requesterName="Somchai Prasert"
        onBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("appears-resolved-btn")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("appears-resolved-btn"));
    expect(api.markAppearsResolved).toHaveBeenCalledWith(101);
  });

  it("displays banner when ticket is already marked as appears resolved", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValueOnce({
      ...mockTicketDetail,
      appearsResolvedAt: "2026-08-29T12:00:00.000Z",
      appearsResolvedById: 1,
    });

    render(
      <RequesterTicketDetail
        ticketId={101}
        requesterId={1}
        requesterName="Somchai Prasert"
        onBack={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("appears-resolved-banner")).toBeInTheDocument();
      expect(screen.queryByTestId("appears-resolved-btn")).not.toBeInTheDocument();
    });
  });
});
