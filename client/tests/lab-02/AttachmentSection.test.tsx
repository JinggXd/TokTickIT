import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AttachmentSection from "../../src/components/AttachmentSection.js";
import * as api from "../../src/api.js";

const sampleAttachments: api.AttachmentItem[] = [
  {
    id: 1,
    fileName: "active_report.pdf",
    fileSize: 102400, // 100 KB
    mimeType: "application/pdf",
    removedAt: null,
    removalReason: null,
    createdAt: "2026-08-29T10:01:00.000Z",
  },
  {
    id: 2,
    fileName: "wrong_screenshot.png",
    fileSize: 204800, // 200 KB
    mimeType: "image/png",
    removedAt: "2026-08-29T11:00:00.000Z",
    removalReason: "Uploaded wrong screenshot",
    createdAt: "2026-08-29T10:05:00.000Z",
  },
];

describe("AttachmentSection (UI-08, UI-09, UI-16)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // UI-08: Soft-removed attachment presentation
  // -------------------------------------------------------------------------
  it("UI-08: soft-removed attachment renders with strikethrough, removal reason, and no download button", () => {
    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        initialAttachments={sampleAttachments}
      />
    );

    // Active file has download and remove buttons
    expect(screen.getByText("active_report.pdf")).toBeInTheDocument();
    const downloadBtns = screen.getAllByRole("button", { name: /download/i });
    expect(downloadBtns).toHaveLength(1);

    // Removed file
    const removedFileText = screen.getByText("wrong_screenshot.png");
    expect(removedFileText).toBeInTheDocument();
    expect(removedFileText).toHaveClass("text-decoration-line-through");

    // Removal reason displayed
    expect(screen.getByText(/uploaded wrong screenshot/i)).toBeInTheDocument();

    // Unavailable label present
    expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // UI-09: Attachment counter (X/5 Active) and file picker disabling
  // -------------------------------------------------------------------------
  it("UI-09: displays (1/5 Active) and disables file picker when 5 active attachments exist", () => {
    const { rerender } = render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        initialAttachments={sampleAttachments}
      />
    );

    // 1 active file (id: 1), 1 removed file (id: 2) -> (1/5 Active)
    expect(screen.getByText(/\(1\/5 Active\)/i)).toBeInTheDocument();

    const fileInput = screen.getByLabelText(/upload attachment/i, { selector: "input" });
    expect(fileInput).not.toBeDisabled();

    // Now supply 5 active attachments
    const fiveActive: api.AttachmentItem[] = Array.from({ length: 5 }, (_, i) => ({
      id: i + 10,
      fileName: `file_${i + 1}.pdf`,
      fileSize: 50000,
      mimeType: "application/pdf",
      removedAt: null,
      removalReason: null,
      createdAt: new Date().toISOString(),
    }));

    rerender(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        initialAttachments={fiveActive}
      />
    );

    expect(screen.getByText(/\(5\/5 Active\)/i)).toBeInTheDocument();
    expect(fileInput).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // UI-16: Uploading state & 410 Gone handling
  // -------------------------------------------------------------------------
  it("UI-16: uploading state shows progress indicator with no actions", async () => {
    let resolveUpload: (val: any) => void;
    const uploadPromise = new Promise((resolve) => {
      resolveUpload = resolve;
    });

    vi.spyOn(api, "uploadAttachment").mockReturnValueOnce(uploadPromise as any);

    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        initialAttachments={[]}
      />
    );

    const fileInput = screen.getByLabelText(/upload attachment/i, { selector: "input" });
    const file = new File(["dummy content"], "new_upload.pdf", { type: "application/pdf" });
    await userEvent.upload(fileInput, file);

    // Should show uploading indicator and no Download / Remove buttons for this row
    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    expect(screen.getByText("new_upload.pdf")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();

    // Resolve upload
    resolveUpload!({
      id: 99,
      ticketId: 101,
      fileName: "new_upload.pdf",
      fileSize: 1000,
      mimeType: "application/pdf",
      removedAt: null,
      removalReason: null,
      createdAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.queryByText(/uploading/i)).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /download/i })).toBeInTheDocument();
    });
  });

  it("UI-16: server 410 on download turns active file into Unavailable with no download button", async () => {
    const goneError: any = new Error("This attachment has been removed and cannot be downloaded");
    goneError.status = 410;
    vi.spyOn(api, "downloadAttachment").mockRejectedValueOnce(goneError);

    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        initialAttachments={[sampleAttachments[0]]}
      />
    );

    const downloadBtn = screen.getByRole("button", { name: /download/i });
    await userEvent.click(downloadBtn);

    // Row should transition to Unavailable, filename strikethrough, and Download button gone
    await waitFor(() => {
      expect(screen.getByText(/unavailable/i)).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /download/i })).not.toBeInTheDocument();
      expect(screen.getByText("active_report.pdf")).toHaveClass("text-decoration-line-through");
    });
  });

  it("handles soft removal with reason dialog", async () => {
    vi.spyOn(api, "softRemoveAttachment").mockResolvedValueOnce({
      id: 1,
      removedAt: new Date().toISOString(),
      removalReason: "Outdated diagnostic data",
    });

    render(
      <AttachmentSection
        ticketId={101}
        requesterId={1}
        initialAttachments={[sampleAttachments[0]]}
      />
    );

    const removeBtn = screen.getByRole("button", { name: /remove/i });
    await userEvent.click(removeBtn);

    // Removal reason input modal/prompt appears
    expect(screen.getByText(/remove attachment/i)).toBeInTheDocument();
    const reasonInput = screen.getByPlaceholderText(/reason for removing/i);

    // Try short reason (< 3 chars)
    await userEvent.type(reasonInput, "no");
    const confirmBtn = screen.getByRole("button", { name: /confirm remove/i });
    await userEvent.click(confirmBtn);
    expect(screen.getByText(/reason must be between 3 and 200 characters/i)).toBeInTheDocument();

    // Type valid reason
    await userEvent.clear(reasonInput);
    await userEvent.type(reasonInput, "Outdated diagnostic data");
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/outdated diagnostic data/i)).toBeInTheDocument();
      expect(screen.getByText("active_report.pdf")).toHaveClass("text-decoration-line-through");
    });
  });
});
