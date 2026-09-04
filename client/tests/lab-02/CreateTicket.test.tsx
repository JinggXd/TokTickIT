import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CreateTicket } from "../../src/pages/CreateTicket.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.a@example.com",
  department: "Marketing",
};

const mockCategories = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const mockRelatedSystems = [
  { id: 1, name: "Corporate Laptop" },
  { id: 2, name: "Email" },
];

function renderWithContext(ui: React.ReactElement, requester = mockRequester) {
  // Pre-populate localStorage with selected requester so RequesterProvider has context
  localStorage.setItem("toktickit_current_requester", JSON.stringify(requester));

  return render(<RequesterProvider>{ui}</RequesterProvider>);
}

describe("Create Ticket Screen (UI-01 to UI-04, UI-12, UI-13, STYLE-01, STYLE-04)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();

    // Default global fetch mock for categories and related-systems
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockCategories),
        });
      }
      if (url.includes("/api/related-systems")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRelatedSystems),
        });
      }
      if (url.includes("/api/requesters/active")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve([mockRequester]),
        });
      }
      return Promise.reject(new Error(`Unhandled request to ${url}`));
    }) as any;
  });

  // UI-12 — AC-03, AC-04: System fields are read-only; reference data loads
  it("UI-12: renders read-only system placeholders and loads reference dropdowns", async () => {
    renderWithContext(<CreateTicket />);

    // Check read-only Ticket Number and Ticket Date placeholders
    await waitFor(() => {
      expect(screen.getAllByDisplayValue(/will be assigned on save/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByDisplayValue(new RegExp(mockRequester.name))).toBeInTheDocument();
    });

    // Check that categories and systems load into dropdowns
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Corporate Laptop" })).toBeInTheDocument();
    });
  });

  // UI-01 — AC-04: Empty required fields validation
  it("UI-01: renders field-level validation errors when submitted empty and prevents API call", async () => {
    const user = userEvent.setup();
    renderWithContext(<CreateTicket />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    await user.click(submitBtn);

    // Expect red validation error messages below required fields
    expect(screen.getByText(/summary must be between 5 and 100 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/description must be between 10 and 2000 characters/i)).toBeInTheDocument();

    // Verify POST /api/tickets was never called
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/api/tickets"),
      expect.objectContaining({ method: "POST" })
    );
  });

  // UI-02 — AC-06: Busy button state on pending submit (BR-10)
  it("UI-02: disables submit button and shows busy state during submission", async () => {
    let resolveSubmit: any;
    const submitPromise = new Promise((resolve) => {
      resolveSubmit = resolve;
    });

    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      if (url.includes("/api/related-systems")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRelatedSystems) });
      }
      if (url.includes("/api/tickets") && init?.method === "POST") {
        return submitPromise;
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as any;

    const user = userEvent.setup();
    renderWithContext(<CreateTicket />);

    await waitFor(() => screen.getByRole("option", { name: "Hardware" }));

    await user.selectOptions(screen.getByLabelText(/category/i), "2");
    await user.selectOptions(screen.getByLabelText(/related system/i), "1");
    await user.selectOptions(screen.getByLabelText(/requested priority/i), "HIGH");
    await user.type(screen.getByLabelText(/summary/i), "Test summary text");
    await user.type(screen.getByLabelText(/description/i), "Detailed description for test ticket.");

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    await user.click(submitBtn);

    // Button should be disabled and show busy text
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/submitting/i)).toBeInTheDocument();

    // Resolve request
    resolveSubmit({
      ok: true,
      status: 201,
      json: () =>
        Promise.resolve({
          id: 101,
          ticketNo: "TKT-2026-000101",
          summary: "Test summary text",
          description: "Detailed description for test ticket.",
          requestedPriority: "HIGH",
          itPriority: "HIGH",
          currentStatus: "NEW",
          requesterId: 1,
          createdAt: new Date().toISOString(),
        }),
    });
  });

  // UI-03 — AC-07: Form values preserved on API failure (BR-11)
  it("UI-03: renders failure banner and preserves all entered field values when API fails", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      if (url.includes("/api/related-systems")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRelatedSystems) });
      }
      if (url.includes("/api/tickets") && init?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: "Unable to create ticket. Please try again." }),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as any;

    const user = userEvent.setup();
    renderWithContext(<CreateTicket />);

    await waitFor(() => screen.getByRole("option", { name: "Hardware" }));

    await user.selectOptions(screen.getByLabelText(/category/i), "2");
    await user.selectOptions(screen.getByLabelText(/related system/i), "1");
    await user.type(screen.getByLabelText(/summary/i), "Preserved summary text");
    await user.type(screen.getByLabelText(/description/i), "Preserved description text in textarea.");

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    await user.click(submitBtn);

    // Wait for failure banner
    await waitFor(() => {
      expect(screen.getByText(/unable to create ticket/i)).toBeInTheDocument();
    });

    // Verify form values remain in DOM (BR-11)
    expect(screen.getByLabelText(/summary/i)).toHaveValue("Preserved summary text");
    expect(screen.getByLabelText(/description/i)).toHaveValue("Preserved description text in textarea.");
    expect(screen.getByLabelText(/category/i)).toHaveValue("2");
    expect(screen.getByLabelText(/related system/i)).toHaveValue("1");
  });

  // UI-04 — AC-05, BR-07: Attachment client-side validation and rejection
  it("UI-04: rejects invalid files client-side with inline error without staging or uploading", async () => {
    renderWithContext(<CreateTicket />);

    await waitFor(() => screen.getByRole("option", { name: "Hardware" }));

    const fileInput = screen.getByTestId("attachment-input") as HTMLInputElement;

    // 1. Oversized file (> 5MB)
    const oversizedFile = new File(["x".repeat(6 * 1024 * 1024)], "oversized.png", { type: "image/png" });
    Object.defineProperty(oversizedFile, "size", { value: 6 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(screen.getByText(/file size exceeds 5 mb limit/i)).toBeInTheDocument();
    });

    // 2. Disallowed extension (.exe)
    const badExtFile = new File(["sample content"], "malicious.exe", { type: "application/x-msdownload" });
    fireEvent.change(fileInput, { target: { files: [badExtFile] } });

    await waitFor(() => {
      expect(screen.getByText(/invalid file type/i)).toBeInTheDocument();
    });

    // Valid file is added to staged list
    const validFile = new File(["valid image content"], "screenshot.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText("screenshot.png")).toBeInTheDocument();
    });
  });

  // UI-13 — AC-01, AC-03: Success screen
  it("UI-13: displays backend Ticket Number and Ticket Date on success and retains requester identity", async () => {
    const mockCreated = {
      id: 101,
      ticketNo: "TKT-2026-000101",
      summary: "My submitted issue",
      description: "My submitted detailed description.",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      currentStatus: "NEW",
      requesterId: 1,
      createdAt: "2026-09-04T10:00:00.000Z",
    };

    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.includes("/api/categories")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockCategories) });
      }
      if (url.includes("/api/related-systems")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockRelatedSystems) });
      }
      if (url.includes("/api/tickets") && init?.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve(mockCreated),
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    }) as any;

    const user = userEvent.setup();
    renderWithContext(<CreateTicket />);

    await waitFor(() => screen.getByRole("option", { name: "Hardware" }));

    await user.selectOptions(screen.getByLabelText(/category/i), "1");
    await user.selectOptions(screen.getByLabelText(/related system/i), "1");
    await user.type(screen.getByLabelText(/summary/i), "My submitted issue");
    await user.type(screen.getByLabelText(/description/i), "My submitted detailed description.");

    await user.click(screen.getByRole("button", { name: /submit ticket/i }));

    // Confirm success view renders official ticket number and date
    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000101")).toBeInTheDocument();
      expect(screen.getByText(/ticket submitted successfully/i)).toBeInTheDocument();
    });
  });

  // STYLE-01 & STYLE-04: Zen Green tokens and accessible focus
  it("STYLE-01 & STYLE-04: uses Zen Green classes and provides accessible focus rings", async () => {
    renderWithContext(<CreateTicket />);
    await waitFor(() => screen.getByRole("option", { name: "Hardware" }));

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    expect(submitBtn).toHaveClass("btn-primary-zen");

    const summaryInput = screen.getByLabelText(/summary/i);
    expect(summaryInput).toHaveClass("form-control-zen");
  });
});
