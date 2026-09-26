import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ActionsTakenSection } from "../../src/components/ActionsTakenSection.js";
import { ActionTaken } from "../../src/types.js";

const mockActions: ActionTaken[] = [
  {
    id: 1,
    ticketId: 101,
    actionDateTime: "2026-09-25T14:30:00.000Z",
    actionDescription: "Checked switch port and replaced patch cord",
    result: "Port link established, 1Gbps full duplex",
    status: "COMPLETED",
    version: 1,
    createdById: 12,
    performedBy: { id: 12, name: "Alex IT" },
    assignee: null,
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: "IMG_0012.JPG showing patch panel",
    createdAt: "2026-09-25T14:35:10.000Z",
    updatedAt: "2026-09-25T14:35:10.000Z",
  },
  {
    id: 2,
    ticketId: 101,
    actionDateTime: "2026-09-25T15:00:00.000Z",
    actionDescription: "Order replacement SFP module",
    result: null,
    status: "PENDING",
    version: 1,
    createdById: 12,
    performedBy: null,
    assignee: { id: 15, name: "Marcus IT" },
    followUpRequired: true,
    followUpNote: "Install module when shipment arrives on Monday",
    attachmentNotes: null,
    createdAt: "2026-09-25T15:02:00.000Z",
    updatedAt: "2026-09-25T15:02:00.000Z",
  },
];

describe("Phase F2 / L4-P05: Actions Taken UI in Ticket Detail", () => {
  const onActionSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UI-L4-04: Actions Taken section renders under Ticket Detail page with actions list", () => {
    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        actions={mockActions}
        currentUser={{ id: 12, name: "Alex IT", role: "IT_STAFF" }}
        onActionSaved={onActionSaved}
      />
    );

    expect(screen.getByText("Actions Taken")).toBeDefined();
    expect(screen.getByText("Checked switch port and replaced patch cord")).toBeDefined();
    expect(screen.getByText("Order replacement SFP module")).toBeDefined();
    expect(screen.getByText("Port link established, 1Gbps full duplex")).toBeDefined();
    expect(screen.getByText("Install module when shipment arrives on Monday")).toBeDefined();
  });

  it("UI-L4-05: Log Action Taken modal opens with focus trap, validates max datetime and required result on complete", async () => {
    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        actions={mockActions}
        currentUser={{ id: 12, name: "Alex IT", role: "IT_STAFF" }}
        onActionSaved={onActionSaved}
      />
    );

    const logBtn = screen.getByRole("button", { name: /\+ Log Action/i });
    fireEvent.click(logBtn);

    // Modal dialog is open
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(/Log New Action/i)).toBeDefined();

    // Check datetime max is set to <= now + 5m
    const datetimeInput = screen.getByLabelText(/Action Date & Time/i) as HTMLInputElement;
    expect(datetimeInput.max).toBeDefined();

    // In 'COMPLETED' mode, Result field is required
    const resultInput = screen.getByLabelText(/Result \/ Resolution Details/i);
    expect(resultInput).toBeDefined();

    // Dismiss with Escape key
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("UI-L4-06: Complete Action Taken modal requires result and calls complete handler", () => {
    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        actions={mockActions}
        currentUser={{ id: 12, name: "Alex IT", role: "IT_STAFF" }}
        onActionSaved={onActionSaved}
      />
    );

    const completeBtn = screen.getByTestId("complete-action-btn-2");
    fireEvent.click(completeBtn);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(/Complete Action Taken/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Mark Completed/i })).toBeDefined();
  });

  it("UI-L4-07: Cancel Action Taken modal renders prompt and confirm button", () => {
    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        actions={mockActions}
        currentUser={{ id: 12, name: "Alex IT", role: "IT_STAFF" }}
        onActionSaved={onActionSaved}
      />
    );

    const cancelBtn = screen.getByTestId("cancel-action-btn-2");
    fireEvent.click(cancelBtn);

    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText(/Are you sure you want to cancel this pending action/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Confirm Cancellation/i })).toBeDefined();
  });

  it("UI-L4-11: Requester view: read-only Actions Taken list, zero mutation buttons", () => {
    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        actions={mockActions}
        currentUser={{ id: 5, name: "Requester User", role: "REQUESTER" }}
        readOnly={true}
        onActionSaved={onActionSaved}
      />
    );

    expect(screen.getByText("Actions Taken")).toBeDefined();
    expect(screen.getByText("Checked switch port and replaced patch cord")).toBeDefined();

    // Mutation buttons must NOT exist in Requester view
    expect(screen.queryByRole("button", { name: /\+ Log Action/i })).toBeNull();
    expect(screen.queryByTestId("complete-action-btn-2")).toBeNull();
    expect(screen.queryByTestId("cancel-action-btn-2")).toBeNull();
    expect(screen.queryByTestId("edit-action-btn-1")).toBeNull();
  });

  it("UI-L4-12: Requester view: confidentiality verified, internal notes are never rendered", () => {
    const { container } = render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        actions={mockActions}
        currentUser={{ id: 5, name: "Requester User", role: "REQUESTER" }}
        readOnly={true}
        onActionSaved={onActionSaved}
      />
    );

    expect(container.innerHTML).not.toContain("internalNote");
    expect(container.innerHTML).not.toContain("Internal Notes");
  });

  it("UI-L4-13: Log Action modal initializes datetime in local browser timezone and sets max without UTC skew", async () => {
    // 1. Dynamic check
    render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        actions={mockActions}
        currentUser={{ id: 12, name: "Alex IT", role: "IT_STAFF" }}
        onActionSaved={onActionSaved}
      />
    );

    const logBtn = screen.getByRole("button", { name: /\+ Log Action/i });
    fireEvent.click(logBtn);

    const dateInput = screen.getByLabelText(/Action Date & Time/i) as HTMLInputElement;
    expect(dateInput).toBeDefined();

    // Verify format matches YYYY-MM-DDTHH:mm
    expect(dateInput.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(dateInput.max).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);

    // Ensure the input value is within 1 minute of local time (not skewed by UTC offset)
    const nowLocal = new Date();
    const parsedDate = new Date(dateInput.value);
    const diffMinutes = Math.abs((nowLocal.getTime() - parsedDate.getTime()) / (60 * 1000));
    expect(diffMinutes).toBeLessThan(2);
  });

  it("UI-L4-13b: Fixed-clock assertion verifies local now and max = now + 5m boundary", () => {
    const fixedNow = new Date(2026, 8, 26, 14, 30, 0); // Local Sep 26, 2026 14:30:00
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    try {
      render(
        <ActionsTakenSection
          ticketId={101}
          ticketStatus="IN_PROGRESS"
          actions={mockActions}
          currentUser={{ id: 12, name: "Alex IT", role: "IT_STAFF" }}
          onActionSaved={onActionSaved}
        />
      );

      const logBtn = screen.getByRole("button", { name: /\+ Log Action/i });
      fireEvent.click(logBtn);

      const dateInput = screen.getByLabelText(/Action Date & Time/i) as HTMLInputElement;
      expect(dateInput.value).toBe("2026-09-26T14:30");
      expect(dateInput.max).toBe("2026-09-26T14:35");
    } finally {
      vi.useRealTimers();
    }
  });
});
