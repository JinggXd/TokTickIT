import React, { useState } from "react";
import {
  AttachmentItem,
  uploadAttachment,
  downloadAttachment,
  softRemoveAttachment,
} from "../api.js";

interface AttachmentSectionProps {
  ticketId: number;
  requesterId: number;
  initialAttachments?: AttachmentItem[];
}

interface UploadingFile {
  tempId: string;
  fileName: string;
  fileSize: number;
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentSection({
  ticketId,
  requesterId,
  initialAttachments = [],
}: AttachmentSectionProps): React.JSX.Element {
  const [attachments, setAttachments] = useState<AttachmentItem[]>(initialAttachments);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    setAttachments(initialAttachments);
  }, [initialAttachments]);

  // Soft-remove modal/dialog state
  const [removingAttachmentId, setRemovingAttachmentId] = useState<number | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Active attachments count: items without removedAt
  const activeCount = attachments.filter((a) => a.removedAt === null).length;
  const isLimitReached = activeCount >= 5;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();

    // Client-side validation
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setErrorMessage("Only JPG, JPEG, PNG, WEBP, and PDF files are allowed");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage("File exceeds the 5 MB size limit");
      e.target.value = "";
      return;
    }

    if (isLimitReached) {
      setErrorMessage("This ticket already has 5 active attachments");
      e.target.value = "";
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const uploadingItem: UploadingFile = {
      tempId,
      fileName: file.name,
      fileSize: file.size,
    };

    setUploadingFiles((prev) => [...prev, uploadingItem]);
    e.target.value = "";

    try {
      const createdAttachment = await uploadAttachment(ticketId, file, requesterId);
      setAttachments((prev) => [...prev, createdAttachment]);
    } catch (err: any) {
      setErrorMessage(err.message || "Unable to upload attachment. Please try again.");
    } finally {
      setUploadingFiles((prev) => prev.filter((u) => u.tempId !== tempId));
    }
  };

  const handleDownload = async (attachment: AttachmentItem) => {
    try {
      const { blob, fileName } = await downloadAttachment(attachment.id, requesterId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      // If server returns 410 Gone, transition attachment to Unavailable state
      if (err.status === 410) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === attachment.id
              ? {
                  ...a,
                  removedAt: new Date().toISOString(),
                  removalReason: a.removalReason || "This attachment has been removed and cannot be downloaded",
                }
              : a
          )
        );
      } else {
        alert(err.message || "Unable to download attachment.");
      }
    }
  };

  const openRemoveDialog = (id: number) => {
    setRemovingAttachmentId(id);
    setRemovalReason("");
    setRemovalError(null);
  };

  const closeRemoveDialog = () => {
    setRemovingAttachmentId(null);
    setRemovalReason("");
    setRemovalError(null);
  };

  const handleConfirmRemove = async () => {
    const trimmed = removalReason.trim();
    if (trimmed.length < 3 || trimmed.length > 200) {
      setRemovalError("Reason must be between 3 and 200 characters");
      return;
    }

    if (!removingAttachmentId) return;

    setIsRemoving(true);
    setRemovalError(null);

    try {
      const res = await softRemoveAttachment(removingAttachmentId, trimmed, requesterId);
      setAttachments((prev) =>
        prev.map((a) =>
          a.id === removingAttachmentId
            ? { ...a, removedAt: res.removedAt, removalReason: res.removalReason }
            : a
        )
      );
      closeRemoveDialog();
    } catch (err: any) {
      setRemovalError(err.message || "Unable to remove attachment.");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="card card-zen mt-4" data-testid="attachment-section">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <h5 className="mb-0 fw-bold" style={{ color: "var(--zg-text-primary)" }}>
          Attachment Management
        </h5>
        <span
          className="badge rounded-pill"
          style={{
            backgroundColor: "var(--zg-pale-green)",
            color: "var(--zg-primary)",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          ({activeCount}/5 Active)
        </span>
      </div>

      <div className="card-body p-4">
        {/* Upload Control */}
        <div className="mb-4">
          <label
            htmlFor="ticket-attachment-input"
            className="form-label fw-semibold"
            style={{ color: "var(--zg-text-primary)" }}
          >
            Upload Attachment
          </label>
          <input
            id="ticket-attachment-input"
            type="file"
            className="form-control form-control-zen"
            aria-label="Upload attachment"
            onChange={handleFileSelect}
            disabled={isLimitReached}
            accept=".jpg,.jpeg,.png,.webp,.pdf"
          />
          <div className="form-text" style={{ color: "var(--zg-text-muted)" }}>
            Max 5 MB per file. Allowed formats: JPG, JPEG, PNG, WEBP, PDF.
            {isLimitReached && (
              <span className="text-danger ms-2 fw-semibold">
                Maximum 5 active attachments reached.
              </span>
            )}
          </div>

          {errorMessage && (
            <div className="alert alert-danger py-2 px-3 mt-2" role="alert" style={{ fontSize: "0.9rem" }}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Attachment List */}
        {attachments.length === 0 && uploadingFiles.length === 0 ? (
          <p className="text-muted mb-0 fst-italic">No attachments for this ticket.</p>
        ) : (
          <ul className="list-group list-group-flush border-top">
            {/* Persisted Attachments */}
            {attachments.map((item) => {
              const isRemoved = item.removedAt !== null;

              return (
                <li
                  key={item.id}
                  className="list-group-item px-0 py-3 d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2"
                >
                  <div className="flex-grow-1 overflow-hidden" style={{ minWidth: 0, maxWidth: "100%" }}>
                    <div className="d-flex align-items-center gap-2 overflow-hidden" style={{ minWidth: 0 }}>
                      <span
                        className={`text-truncate ${
                          isRemoved
                            ? "text-decoration-line-through text-muted fw-semibold"
                            : "fw-semibold"
                        }`}
                        style={{ color: isRemoved ? undefined : "var(--zg-text-primary)", maxWidth: "100%" }}
                        title={item.fileName}
                      >
                        {item.fileName}
                      </span>
                      <span className="text-muted text-nowrap flex-shrink-0" style={{ fontSize: "0.85rem" }}>
                        ({formatFileSize(item.fileSize)})
                      </span>
                    </div>

                    {isRemoved && item.removalReason && (
                      <div
                        className="mt-1"
                        style={{ color: "var(--zg-error)", fontSize: "0.85rem" }}
                      >
                        Removal reason: {item.removalReason}
                      </div>
                    )}
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    {isRemoved ? (
                      <span
                        className="badge"
                        style={{
                          backgroundColor: "#E2E8F0",
                          color: "#64748B",
                          fontWeight: 500,
                          fontSize: "0.85rem",
                          padding: "6px 10px",
                        }}
                      >
                        Unavailable
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary-zen px-3"
                          onClick={() => handleDownload(item)}
                        >
                          Download
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger px-3"
                          onClick={() => openRemoveDialog(item.id)}
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}

            {/* In-Flight Uploading Files */}
            {uploadingFiles.map((up) => (
              <li
                key={up.tempId}
                className="list-group-item px-0 py-3 d-flex justify-content-between align-items-center gap-2"
              >
                <div className="d-flex align-items-center gap-2 overflow-hidden" style={{ minWidth: 0 }}>
                  <span className="spinner-border spinner-border-sm text-success flex-shrink-0" role="status" />
                  <span className="fw-semibold text-muted text-truncate" title={up.fileName}>{up.fileName}</span>
                  <span className="badge bg-light text-secondary border flex-shrink-0">Uploading...</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Soft-Remove Confirmation Modal */}
      {removingAttachmentId !== null && (
        <div
          className="modal d-block"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content card-zen">
              <div className="modal-header border-bottom">
                <h5 className="modal-title fw-bold" style={{ color: "var(--zg-text-primary)" }}>
                  Remove Attachment
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={closeRemoveDialog}
                  disabled={isRemoving}
                />
              </div>
              <div className="modal-body">
                <p className="mb-2" style={{ color: "var(--zg-text-primary)" }}>
                  Please provide a reason for removing this attachment (3–200 characters):
                </p>
                <textarea
                  className="form-control form-control-zen"
                  placeholder="Reason for removing this attachment..."
                  value={removalReason}
                  onChange={(e) => {
                    setRemovalReason(e.target.value);
                    if (removalError) setRemovalError(null);
                  }}
                  rows={3}
                  disabled={isRemoving}
                />
                {removalError && (
                  <div className="text-danger mt-2 fw-semibold" style={{ fontSize: "0.85rem" }}>
                    {removalError}
                  </div>
                )}
              </div>
              <div className="modal-footer border-top">
                <button
                  type="button"
                  className="btn btn-secondary-zen"
                  onClick={closeRemoveDialog}
                  disabled={isRemoving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmRemove}
                  disabled={isRemoving}
                >
                  {isRemoving ? "Removing..." : "Confirm Remove"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AttachmentSection;
