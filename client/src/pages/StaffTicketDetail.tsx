import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  fetchStaffTicketDetail,
  fetchAdminTicketDetail,
  fetchTicketOwners,
  claimTicket,
  reassignTicket,
  updateItPriority,
  updateTicketStatus,
  fetchPublicComments,
  postPublicComment,
  fetchInternalNotes,
  postInternalNote,
  StaffTicketDetail as StaffTicketDetailType,
  TicketOwner,
  CommentItem,
  downloadAttachment,
  fetchActionsTaken,
} from "../api.js";
import { StatusBadge, PriorityBadge } from "../components/Badges.js";
import { ALLOWED_TRANSITIONS, TicketStatus, Priority, ActionTaken } from "../types.js";
import { ActionsTakenSection } from "../components/ActionsTakenSection.js";

interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
  readOnly?: boolean;
}

const CONFIRMATION_STATUSES = new Set(["RESOLVED", "CLOSED", "CANCELLED", "REOPENED"]);

export const StaffTicketDetail: React.FC<StaffTicketDetailProps> = ({ ticketId, onBack, readOnly = false }) => {
  const { user: currentUser } = useAuth();
  const [ticket, setTicket] = useState<StaffTicketDetailType | null>(null);
  const [ticketOwners, setTicketOwners] = useState<TicketOwner[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [notes, setNotes] = useState<CommentItem[]>([]);
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [actionsLoading, setActionsLoading] = useState(false);
  const [actionsError, setActionsError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conflictError, setConflictError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Operational form state
  const [selectedOwnerId, setSelectedOwnerId] = useState<number | "">("");
  const [selectedItPriority, setSelectedItPriority] = useState<Priority | "">("");
  const [selectedTargetStatus, setSelectedTargetStatus] = useState<TicketStatus | "">("");
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [modalStatusError, setModalStatusError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Comment & Note inputs
  const [commentInput, setCommentInput] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [noteInput, setNoteInput] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const loadActions = useCallback(async () => {
    setActionsLoading(true);
    setActionsError(null);
    try {
      const data = await fetchActionsTaken(ticketId);
      setActions(data.actions || []);
    } catch (err: any) {
      setActionsError(err.message || "Failed to load actions taken.");
    } finally {
      setActionsLoading(false);
    }
  }, [ticketId]);

  // Load ticket data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setConflictError(null);

    try {
      const fetchDetailFn = readOnly ? fetchAdminTicketDetail : fetchStaffTicketDetail;
      const ownersPromise = readOnly
        ? Promise.resolve([] as TicketOwner[])
        : fetchTicketOwners().catch(() => [] as TicketOwner[]);

      const [ticketData, ownersData, commentsData, notesData] = await Promise.all([
        fetchDetailFn(ticketId),
        ownersPromise,
        fetchPublicComments(ticketId).catch(() => [] as CommentItem[]),
        fetchInternalNotes(ticketId).catch(() => [] as CommentItem[]),
      ]);

      setTicket(ticketData);
      setTicketOwners(ownersData);
      setComments(commentsData);
      setNotes(notesData);

      setSelectedOwnerId(ticketData.ticketOwner?.id ?? "");
      setSelectedItPriority(ticketData.itPriority);
      setSelectedTargetStatus("");
    } catch (err: any) {
      setError(err.message || "Unable to load ticket details.");
    } finally {
      setIsLoading(false);
    }

    loadActions();
  }, [ticketId, readOnly, loadActions]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Claim handler
  const handleClaim = async () => {
    if (!ticket) return;
    setIsSubmittingAction(true);
    setConflictError(null);
    setActionSuccess(null);

    try {
      await claimTicket(ticket.id, ticket.version);
      setActionSuccess("Ticket claimed successfully!");
      await loadData();
    } catch (err: any) {
      if (err.status === 409 || err.error === "CONFLICT") {
        setConflictError(err.message || "This ticket was modified by another user. Please refresh.");
      } else {
        setError(err.message || "Failed to claim ticket.");
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Reassign owner handler
  const handleReassignOwner = async () => {
    if (!ticket || !selectedOwnerId) return;
    setIsSubmittingAction(true);
    setConflictError(null);
    setActionSuccess(null);

    try {
      await reassignTicket(ticket.id, Number(selectedOwnerId), ticket.version);
      setActionSuccess("Owner reassigned successfully!");
      await loadData();
    } catch (err: any) {
      if (err.status === 409 || err.error === "CONFLICT") {
        setConflictError(err.message || "This ticket was modified by another user. Please refresh.");
      } else {
        setError(err.message || "Failed to reassign owner.");
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Update IT priority handler
  const handleUpdatePriority = async () => {
    if (!ticket || !selectedItPriority) return;
    setIsSubmittingAction(true);
    setConflictError(null);
    setActionSuccess(null);

    try {
      await updateItPriority(ticket.id, selectedItPriority as Priority, ticket.version);
      setActionSuccess("IT Priority updated successfully!");
      await loadData();
    } catch (err: any) {
      if (err.status === 409 || err.error === "CONFLICT") {
        setConflictError(err.message || "This ticket was modified by another user. Please refresh.");
      } else {
        setError(err.message || "Failed to update priority.");
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Status transition handler
  const handleStatusChangeRequest = () => {
    if (!selectedTargetStatus) return;
    setModalStatusError(null);
    if (CONFIRMATION_STATUSES.has(selectedTargetStatus)) {
      setShowStatusConfirmModal(true);
    } else {
      executeStatusTransition(selectedTargetStatus);
    }
  };

  const executeStatusTransition = async (targetStatus: TicketStatus) => {
    if (!ticket) return;
    setIsSubmittingAction(true);
    setConflictError(null);
    setActionSuccess(null);
    setModalStatusError(null);
    setError(null);

    try {
      await updateTicketStatus(ticket.id, targetStatus, ticket.version);
      setActionSuccess(`Status transitioned to ${targetStatus} successfully!`);
      setShowStatusConfirmModal(false);
      await loadData();
    } catch (err: any) {
      const errMsg =
        err.status === 422 || err.error === "RESOLUTION_GATE_FAILED"
          ? err.message || "Ticket resolution requires at least one completed Action Taken and no pending actions."
          : err.status === 409 || err.error === "CONFLICT"
          ? err.message || "This ticket was modified by another user. Please refresh."
          : err.message || "Failed to update status.";

      if (err.status === 409 || err.error === "CONFLICT") {
        setConflictError(errMsg);
      }
      setError(errMsg);
      setModalStatusError(errMsg);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Submit comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = commentInput.trim();
    if (!trimmed) {
      setCommentError("Comment cannot be empty.");
      return;
    }
    if (trimmed.length > 2000) {
      setCommentError("Comment exceeds 2,000 characters limit.");
      return;
    }

    setIsSubmittingComment(true);
    setCommentError(null);

    try {
      const newComment = await postPublicComment(ticketId, trimmed);
      setComments((prev) => [...prev, newComment]);
      setCommentInput("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Submit internal note
  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteInput.trim();
    if (!trimmed) {
      setNoteError("Internal note cannot be empty.");
      return;
    }
    if (trimmed.length > 2000) {
      setNoteError("Internal note exceeds 2,000 characters limit.");
      return;
    }

    setIsSubmittingNote(true);
    setNoteError(null);

    try {
      const newNote = await postInternalNote(ticketId, trimmed);
      setNotes((prev) => [...prev, newNote]);
      setNoteInput("");
    } catch (err: any) {
      setNoteError(err.message || "Failed to post internal note.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleDownload = async (attachmentId: number, fileName: string) => {
    try {
      const { blob } = await downloadAttachment(attachmentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Unable to download attachment. It may have been removed.");
    }
  };

  if (isLoading) {
    return (
      <div className="container py-5 text-center" data-testid="staff-detail-loading">
        <div className="spinner-border text-success mx-auto mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="text-muted">Loading ticket details...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="container py-5" data-testid="staff-detail-error">
        <div className="alert alert-danger shadow-sm">
          <h5 className="alert-heading">Error</h5>
          <p>{error}</p>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={onBack}>
            Back to Queue
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const validNextStatuses: TicketStatus[] = ALLOWED_TRANSITIONS[ticket.currentStatus] || [];

  return (
    <div className="container py-4" data-testid="staff-ticket-detail-page">
      {/* Back Button & Top Navigation */}
      <div className="mb-3">
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onBack}
          data-testid="staff-back-to-queue-btn"
        >
          ← Back to Queue
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div
          className="alert alert-danger alert-dismissible fade show shadow-sm d-flex justify-content-between align-items-center mb-3"
          data-testid="staff-detail-error-alert"
          role="alert"
        >
          <div>
            <strong>⚠️ Error:</strong> {error}
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setError(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {conflictError && (
        <div className="alert alert-warning shadow-sm d-flex justify-content-between align-items-center mb-3" data-testid="staff-conflict-alert">
          <div>
            <strong>⚠️ Concurrency Conflict:</strong> {conflictError}
          </div>
          <button type="button" className="btn btn-sm btn-warning" onClick={loadData}>
            Refresh
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="alert alert-success shadow-sm alert-dismissible fade show mb-3" role="alert">
          {actionSuccess}
          <button type="button" className="btn-close" onClick={() => setActionSuccess(null)}></button>
        </div>
      )}

      {/* Ticket Header Card */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 d-flex flex-wrap justify-content-between align-items-center border-bottom">
          <div className="d-flex align-items-center gap-3">
            <span className="h4 fw-bold text-success font-monospace mb-0" data-testid="staff-detail-ticket-no">
              {ticket.ticketNo}
            </span>
            <StatusBadge status={ticket.currentStatus} />
            <span className="badge bg-light text-secondary border">v{ticket.version}</span>
          </div>
          <div className="small text-muted mt-2 mt-md-0">
            Created: {new Date(ticket.createdAt).toLocaleString()} • Updated: {new Date(ticket.updatedAt).toLocaleString()}
          </div>
        </div>

        <div className="card-body p-4">
          <h3 className="h4 fw-bold text-dark mb-3">{ticket.summary}</h3>
          <p className="text-secondary mb-4" style={{ whiteSpace: "pre-wrap" }}>
            {ticket.description}
          </p>

          <div className="row g-3 p-3 rounded" style={{ backgroundColor: "#F8FAF8" }}>
            <div className="col-12 col-md-3">
              <span className="small text-muted d-block">Requester</span>
              <strong className="text-dark">{ticket.requester.name}</strong>
              <span className="small text-muted d-block">{ticket.requester.email}</span>
            </div>
            <div className="col-12 col-md-3">
              <span className="small text-muted d-block">Category & System</span>
              <strong className="text-dark">{ticket.category.name}</strong>
              <span className="small text-muted d-block">{ticket.relatedSystem.name}</span>
            </div>
            <div className="col-6 col-md-3">
              <span className="small text-muted d-block">Requested Priority</span>
              <PriorityBadge priority={ticket.requestedPriority} />
            </div>
            <div className="col-6 col-md-3">
              <span className="small text-muted d-block">Current Owner</span>
              {ticket.ticketOwner ? (
                <strong className="text-dark">👤 {ticket.ticketOwner.name}</strong>
              ) : (
                <span className="badge bg-light text-secondary border">Unassigned</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Operational Actions Panel */}
      {!readOnly && (
        <div className="card shadow-sm border-0 mb-4" data-testid="staff-operations-panel">
          <div className="card-header bg-light fw-bold py-3 text-dark">🛠️ Ticket Operations & Triage</div>
          <div className="card-body p-4">
            <div className="row g-4">
              {/* Claim Ticket */}
              <div className="col-12 col-md-3 border-end-md">
                <label className="form-label small fw-bold text-muted">Ticket Assignment</label>
                {ticket.ticketOwner === null ? (
                  <div>
                    <button
                      type="button"
                      className="btn btn-success w-100"
                      onClick={handleClaim}
                      disabled={isSubmittingAction}
                      data-testid="staff-claim-ticket-btn"
                    >
                      Claim Ticket
                    </button>
                    <span className="small text-muted d-block mt-1">Assign ticket to yourself</span>
                  </div>
                ) : (
                  <div>
                    <span className="badge bg-light text-dark p-2 w-100 border text-start mb-2">
                      Assigned: {ticket.ticketOwner.name}
                    </span>
                    <div className="input-group">
                      <select
                        className="form-select form-select-sm"
                        value={selectedOwnerId}
                        onChange={(e) => setSelectedOwnerId(e.target.value ? Number(e.target.value) : "")}
                        data-testid="staff-reassign-owner-select"
                      >
                        <option value="">Select new owner...</option>
                        {ticketOwners.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name} ({o.role === "IT_STAFF" ? "Staff" : "Admin"})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary"
                        onClick={handleReassignOwner}
                        disabled={isSubmittingAction || !selectedOwnerId || selectedOwnerId === ticket.ticketOwner.id}
                        data-testid="staff-reassign-owner-btn"
                      >
                        Reassign
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* IT Priority */}
              <div className="col-12 col-md-4 border-end-md">
                <label htmlFor="staff-it-priority-select" className="form-label small fw-bold text-muted">
                  IT Priority Assessment
                </label>
                <div className="input-group">
                  <select
                    id="staff-it-priority-select"
                    className="form-select"
                    value={selectedItPriority}
                    onChange={(e) => setSelectedItPriority(e.target.value as Priority)}
                    data-testid="staff-it-priority-select"
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                  <button
                    type="button"
                    className="btn btn-outline-success"
                    onClick={handleUpdatePriority}
                    disabled={isSubmittingAction || selectedItPriority === ticket.itPriority}
                    data-testid="staff-update-priority-btn"
                  >
                    Update
                  </button>
                </div>
                <span className="small text-muted d-block mt-1">Requested by user: {ticket.requestedPriority}</span>
              </div>

              {/* Status Transition */}
              <div className="col-12 col-md-5">
                <label htmlFor="staff-status-select" className="form-label small fw-bold text-muted">
                  Status Progression
                </label>
                <div className="input-group">
                  <select
                    id="staff-status-select"
                    className="form-select"
                    value={selectedTargetStatus}
                    onChange={(e) => setSelectedTargetStatus(e.target.value as TicketStatus)}
                    disabled={validNextStatuses.length === 0}
                    data-testid="staff-status-select"
                  >
                    <option value="">
                      {validNextStatuses.length === 0 ? "Terminal status (no transitions)" : "Select next status..."}
                    </option>
                    {validNextStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleStatusChangeRequest}
                    disabled={isSubmittingAction || !selectedTargetStatus}
                    data-testid="staff-change-status-btn"
                  >
                    Change Status
                  </button>
                </div>
                <span className="small text-muted d-block mt-1">Current status: {ticket.currentStatus}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions Taken Section */}
      <ActionsTakenSection
        ticketId={ticket.id}
        ticketStatus={ticket.currentStatus}
        actions={actions}
        currentUser={currentUser}
        readOnly={currentUser?.role ? !["IT_STAFF", "ADMINISTRATOR"].includes(currentUser.role) : readOnly}
        isLoading={actionsLoading}
        error={actionsError}
        onRetry={loadActions}
        onActionSaved={loadData}
        assignableStaff={ticketOwners.map((o) => ({ id: o.id, name: o.name }))}
      />

      {/* Attachments Section */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-header bg-white py-3 fw-bold text-dark border-bottom">
          📎 Attachments ({ticket.attachments.filter((a) => !a.removedAt).length})
        </div>
        <div className="card-body p-3">
          {ticket.attachments.length === 0 ? (
            <p className="text-muted small mb-0">No files attached to this ticket.</p>
          ) : (
            <div className="list-group list-group-flush">
              {ticket.attachments.map((a) => (
                <div key={a.id} className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                  <div>
                    <span className={`fw-medium ${a.removedAt ? "text-decoration-line-through text-muted" : "text-dark"}`}>
                      {a.fileName}
                    </span>
                    <span className="small text-muted ms-2">({(a.fileSize / 1024).toFixed(1)} KB)</span>
                    {a.removedAt && (
                      <span className="badge bg-secondary ms-2">Removed ({a.removalReason || "No reason given"})</span>
                    )}
                  </div>
                  {!a.removedAt && (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      onClick={() => handleDownload(a.id, a.fileName)}
                    >
                      Download
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Communication Section: Tabs or Split for Public Comments vs Internal Notes */}
      <div className="row g-4">
        {/* Public Comments Column */}
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm border-0 h-100" data-testid="public-comments-panel">
            <div className="card-header bg-white py-3 fw-bold text-dark border-bottom">
              💬 Public Comments (Visible to Requester)
            </div>
            <div className="card-body p-3 d-flex flex-column">
              <div className="flex-grow-1 overflow-auto mb-3" style={{ maxHeight: "350px" }}>
                {comments.length === 0 ? (
                  <p className="text-muted small p-3 text-center mb-0">No public comments yet.</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="card bg-light border-0 mb-2 p-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong className="small text-dark">{c.author.name}</strong>
                        <span className="badge bg-secondary" style={{ fontSize: "10px" }}>
                          {c.author.role}
                        </span>
                      </div>
                      <p className="small text-secondary mb-1" style={{ whiteSpace: "pre-wrap" }}>
                        {c.body}
                      </p>
                      <span className="text-muted" style={{ fontSize: "10px" }}>
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              {!readOnly && (
                <form onSubmit={handlePostComment} className="pt-2 border-top">
                  {commentError && <div className="alert alert-danger py-1 small mb-2">{commentError}</div>}
                  <div className="mb-2">
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      placeholder="Write a public comment for the requester..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      data-testid="public-comment-input"
                    ></textarea>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="small text-muted">{commentInput.length}/2000</span>
                    <button
                      type="submit"
                      className="btn btn-sm btn-success"
                      disabled={isSubmittingComment || !commentInput.trim()}
                      data-testid="submit-public-comment-btn"
                    >
                      Post Comment
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Internal Notes Column */}
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm border-0 h-100" data-testid="internal-notes-panel">
            <div className="card-header bg-warning bg-opacity-10 py-3 fw-bold text-dark border-bottom d-flex justify-content-between align-items-center">
              <span>🔒 Internal Notes</span>
              <span className="badge bg-warning text-dark" style={{ fontSize: "11px" }}>
                IT Staff & Admin Only
              </span>
            </div>
            <div className="card-body p-3 d-flex flex-column">
              <div className="flex-grow-1 overflow-auto mb-3" style={{ maxHeight: "350px" }}>
                {notes.length === 0 ? (
                  <p className="text-muted small p-3 text-center mb-0">No internal notes yet.</p>
                ) : (
                  notes.map((n) => (
                    <div key={n.id} className="card bg-warning bg-opacity-10 border-0 mb-2 p-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong className="small text-dark">🔒 {n.author.name}</strong>
                        <span className="badge bg-dark" style={{ fontSize: "10px" }}>
                          {n.author.role}
                        </span>
                      </div>
                      <p className="small text-dark mb-1" style={{ whiteSpace: "pre-wrap" }}>
                        {n.body}
                      </p>
                      <span className="text-muted" style={{ fontSize: "10px" }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Note Input */}
              {!readOnly && (
                <form onSubmit={handlePostNote} className="pt-2 border-top">
                  {noteError && <div className="alert alert-danger py-1 small mb-2">{noteError}</div>}
                  <div className="mb-2">
                    <textarea
                      className="form-control form-control-sm"
                      rows={3}
                      placeholder="Write a confidential internal note for the team..."
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      data-testid="internal-note-input"
                    ></textarea>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="small text-muted">{noteInput.length}/2000</span>
                    <button
                      type="submit"
                      className="btn btn-sm btn-warning text-dark fw-semibold"
                      disabled={isSubmittingNote || !noteInput.trim()}
                      data-testid="submit-internal-note-btn"
                    >
                      Add Internal Note
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Confirmation Modal */}
      {showStatusConfirmModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Confirm Status Change</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowStatusConfirmModal(false)}
                  disabled={isSubmittingAction}
                ></button>
              </div>
              <div className="modal-body">
                {modalStatusError && (
                  <div className="alert alert-danger small mb-3" data-testid="status-modal-error">
                    {modalStatusError}
                  </div>
                )}
                <p>
                  Are you sure you want to transition this ticket status to{" "}
                  <strong>{selectedTargetStatus}</strong>?
                </p>
                {selectedTargetStatus === "RESOLVED" && (
                  <div className="alert alert-info small mb-0">
                    This marks the work as completed. The requester will be able to see that the ticket is resolved.
                  </div>
                )}
                {selectedTargetStatus === "CANCELLED" && (
                  <div className="alert alert-danger small mb-0">
                    Warning: CANCELLED is a terminal status. No further transitions can be made after cancelling.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowStatusConfirmModal(false)}
                  disabled={isSubmittingAction}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => executeStatusTransition(selectedTargetStatus as TicketStatus)}
                  data-testid="confirm-status-transition-btn"
                  disabled={isSubmittingAction}
                >
                  {isSubmittingAction ? "Updating..." : "Confirm & Update"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
