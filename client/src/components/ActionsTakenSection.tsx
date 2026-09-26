import React, { useState, useEffect, useRef } from "react";
import { ActionTaken } from "../types.js";
import { ActionStatusBadge } from "./Badges.js";
import {
  createActionTaken,
  updateActionTaken,
  completeActionTaken,
  cancelActionTaken,
} from "../api.js";

export interface ActionsTakenSectionProps {
  ticketId: number;
  ticketStatus: string;
  actions: ActionTaken[];
  currentUser?: { id: number; name: string; role: string } | null;
  readOnly?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onActionSaved: () => void;
  assignableStaff?: Array<{ id: number; name: string }>;
}

/**
 * Formats a Date instance as YYYY-MM-DDTHH:mm in the local browser timezone.
 * Suitable for HTML5 <input type="datetime-local">.
 * Prevents UTC timezone skew (e.g. 7 hours in UTC+7 Bangkok).
 */
export function formatLocalDatetime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export const ActionsTakenSection: React.FC<ActionsTakenSectionProps> = ({
  ticketId,
  ticketStatus,
  actions,
  currentUser,
  readOnly = false,
  isLoading = false,
  error = null,
  onRetry,
  onActionSaved,
  assignableStaff = [],
}) => {
  const isTerminal = ["RESOLVED", "CLOSED", "CANCELLED"].includes(ticketStatus);

  // Modal states
  const [activeModal, setActiveModal] = useState<"LOG" | "COMPLETE" | "CANCEL" | "EDIT" | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionTaken | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for Log/Edit
  const [clientRequestId, setClientRequestId] = useState("");
  const [actionDateTime, setActionDateTime] = useState("");
  const [statusMode, setStatusMode] = useState<"COMPLETED" | "PENDING">("COMPLETED");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState("");
  const [assigneeId, setAssigneeId] = useState<number | "">("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpNote, setFollowUpNote] = useState("");
  const [attachmentNotes, setAttachmentNotes] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);
  const isSubmittingRef = useRef(isSubmitting);
  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  // Focus trap and Escape listener for accessible modals
  useEffect(() => {
    if (!activeModal) return;

    const timer = setTimeout(() => {
      if (modalRef.current) {
        const focusableSelector =
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(focusableSelector)
        ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");
        if (focusables.length > 0) {
          focusables[0].focus();
        }
      }
    }, 10);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!isSubmittingRef.current) {
          closeModal();
        }
        return;
      }

      if (e.key === "Tab" && modalRef.current) {
        const focusableSelector =
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(focusableSelector)
        ).filter((el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true");

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeModal, isSubmitting]);

  const openLogModal = () => {
    const nowLocal = formatLocalDatetime(new Date());
    const newUuid = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : "uuid-" + Date.now();
    setClientRequestId(newUuid);
    setActionDateTime(nowLocal);
    setStatusMode("COMPLETED");
    setDescription("");
    setResult("");
    setAssigneeId("");
    setFollowUpRequired(false);
    setFollowUpNote("");
    setAttachmentNotes("");
    setModalError(null);
    setActiveModal("LOG");
  };

  const openCompleteModal = (action: ActionTaken) => {
    setSelectedAction(action);
    setResult("");
    setAttachmentNotes(action.attachmentNotes || "");
    setModalError(null);
    setActiveModal("COMPLETE");
  };

  const openCancelModal = (action: ActionTaken) => {
    setSelectedAction(action);
    setCancelReason("");
    setModalError(null);
    setActiveModal("CANCEL");
  };

  const openEditModal = (action: ActionTaken) => {
    setSelectedAction(action);
    setDescription(action.actionDescription);
    setResult(action.result || "");
    setAssigneeId(action.assignee?.id ?? "");
    setFollowUpRequired(action.followUpRequired);
    setFollowUpNote(action.followUpNote || "");
    setAttachmentNotes(action.attachmentNotes || "");
    setModalError(null);
    setActiveModal("EDIT");
  };

  const closeModal = (force = false) => {
    if (!force && isSubmittingRef.current) return;
    setActiveModal(null);
    setSelectedAction(null);
    setModalError(null);
    setIsSubmitting(false);
  };

  const maxDatetime = formatLocalDatetime(new Date(Date.now() + 5 * 60 * 1000));

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setModalError("Action description is required.");
      return;
    }
    if (statusMode === "COMPLETED" && !result.trim()) {
      setModalError("Result is required when logging completed work.");
      return;
    }
    if (followUpRequired && !followUpNote.trim()) {
      setModalError("Follow-up note is required when follow-up is requested.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await createActionTaken(
        ticketId,
        {
          actionDateTime: actionDateTime ? new Date(actionDateTime).toISOString() : undefined,
          actionDescription: description.trim(),
          status: statusMode,
          result: statusMode === "COMPLETED" ? result.trim() : undefined,
          assigneeId: assigneeId !== "" ? Number(assigneeId) : null,
          followUpRequired,
          followUpNote: followUpRequired ? followUpNote.trim() : null,
          attachmentNotes: attachmentNotes.trim() || null,
          clientRequestId,
        },
        clientRequestId,
      );
      closeModal(true);
      onActionSaved();
    } catch (err: any) {
      setModalError(err.message || "Failed to log action.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) return;
    if (!result.trim()) {
      setModalError("Result details are mandatory when completing an action.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await completeActionTaken(ticketId, selectedAction.id, {
        result: result.trim(),
        expectedVersion: selectedAction.version,
        attachmentNotes: attachmentNotes.trim() || undefined,
      });
      closeModal(true);
      onActionSaved();
    } catch (err: any) {
      setModalError(err.message || "Failed to complete action.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) return;

    setIsSubmitting(true);
    setModalError(null);
    try {
      await cancelActionTaken(ticketId, selectedAction.id, {
        expectedVersion: selectedAction.version,
        reason: cancelReason.trim() || undefined,
      });
      closeModal(true);
      onActionSaved();
    } catch (err: any) {
      setModalError(err.message || "Failed to cancel action.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) return;
    if (!description.trim()) {
      setModalError("Action description is required.");
      return;
    }
    if (followUpRequired && !followUpNote.trim()) {
      setModalError("Follow-up note is required when follow-up is requested.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    try {
      await updateActionTaken(ticketId, selectedAction.id, {
        expectedVersion: selectedAction.version,
        actionDescription: description.trim(),
        assigneeId: selectedAction.status === "PENDING" ? (assigneeId !== "" ? Number(assigneeId) : null) : undefined,
        followUpRequired,
        followUpNote: followUpRequired ? followUpNote.trim() : null,
        attachmentNotes: attachmentNotes.trim() || null,
      });
      closeModal(true);
      onActionSaved();
    } catch (err: any) {
      setModalError(err.message || "Failed to update action.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card shadow-sm mb-4" data-testid="actions-taken-section">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <div className="d-flex align-items-center gap-2">
          <h5 className="mb-0 fw-bold text-dark">Actions Taken</h5>
          <span className="badge bg-secondary rounded-pill px-2">{actions.length}</span>
        </div>
        {!readOnly && (
          <button
            type="button"
            className="btn btn-sm btn-success d-flex align-items-center gap-1"
            style={{ backgroundColor: "var(--zg-primary)", borderColor: "var(--zg-primary)" }}
            onClick={openLogModal}
            disabled={isTerminal}
            title={isTerminal ? "Cannot log actions on a resolved, closed, or cancelled ticket." : "+ Log Action"}
          >
            + Log Action
          </button>
        )}
      </div>

      <div className="card-body p-0">
        {isLoading ? (
          <div className="p-4 text-center text-muted" data-testid="actions-taken-loading">
            <div className="spinner-border spinner-border-sm text-success me-2" role="status">
              <span className="visually-hidden">Loading actions...</span>
            </div>
            <span>Loading actions taken...</span>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-danger" data-testid="actions-taken-error">
            <p className="mb-2">⚠️ Failed to load actions taken: {error}</p>
            {onRetry && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={onRetry}
                data-testid="retry-actions-btn"
              >
                🔄 Retry
              </button>
            )}
          </div>
        ) : actions.length === 0 ? (
          <div className="p-4 text-center text-muted">
            <p className="mb-1">No actions taken yet for this ticket.</p>
            {!readOnly && !isTerminal && <p className="small mb-0">Click "+ Log Action" above to record diagnostic or repair work.</p>}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light small text-muted text-uppercase">
                <tr>
                  <th style={{ width: "16%" }}>Date & Time</th>
                  <th style={{ width: "12%" }}>Status</th>
                  <th style={{ width: "26%" }}>Description & Result</th>
                  <th style={{ width: "18%" }}>Staff / Assignee</th>
                  <th style={{ width: "16%" }}>Follow-Up & Notes</th>
                  {!readOnly && <th style={{ width: "12%" }} className="text-end">Controls</th>}
                </tr>
              </thead>
              <tbody>
                {actions.map((act) => {
                  const isPerformer = currentUser?.id === act.performedBy?.id;
                  const isAdmin = currentUser?.role === "ADMINISTRATOR";
                  const canEditCompleted = act.status === "COMPLETED" && (isPerformer || isAdmin);

                  return (
                    <tr key={act.id} data-testid={`action-row-${act.id}`}>
                      <td className="small text-muted">
                        {new Date(act.actionDateTime).toLocaleString(undefined, {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td>
                        <ActionStatusBadge status={act.status} />
                      </td>
                      <td>
                        <div className="fw-medium text-dark">{act.actionDescription}</div>
                        {act.result && (
                          <div className="small text-success mt-1">
                            <strong>Result:</strong> {act.result}
                          </div>
                        )}
                      </td>
                      <td className="small">
                        {act.performedBy && (
                          <div>
                            <span className="text-muted">By:</span> <strong>{act.performedBy.name}</strong>
                          </div>
                        )}
                        {act.assignee && (
                          <div className="text-muted mt-1">
                            <span>Assigned:</span> <strong>{act.assignee.name}</strong>
                          </div>
                        )}
                        {!act.performedBy && !act.assignee && <span className="text-muted">—</span>}
                      </td>
                      <td className="small">
                        {act.followUpRequired && (
                          <div className="mb-1">
                            <span className="badge bg-warning text-dark me-1">Follow-up</span>
                            {act.followUpNote && <span className="text-dark">{act.followUpNote}</span>}
                          </div>
                        )}
                        {act.attachmentNotes && (
                          <div className="text-muted">
                            <i className="bi bi-paperclip me-1"></i>
                            <span>{act.attachmentNotes}</span>
                          </div>
                        )}
                        {!act.followUpRequired && !act.attachmentNotes && <span className="text-muted">—</span>}
                      </td>
                      {!readOnly && (
                        <td className="text-end">
                          {!isTerminal && (
                            <div className="btn-group btn-group-sm">
                              {act.status === "PENDING" && (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-outline-success btn-sm"
                                    data-testid={`complete-action-btn-${act.id}`}
                                    onClick={() => openCompleteModal(act)}
                                    title="Complete Action"
                                  >
                                    Complete
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    data-testid={`edit-action-btn-${act.id}`}
                                    onClick={() => openEditModal(act)}
                                    title="Edit Action"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    data-testid={`cancel-action-btn-${act.id}`}
                                    onClick={() => openCancelModal(act)}
                                    title="Cancel Action"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}
                              {canEditCompleted && (
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm"
                                  data-testid={`edit-action-btn-${act.id}`}
                                  onClick={() => openEditModal(act)}
                                  title="Edit Details"
                                >
                                  Edit
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Log New Action */}
      {activeModal === "LOG" && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" ref={modalRef}>
            <div className="modal-content">
              <form onSubmit={handleLogSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Log New Action</h5>
                  <button type="button" className="btn-close" onClick={() => closeModal()} aria-label="Close" disabled={isSubmitting}></button>
                </div>
                <div className="modal-body">
                  {modalError && <div className="alert alert-danger py-2">{modalError}</div>}

                  <div className="row g-3 mb-3">
                    <div className="col-md-6">
                      <label htmlFor="log-action-datetime" className="form-label fw-medium">
                        Action Date & Time
                      </label>
                      <input
                        id="log-action-datetime"
                        type="datetime-local"
                        className="form-control"
                        max={maxDatetime}
                        value={actionDateTime}
                        onChange={(e) => setActionDateTime(e.target.value)}
                        disabled={isSubmitting}
                        required
                      />
                      <div className="form-text small">Max 5 minutes in future.</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-medium d-block">Action Type</label>
                      <div className="btn-group w-100" role="group">
                        <input
                          type="radio"
                          className="btn-check"
                          name="statusMode"
                          id="mode-completed"
                          checked={statusMode === "COMPLETED"}
                          onChange={() => setStatusMode("COMPLETED")}
                          disabled={isSubmitting}
                        />
                        <label className="btn btn-outline-success" htmlFor="mode-completed">
                          Completed Work
                        </label>
                        <input
                          type="radio"
                          className="btn-check"
                          name="statusMode"
                          id="mode-pending"
                          checked={statusMode === "PENDING"}
                          onChange={() => setStatusMode("PENDING")}
                          disabled={isSubmitting}
                        />
                        <label className="btn btn-outline-warning" htmlFor="mode-pending">
                          Pending Task
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label htmlFor="log-action-desc" className="form-label fw-medium">
                      Action Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="log-action-desc"
                      className="form-control"
                      rows={3}
                      placeholder="Describe the diagnostics, repair, or task..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={1000}
                      disabled={isSubmitting}
                      required
                    ></textarea>
                  </div>

                  {statusMode === "COMPLETED" && (
                    <div className="mb-3">
                      <label htmlFor="log-action-result" className="form-label fw-medium">
                        Result / Resolution Details <span className="text-danger">*</span>
                      </label>
                      <textarea
                        id="log-action-result"
                        className="form-control"
                        rows={2}
                        placeholder="Outcome or findings..."
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                        maxLength={1000}
                        disabled={isSubmitting}
                        required
                      ></textarea>
                    </div>
                  )}

                  {statusMode === "PENDING" && (
                    <div className="mb-3">
                      <label htmlFor="log-action-assignee" className="form-label fw-medium">
                        Assignee (Optional)
                      </label>
                      <select
                        id="log-action-assignee"
                        className="form-select"
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : "")}
                        disabled={isSubmitting}
                      >
                        <option value="">Unassigned</option>
                        {assignableStaff.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        id="log-action-followup"
                        type="checkbox"
                        className="form-check-input"
                        checked={followUpRequired}
                        onChange={(e) => setFollowUpRequired(e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="log-action-followup" className="form-check-label fw-medium">
                        Follow-up Required
                      </label>
                    </div>
                    {followUpRequired && (
                      <textarea
                        className="form-control mt-2"
                        rows={2}
                        placeholder="Specify follow-up requirement or deadline..."
                        value={followUpNote}
                        onChange={(e) => setFollowUpNote(e.target.value)}
                        maxLength={1000}
                        disabled={isSubmitting}
                        required
                      ></textarea>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="log-action-attachment" className="form-label fw-medium">
                      Attachment Notes (Optional)
                    </label>
                    <input
                      id="log-action-attachment"
                      type="text"
                      className="form-control"
                      placeholder="e.g. IMG_0012.JPG showing patch panel"
                      value={attachmentNotes}
                      onChange={(e) => setAttachmentNotes(e.target.value)}
                      maxLength={500}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => closeModal()} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Action"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Complete Action */}
      {activeModal === "COMPLETE" && selectedAction && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered" ref={modalRef}>
            <div className="modal-content">
              <form onSubmit={handleCompleteSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Complete Action Taken</h5>
                  <button type="button" className="btn-close" onClick={() => closeModal()} aria-label="Close" disabled={isSubmitting}></button>
                </div>
                <div className="modal-body">
                  {modalError && <div className="alert alert-danger py-2">{modalError}</div>}
                  <p className="mb-2 text-muted small">
                    Action: <strong>{selectedAction.actionDescription}</strong>
                  </p>
                  <div className="mb-3">
                    <label htmlFor="complete-result" className="form-label fw-medium">
                      Result / Outcome Details <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="complete-result"
                      className="form-control"
                      rows={3}
                      placeholder="Enter the result of this completed action..."
                      value={result}
                      onChange={(e) => setResult(e.target.value)}
                      maxLength={1000}
                      disabled={isSubmitting}
                      required
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="complete-attachment" className="form-label fw-medium">
                      Attachment Notes (Optional)
                    </label>
                    <input
                      id="complete-attachment"
                      type="text"
                      className="form-control"
                      value={attachmentNotes}
                      onChange={(e) => setAttachmentNotes(e.target.value)}
                      maxLength={500}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => closeModal()} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-success" disabled={isSubmitting}>
                    {isSubmitting ? "Completing..." : "Mark Completed"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Cancel Action */}
      {activeModal === "CANCEL" && selectedAction && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-dialog-centered" ref={modalRef}>
            <div className="modal-content">
              <form onSubmit={handleCancelSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold text-danger">Cancel Pending Action</h5>
                  <button type="button" className="btn-close" onClick={() => closeModal()} aria-label="Close" disabled={isSubmitting}></button>
                </div>
                <div className="modal-body">
                  {modalError && <div className="alert alert-danger py-2">{modalError}</div>}
                  <p className="mb-3">
                    Are you sure you want to cancel this pending action?
                  </p>
                  <div className="card p-2 bg-light mb-3 small">
                    <strong>{selectedAction.actionDescription}</strong>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="cancel-reason" className="form-label fw-medium">
                      Cancellation Reason (Optional)
                    </label>
                    <input
                      id="cancel-reason"
                      type="text"
                      className="form-control"
                      placeholder="e.g. Duplicate task or no longer necessary"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      maxLength={500}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => closeModal()} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-danger" disabled={isSubmitting}>
                    {isSubmitting ? "Cancelling..." : "Confirm Cancellation"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Edit Action */}
      {activeModal === "EDIT" && selectedAction && (
        <div
          className="modal show d-block"
          tabIndex={-1}
          role="dialog"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" ref={modalRef}>
            <div className="modal-content">
              <form onSubmit={handleEditSubmit}>
                <div className="modal-header">
                  <h5 className="modal-title fw-bold">Edit Action Details</h5>
                  <button type="button" className="btn-close" onClick={() => closeModal()} aria-label="Close" disabled={isSubmitting}></button>
                </div>
                <div className="modal-body">
                  {modalError && <div className="alert alert-danger py-2">{modalError}</div>}

                  <div className="mb-3">
                    <label htmlFor="edit-action-desc" className="form-label fw-medium">
                      Action Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="edit-action-desc"
                      className="form-control"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={1000}
                      disabled={isSubmitting}
                      required
                    ></textarea>
                  </div>

                  {selectedAction.status === "PENDING" && (
                    <div className="mb-3">
                      <label htmlFor="edit-action-assignee" className="form-label fw-medium">
                        Assignee
                      </label>
                      <select
                        id="edit-action-assignee"
                        className="form-select"
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : "")}
                        disabled={isSubmitting}
                      >
                        <option value="">Unassigned</option>
                        {assignableStaff.map((staff) => (
                          <option key={staff.id} value={staff.id}>
                            {staff.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        id="edit-action-followup"
                        type="checkbox"
                        className="form-check-input"
                        checked={followUpRequired}
                        onChange={(e) => setFollowUpRequired(e.target.checked)}
                        disabled={isSubmitting}
                      />
                      <label htmlFor="edit-action-followup" className="form-check-label fw-medium">
                        Follow-up Required
                      </label>
                    </div>
                    {followUpRequired && (
                      <textarea
                        className="form-control mt-2"
                        rows={2}
                        value={followUpNote}
                        onChange={(e) => setFollowUpNote(e.target.value)}
                        maxLength={1000}
                        disabled={isSubmitting}
                        required
                      ></textarea>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="edit-action-attachment" className="form-label fw-medium">
                      Attachment Notes (Optional)
                    </label>
                    <input
                      id="edit-action-attachment"
                      type="text"
                      className="form-control"
                      value={attachmentNotes}
                      onChange={(e) => setAttachmentNotes(e.target.value)}
                      maxLength={500}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => closeModal()} disabled={isSubmitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
