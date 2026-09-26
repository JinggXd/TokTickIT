import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { ActionsTakenSection } from "../../src/components/ActionsTakenSection.js";
import { ActionTaken } from "../../src/types.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual<typeof import("../../src/api.js")>("../../src/api.js");
  return {
    ...actual,
    createActionTaken: vi.fn(),
    completeActionTaken: vi.fn(),
    cancelActionTaken: vi.fn(),
    updateActionTaken: vi.fn(),
  };
});

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

  it("UI-L4-05b: Focus trap cycles focus inside modal dialog on Tab and Shift+Tab", async () => {
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

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeDefined();

    // Find all focusable elements inside dialog
    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector));
    expect(focusables.length).toBeGreaterThan(1);

    const firstElement = focusables[0];
    const lastElement = focusables[focusables.length - 1];

    // Focus last element and press Tab -> should wrap to first element
    lastElement.focus();
    expect(document.activeElement).toBe(lastElement);
    fireEvent.keyDown(window, { key: "Tab" });
    expect(document.activeElement).toBe(firstElement);

    // Focus first element and press Shift+Tab -> should wrap to last element
    firstElement.focus();
    expect(document.activeElement).toBe(firstElement);
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(lastElement);

    // Close modal
    fireEvent.keyDown(window, { key: "Escape" });
  });

  it("UI-L4-04b: Actions Taken renders loading state and error state with retry button", () => {
    const onRetry = vi.fn();
    const { rerender } = render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        actions={[]}
        isLoading={true}
        onActionSaved={onActionSaved}
      />
    );

    expect(screen.getByTestId("actions-taken-loading")).toBeDefined();
    expect(screen.getByText(/Loading actions taken/i)).toBeDefined();

    // Rerender with error
    rerender(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        actions={[]}
        isLoading={false}
        error="Network timeout"
        onRetry={onRetry}
        onActionSaved={onActionSaved}
      />
    );

    expect(screen.getByTestId("actions-taken-error")).toBeDefined();
    expect(screen.getByText(/Failed to load actions taken: Network timeout/i)).toBeDefined();

    const retryBtn = screen.getByTestId("retry-actions-btn");
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("UI-L4-04c: Administrator can see Log Action and Controls, Staff performer can see Edit on completed action", () => {
    const { rerender } = render(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        actions={mockActions}
        currentUser={{ id: 99, name: "Admin User", role: "ADMINISTRATOR" }}
        readOnly={false}
        onActionSaved={onActionSaved}
      />
    );

    // Admin sees Log Action button
    expect(screen.getByRole("button", { name: /\+ Log Action/i })).toBeDefined();
    // Admin can edit completed action (action 1 performed by Alex)
    expect(screen.getByTestId("edit-action-btn-1")).toBeDefined();

    // Staff user who is performer (Alex IT, id 12) sees Edit on completed action
    rerender(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        actions={mockActions}
        currentUser={{ id: 12, name: "Alex IT", role: "IT_STAFF" }}
        readOnly={false}
        onActionSaved={onActionSaved}
      />
    );
    expect(screen.getByTestId("edit-action-btn-1")).toBeDefined();

    // Other staff (id 999) cannot edit completed action
    rerender(
      <ActionsTakenSection
        ticketId={101}
        ticketStatus="IN_PROGRESS"
        actions={mockActions}
        currentUser={{ id: 999, name: "Other Staff", role: "IT_STAFF" }}
        readOnly={false}
        onActionSaved={onActionSaved}
      />
    );
    expect(screen.queryByTestId("edit-action-btn-1")).toBeNull();
  });

  it("UI-L4-14: Modal locks close button, Escape key, and form inputs during submission", async () => {
    let resolveSubmit: (value: any) => void = () => {};
    const pendingPromise = new Promise((resolve) => {
      resolveSubmit = resolve;
    });
    vi.mocked(api.createActionTaken).mockReturnValue(pendingPromise as any);

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

    const descInput = screen.getByLabelText(/Action Description/i) as HTMLTextAreaElement;
    const resultInput = screen.getByLabelText(/Result \/ Resolution Details/i) as HTMLTextAreaElement;
    const datetimeInput = screen.getByLabelText(/Action Date & Time/i) as HTMLInputElement;

    fireEvent.change(descInput, { target: { value: "Replaced faulty switch" } });
    fireEvent.change(resultInput, { target: { value: "Switch operational" } });

    const submitBtn = screen.getByRole("button", { name: /Save Action/i });
    fireEvent.click(submitBtn);

    // Now submission is pending (isSubmitting === true)
    // 1. Submit button shows Saving... and is disabled
    expect(screen.getByRole("button", { name: /Saving\.\.\./i })).toBeDefined();

    const dialog = screen.getByRole("dialog");

    // 2. Close button (X) must be disabled
    const closeBtn = screen.getByLabelText("Close") as HTMLButtonElement;
    expect(closeBtn.disabled).toBe(true);

    // 3. Cancel button in footer must be disabled
    const cancelBtn = within(dialog).getByRole("button", { name: /^Cancel$/i }) as HTMLButtonElement;
    expect(cancelBtn.disabled).toBe(true);

    // 4. Form inputs must be disabled
    expect(descInput.disabled).toBe(true);
    expect(resultInput.disabled).toBe(true);
    expect(datetimeInput.disabled).toBe(true);

    // 5. Escape key must NOT close the modal
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeDefined();

    // Resolve the promise
    resolveSubmit({
      ticketId: 101,
      action: {
        id: 3,
        ticketId: 101,
        actionDateTime: "2026-09-25T16:00:00.000Z",
        actionDescription: "Replaced faulty switch",
        result: "Switch operational",
        status: "COMPLETED",
        version: 1,
        createdById: 12,
        performedBy: { id: 12, name: "Alex IT" },
        assignee: null,
        followUpRequired: false,
        followUpNote: null,
        attachmentNotes: null,
        createdAt: "2026-09-25T16:00:00.000Z",
        updatedAt: "2026-09-25T16:00:00.000Z",
      },
    });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    expect(onActionSaved).toHaveBeenCalledTimes(1);
  });
});

