import React, { useState, useEffect, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  uploadAttachment,
  Category,
  RelatedSystem,
  CreatedTicket,
} from "../api.js";

interface CreateTicketProps {
  onSuccess?: (ticket: CreatedTicket) => void;
  onCancel?: () => void;
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES = 5;

export function CreateTicket({ onSuccess, onCancel }: CreateTicketProps) {
  const { currentRequester } = useRequester();

  // Reference data states
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [loadingRefs, setLoadingRefs] = useState<boolean>(true);
  const [refError, setRefError] = useState<string | null>(null);

  // Form field states
  const [categoryId, setCategoryId] = useState<string>("");
  const [relatedSystemId, setRelatedSystemId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // Attachments state (Client staging only for Phase 3; backend upload is Phase 5 per SKILL.md)
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submission & validation states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<CreatedTicket | null>(null);
  const [uploadedAttachments, setUploadedAttachments] = useState<Array<{ fileName: string; id: number }>>([]);
  const [failedUploads, setFailedUploads] = useState<Array<{ file: File; error: string }>>([]);
  const [isRetryingUpload, setIsRetryingUpload] = useState<Record<string, boolean>>({});
  const [isUploadingAttachments, setIsUploadingAttachments] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    currentFileName?: string;
  } | null>(null);

  // Load reference data on mount
  useEffect(() => {
    let isMounted = true;
    async function loadReferenceData() {
      setLoadingRefs(true);
      setRefError(null);
      try {
        const [cats, systems] = await Promise.all([
          fetchCategories(),
          fetchRelatedSystems(),
        ]);
        if (isMounted) {
          setCategories(cats);
          setRelatedSystems(systems);
          if (cats.length > 0) setCategoryId(String(cats[0].id));
          if (systems.length > 0) setRelatedSystemId(String(systems[0].id));
        }
      } catch (err: any) {
        if (isMounted) {
          setRefError(err.message || "Failed to load reference data.");
        }
      } finally {
        if (isMounted) {
          setLoadingRefs(false);
        }
      }
    }
    loadReferenceData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle file selection (Exact rejection messages per ui-spec.md Section 4.2)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAttachmentError(null);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (stagedFiles.length + files.length > MAX_FILES) {
      setAttachmentError("This ticket already has 5 active attachments.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const newValidFiles: File[] = [];

    for (const file of files) {
      const lastDotIndex = file.name.lastIndexOf(".");
      const ext = lastDotIndex !== -1 ? file.name.slice(lastDotIndex).toLowerCase() : "";

      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setAttachmentError("Only JPG, JPEG, PNG, WEBP, and PDF files are allowed.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setAttachmentError("File exceeds the 5 MB size limit.");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      newValidFiles.push(file);
    }

    setStagedFiles((prev) => [...prev, ...newValidFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
    setAttachmentError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Client-side validation (BR-09)
    const errors: Record<string, string> = {};
    const trimmedSummary = summary.trim();
    const trimmedDescription = description.trim();

    if (!trimmedSummary || trimmedSummary.length < 5 || trimmedSummary.length > 100) {
      errors.summary = "Summary must be between 5 and 100 characters";
    }

    if (!trimmedDescription || trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      errors.description = "Description must be between 10 and 2000 characters";
    }

    if (!categoryId) {
      errors.categoryId = "Category is required";
    }

    if (!relatedSystemId) {
      errors.relatedSystemId = "Related system is required";
    }

    if (!requestedPriority) {
      errors.requestedPriority = "Requested priority must be LOW, MEDIUM, or HIGH";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    if (!currentRequester) {
      setSubmitError("No active Requester context found.");
      return;
    }

    setIsSubmitting(true);

    try {
      const ticket = await createTicket(
        {
          summary: trimmedSummary,
          description: trimmedDescription,
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          requestedPriority,
        },
        currentRequester.id
      );

      setCreatedTicket(ticket);

      // Sequential post-create attachment uploads (BR-18, UI-18)
      if (stagedFiles.length > 0) {
        setIsUploadingAttachments(true);
        const uploaded: Array<{ fileName: string; id: number }> = [];
        const failed: Array<{ file: File; error: string }> = [];

        for (let i = 0; i < stagedFiles.length; i++) {
          const file = stagedFiles[i];
          setUploadProgress({
            current: i + 1,
            total: stagedFiles.length,
            currentFileName: file.name,
          });

          try {
            const att = await uploadAttachment(ticket.id, file, currentRequester.id);
            uploaded.push({ fileName: att.fileName, id: att.id });
            setUploadedAttachments([...uploaded]);
          } catch (attErr: any) {
            failed.push({
              file,
              error: attErr.message || "Failed to save attachment",
            });
            setFailedUploads([...failed]);
          }
        }

        setIsUploadingAttachments(false);
        setUploadProgress(null);
      }

      if (onSuccess) {
        onSuccess(ticket);
      }
    } catch (err: any) {
      // Retain entered values on failure (BR-11)
      setSubmitError(err.message || "Unable to create ticket. Please try again.");
      if (err.details) {
        setFieldErrors(err.details);
      }
    } finally {
      setIsSubmitting(false);
      setIsUploadingAttachments(false);
      setUploadProgress(null);
    }
  };

  const handleRetryUpload = async (failedFile: { file: File; error: string }) => {
    if (!createdTicket || !currentRequester) return;
    setIsRetryingUpload((prev) => ({ ...prev, [failedFile.file.name]: true }));

    try {
      const att = await uploadAttachment(createdTicket.id, failedFile.file, currentRequester.id);
      setUploadedAttachments((prev) => [...prev, { fileName: att.fileName, id: att.id }]);
      setFailedUploads((prev) => prev.filter((f) => f.file.name !== failedFile.file.name));
    } catch (err: any) {
      setFailedUploads((prev) =>
        prev.map((f) =>
          f.file.name === failedFile.file.name
            ? { ...f, error: err.message || "Retry upload failed" }
            : f
        )
      );
    } finally {
      setIsRetryingUpload((prev) => ({ ...prev, [failedFile.file.name]: false }));
    }
  };

  const handleResetForm = () => {
    if (isUploadingAttachments) return;
    setCreatedTicket(null);
    setSummary("");
    setDescription("");
    setStagedFiles([]);
    setUploadedAttachments([]);
    setFailedUploads([]);
    setFieldErrors({});
    setSubmitError(null);
    setAttachmentError(null);
  };

  // Success view (AC-01, UI-13) - Ticket Number is the prominent headline
  if (createdTicket) {
    return (
      <div className="container py-4" style={{ maxWidth: 840 }}>
        <div className="card card-zen p-4 border-success">
          <div className="mb-3">
            <span className="badge bg-success-subtle text-success px-3 py-1 mb-2">
              Ticket Submitted Successfully
            </span>
            <h2
              className="h3 fw-bold font-monospace text-success mb-1"
              data-testid="success-ticket-no"
            >
              {createdTicket.ticketNo}
            </h2>
            <p className="text-muted small mb-0">Your support ticket has been received and queued.</p>
          </div>

          <hr />

          <div className="row g-3 my-2">
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">Ticket Date</label>
              <div className="text-dark fw-medium" data-testid="success-ticket-date">
                {new Date(createdTicket.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">Requester</label>
              <div className="fw-semibold text-dark" data-testid="success-requester">
                {currentRequester?.name} ({currentRequester?.department})
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">Initial Status</label>
              <div>
                <span className="badge" style={{ backgroundColor: "#E0F2FE", color: "#0369A1" }}>
                  🔵 {createdTicket.currentStatus}
                </span>
              </div>
            </div>
            <div className="col-md-6">
              <label className="form-label small text-muted mb-1">Priority</label>
              <div className="fw-semibold text-dark">{createdTicket.requestedPriority}</div>
            </div>
            <div className="col-12">
              <label className="form-label small text-muted mb-1">Summary</label>
              <div className="p-2 bg-light rounded">{createdTicket.summary}</div>
            </div>

            {isUploadingAttachments && (
              <div className="col-12" data-testid="attachment-uploading-indicator">
                <div className="alert alert-info d-flex align-items-center mb-0" role="status" aria-live="polite">
                  <span className="spinner-border spinner-border-sm me-2 text-primary" role="status" aria-hidden="true" />
                  <div>
                    <strong>Uploading attachments...</strong>{" "}
                    {uploadProgress
                      ? `(${uploadProgress.current} of ${uploadProgress.total}: ${uploadProgress.currentFileName || ""})`
                      : "Please wait before leaving."}
                  </div>
                </div>
              </div>
            )}

            {uploadedAttachments.length > 0 && (
              <div className="col-12">
                <label className="form-label small text-muted mb-1">Attached Files</label>
                <ul className="list-group list-group-flush border rounded p-2 bg-white">
                  {uploadedAttachments.map((att) => (
                    <li key={att.id} className="list-group-item d-flex align-items-center gap-2 py-1 px-2 border-0">
                      <span className="text-success">✓</span>
                      <span className="fw-semibold small">{att.fileName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {failedUploads.length > 0 && (
              <div className="col-12">
                <div className="alert alert-warning py-3 px-3 mb-0" role="alert">
                  <div className="fw-bold mb-1">Some attachments could not be saved:</div>
                  <ul className="mb-2 ps-3 small">
                    {failedUploads.map(({ file, error }) => (
                      <li key={file.name} className="d-flex justify-content-between align-items-center mb-1">
                        <span>
                          <strong>{file.name}</strong> — {error}
                        </span>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary-zen ms-3"
                          disabled={isRetryingUpload[file.name] || isUploadingAttachments}
                          onClick={() => handleRetryUpload({ file, error })}
                        >
                          {isRetryingUpload[file.name] ? "Retrying..." : "Retry"}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="small text-muted">
                    Your ticket <strong>{createdTicket.ticketNo}</strong> was created successfully. You can retry uploading now or from the Ticket Detail page.
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <button
              className="btn btn-outline-secondary"
              onClick={handleResetForm}
              disabled={isUploadingAttachments}
            >
              Create Another Ticket
            </button>
            {onCancel && (
              <button
                className="btn btn-primary-zen"
                onClick={() => {
                  if (!isUploadingAttachments) {
                    onCancel();
                  }
                }}
                disabled={isUploadingAttachments}
              >
                View My Tickets
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 840 }}>
      <div className="mb-4">
        <h1 className="h3 fw-bold mb-1">Create Ticket Form</h1>
        <p className="text-muted small mb-0">Submit a new IT support request.</p>
      </div>

      {submitError && (
        <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
          <span className="me-2">⚠️</span>
          <div>{submitError}</div>
        </div>
      )}

      {refError && (
        <div className="alert alert-warning d-flex align-items-center mb-4" role="alert">
          <span className="me-2">⚠️</span>
          <div>{refError}</div>
        </div>
      )}

      <div className="card card-zen p-4">
        <form onSubmit={handleSubmit} noValidate>
          {/* Read-Only System & Requester Info Header (AC-03, UI-12) */}
          <div className="p-3 mb-4 rounded" style={{ backgroundColor: "var(--zg-readonly-bg)" }}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label small text-muted mb-1">Ticket Number</label>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  className="form-control form-control-sm form-control-zen"
                  value="Assigned on save (will be assigned on save)"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small text-muted mb-1">Ticket Date</label>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  className="form-control form-control-sm form-control-zen"
                  value="Assigned on save (will be assigned on save)"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label small text-muted mb-1">Requester</label>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  className="form-control form-control-sm form-control-zen"
                  value={
                    currentRequester
                      ? `${currentRequester.name} (${currentRequester.department})`
                      : "Unknown Requester"
                  }
                />
              </div>
            </div>
          </div>

          {/* Classification Controls (Two-Column Grid per ui-spec.md Section 10.2) */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="category-select" className="form-label fw-semibold small">
                Category <span className="text-danger">*</span>
              </label>
              <select
                id="category-select"
                aria-label="Category"
                className={`form-select form-select-zen ${fieldErrors.categoryId ? "is-invalid" : ""}`}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={loadingRefs || isSubmitting}
              >
                {loadingRefs && <option value="">Loading categories...</option>}
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {fieldErrors.categoryId && (
                <div className="text-danger small mt-1">{fieldErrors.categoryId}</div>
              )}
            </div>

            <div className="col-md-6">
              <label htmlFor="system-select" className="form-label fw-semibold small">
                Related System <span className="text-danger">*</span>
              </label>
              <select
                id="system-select"
                aria-label="Related System"
                className={`form-select form-select-zen ${
                  fieldErrors.relatedSystemId ? "is-invalid" : ""
                }`}
                value={relatedSystemId}
                onChange={(e) => setRelatedSystemId(e.target.value)}
                disabled={loadingRefs || isSubmitting}
              >
                {loadingRefs && <option value="">Loading systems...</option>}
                {relatedSystems.map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.name}
                  </option>
                ))}
              </select>
              {fieldErrors.relatedSystemId && (
                <div className="text-danger small mt-1">{fieldErrors.relatedSystemId}</div>
              )}
            </div>

            <div className="col-md-6">
              <label htmlFor="priority-select" className="form-label fw-semibold small">
                Requested Priority <span className="text-danger">*</span>
              </label>
              <select
                id="priority-select"
                aria-label="Requested Priority"
                className={`form-select form-select-zen ${
                  fieldErrors.requestedPriority ? "is-invalid" : ""
                }`}
                value={requestedPriority}
                onChange={(e) =>
                  setRequestedPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH")
                }
                disabled={isSubmitting}
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
              {fieldErrors.requestedPriority && (
                <div className="text-danger small mt-1">{fieldErrors.requestedPriority}</div>
              )}
            </div>
          </div>

          {/* Summary Input */}
          <div className="mb-3">
            <label htmlFor="summary-input" className="form-label fw-semibold small">
              Summary <span className="text-danger">*</span>
            </label>
            <input
              id="summary-input"
              aria-label="Summary"
              type="text"
              className={`form-control form-control-zen ${fieldErrors.summary ? "is-invalid" : ""}`}
              placeholder="Brief summary of the issue (5–100 characters)"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={100}
              disabled={isSubmitting}
            />
            {fieldErrors.summary ? (
              <div className="text-danger small mt-1">{fieldErrors.summary}</div>
            ) : (
              <div className="form-text small">5 to 100 characters ({summary.trim().length}/100)</div>
            )}
          </div>

          {/* Description Input */}
          <div className="mb-4">
            <label htmlFor="description-input" className="form-label fw-semibold small">
              Description <span className="text-danger">*</span>
            </label>
            <textarea
              id="description-input"
              aria-label="Description"
              rows={5}
              className={`form-control form-control-zen ${
                fieldErrors.description ? "is-invalid" : ""
              }`}
              placeholder="Provide complete details, steps to reproduce, or error messages (10–2000 characters)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              disabled={isSubmitting}
            />
            {fieldErrors.description ? (
              <div className="text-danger small mt-1">{fieldErrors.description}</div>
            ) : (
              <div className="form-text small">
                10 to 2000 characters ({description.trim().length}/2000)
              </div>
            )}
          </div>

          {/* Attachment Management Staging (BR-07, UI-04) */}
          <div className="p-3 mb-4 rounded border bg-white">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label fw-semibold small mb-0">
                Attachments (Optional)
              </label>
              <span className="badge bg-light text-dark border">
                ({stagedFiles.length}/{MAX_FILES} Active)
              </span>
            </div>

            <p className="text-muted small mb-2">
              Attach screenshots or documentation. Allowed formats: JPG, PNG, WEBP, PDF (max 5 MB per file).
            </p>

            <input
              ref={fileInputRef}
              type="file"
              data-testid="attachment-input"
              aria-label="Attachments"
              multiple
              className="form-control form-control-sm form-control-zen"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              disabled={stagedFiles.length >= MAX_FILES || isSubmitting}
              onChange={handleFileChange}
            />

            {attachmentError && (
              <div className="text-danger small mt-2">⚠️ {attachmentError}</div>
            )}

            {stagedFiles.length > 0 && (
              <ul className="list-group list-group-flush mt-3">
                {stagedFiles.map((file, idx) => (
                  <li
                    key={idx}
                    className="list-group-item d-flex justify-content-between align-items-center px-0 py-2"
                  >
                    <div>
                      <span className="me-2">📎</span>
                      <span className="fw-medium small">{file.name}</span>
                      <span className="text-muted small ms-2">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger py-0 px-2"
                      onClick={() => handleRemoveFile(idx)}
                      disabled={isSubmitting}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Action Buttons (BR-10) */}
          <div className="d-flex justify-content-end gap-2">
            {onCancel && (
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary-zen px-4"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  />
                  Submitting...
                </>
              ) : (
                "Submit Ticket"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTicket;
