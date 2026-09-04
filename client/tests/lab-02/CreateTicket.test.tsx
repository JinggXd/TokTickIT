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

  // UI-02 — AC-06: Busy button and read-only/disabled form state during submit (BR-10, Finding 5)
  it("UI-02: disables submit button and all form controls during pending submission", async () => {
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

    const categorySelect = screen.getByLabelText(/category/i);
    const systemSelect = screen.getByLabelText(/related system/i);
    const prioritySelect = screen.getByLabelText(/requested priority/i);
    const summaryInput = screen.getByLabelText(/summary/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const attachmentInput = screen.getByTestId("attachment-input");

    await user.selectOptions(categorySelect, "2");
    await user.selectOptions(systemSelect, "1");
    await user.selectOptions(prioritySelect, "HIGH");
    await user.type(summaryInput, "Test summary text");
    await user.type(descriptionInput, "Detailed description for test ticket.");

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    await user.click(submitBtn);

    // Form inputs and submit button must be disabled during submission (Finding 5)
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/submitting/i)).toBeInTheDocument();
    expect(categorySelect).toBeDisabled();
    expect(systemSelect).toBeDisabled();
    expect(prioritySelect).toBeDisabled();
    expect(summaryInput).toBeDisabled();
    expect(descriptionInput).toBeDisabled();
    expect(attachmentInput).toBeDisabled();

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

    await waitFor(() => {
      expect(screen.getByTestId("success-ticket-no")).toHaveTextContent("TKT-2026-000101");
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

  // UI-04 — AC-05, BR-07: Attachment client-side validation, exact copies, and rejection (Finding 4)
  it("UI-04: rejects invalid files with exact spec copy without staging or uploading", async () => {
    renderWithContext(<CreateTicket />);

    await waitFor(() => screen.getByRole("option", { name: "Hardware" }));

    const fileInput = screen.getByTestId("attachment-input") as HTMLInputElement;

    // 1. Oversized file (> 5MB) -> "File exceeds the 5 MB size limit."
    const oversizedFile = new File(["x".repeat(6 * 1024 * 1024)], "oversized.png", { type: "image/png" });
    Object.defineProperty(oversizedFile, "size", { value: 6 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(screen.getByText("⚠️ File exceeds the 5 MB size limit.")).toBeInTheDocument();
    });
    expect(screen.queryByText("oversized.png")).not.toBeInTheDocument();

    // 2. Disallowed extension (.exe) -> "Only JPG, JPEG, PNG, WEBP, and PDF files are allowed."
    const badExtFile = new File(["sample content"], "malicious.exe", { type: "application/x-msdownload" });
    fireEvent.change(fileInput, { target: { files: [badExtFile] } });

    await waitFor(() => {
      expect(screen.getByText("⚠️ Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.")).toBeInTheDocument();
    });
    expect(screen.queryByText("malicious.exe")).not.toBeInTheDocument();

    // 3. Extensionless file (e.g. "image_png") -> must be rejected
    const dotlessFile = new File(["sample content"], "image_png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [dotlessFile] } });

    await waitFor(() => {
      expect(screen.getByText("⚠️ Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.")).toBeInTheDocument();
    });
    expect(screen.queryByText("image_png")).not.toBeInTheDocument();

    // 4. Valid file is added to staged list
    const validFile = new File(["valid image content"], "screenshot.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(screen.getByText("screenshot.png")).toBeInTheDocument();
    });

    // 5. Exceeding 5 active files -> "This ticket already has 5 active attachments."
    const extraFiles = [
      new File(["1"], "doc1.pdf", { type: "application/pdf" }),
      new File(["2"], "doc2.pdf", { type: "application/pdf" }),
      new File(["3"], "doc3.pdf", { type: "application/pdf" }),
      new File(["4"], "doc4.pdf", { type: "application/pdf" }),
      new File(["5"], "doc5.pdf", { type: "application/pdf" }), // 1 + 5 = 6 > 5
    ];
    fireEvent.change(fileInput, { target: { files: extraFiles } });

    await waitFor(() => {
      expect(screen.getByText("⚠️ This ticket already has 5 active attachments.")).toBeInTheDocument();
    });

    // Verify NO upload/network call was made during file selection in Phase 3
    expect(globalThis.fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/attachments"),
      expect.anything()
    );
  });

  // UI-13 — AC-01, AC-03: Success screen with ticketNo headline, date, and requester (Finding 7)
  it("UI-13: displays backend Ticket Number as headline, Ticket Date, and retains requester identity", async () => {
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

    // Confirm success view renders official ticket number as headline (Finding 7)
    await waitFor(() => {
      expect(screen.getByTestId("success-ticket-no")).toHaveTextContent("TKT-2026-000101");
    });

    // Confirm ticket date and requester identity assertions
    expect(screen.getByTestId("success-ticket-date")).toHaveTextContent(
      new Date(mockCreated.createdAt).toLocaleString()
    );
    expect(screen.getByTestId("success-requester")).toHaveTextContent(
      `${mockRequester.name} (${mockRequester.department})`
    );
  });

  // STYLE-01 & STYLE-04: Zen Green tokens and accessible focus
  it("STYLE-01 & STYLE-04: uses Zen Green classes and proves accessible keyboard tab navigation", async () => {
    const user = userEvent.setup();
    renderWithContext(<CreateTicket />);
    await waitFor(() => screen.getByRole("option", { name: "Hardware" }));

    const submitBtn = screen.getByRole("button", { name: /submit ticket/i });
    expect(submitBtn).toHaveClass("btn-primary-zen");

    const summaryInput = screen.getByLabelText(/summary/i);
    expect(summaryInput).toHaveClass("form-control-zen");

    const categorySelect = screen.getByLabelText(/category/i);
    expect(categorySelect).toHaveClass("form-select-zen");

    const systemSelect = screen.getByLabelText(/related system/i);
    expect(systemSelect).toHaveClass("form-select-zen");

    const prioritySelect = screen.getByLabelText(/requested priority/i);
    expect(prioritySelect).toHaveClass("form-select-zen");

    const descriptionInput = screen.getByLabelText(/description/i);
    expect(descriptionInput).toHaveClass("form-control-zen");

    // Readonly fields have readonly attribute and are skipped from tab order via tabIndex={-1}
    const readOnlyFields = screen.getAllByDisplayValue(/will be assigned on save/i);
    for (const field of readOnlyFields) {
      expect(field).toHaveAttribute("readonly");
      expect(field).toHaveAttribute("tabindex", "-1");
    }

    // Keyboard Tab navigation (STYLE-04)
    await user.tab();
    expect(document.activeElement).toBe(categorySelect);

    await user.tab();
    expect(document.activeElement).toBe(systemSelect);

    await user.tab();
    expect(document.activeElement).toBe(prioritySelect);

    await user.tab();
    expect(document.activeElement).toBe(summaryInput);

    await user.tab();
    expect(document.activeElement).toBe(descriptionInput);
  });
});
