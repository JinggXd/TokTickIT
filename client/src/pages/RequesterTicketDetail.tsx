import React, { useEffect, useState, useCallback } from "react";
import {
  fetchTicketDetail,
  TicketDetail,
  fetchPublicComments,
  postPublicComment,
  markAppearsResolved,
  CommentItem,
} from "../api.js";
import AttachmentSection from "../components/AttachmentSection.js";

// Statuses where Requester may flag "Problem Appears Resolved" (api-spec §3.7)
const APPEARS_RESOLVED_ALLOWED_STATUSES = new Set([
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "REOPENED",
]);

interface RequesterTicketDetailProps {
  ticketId: number;
  requesterId: number;
  requesterName: string;
  onBack: () => void;
}

export function RequesterTicketDetail({
  ticketId,
  requesterId,
  requesterName,
  onBack,
}: RequesterTicketDetailProps): React.JSX.Element {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Public comments
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Appears-resolved
  const [arBusy, setArBusy] = useState(false);
  const [arError, setArError] = useState<string | null>(null);
  const [arSuccess, setArSuccess] = useState(false);

  const loadTicket = useCallback(async () => {
    setLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const data = await fetchTicketDetail(ticketId, requesterId);
      setTicket(data);
    } catch (err: any) {
      setErrorStatus(err.status || 500);
      setErrorMessage(err.message || "Failed to load ticket detail");
    } finally {
      setLoading(false);
    }
  }, [ticketId, requesterId]);

  const loadComments = useCallback(async () => {
    setCommentsLoading(true);
    try {
      const list = await fetchPublicComments(ticketId);
      setComments(list);
    } catch {
      // non-fatal — comments section shows graceful error
    } finally {
      setCommentsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicket();
    loadComments();
  }, [loadTicket, loadComments]);

  const handlePostComment = async () => {
    const body = commentDraft.trim();
    if (!body) return;
    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const newComment = await postPublicComment(ticketId, body);
      setComments((prev) => [...prev, newComment]);
      setCommentDraft("");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment. Please try again.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleAppearsResolved = async () => {
    setArBusy(true);
    setArError(null);
    try {
      const result = await markAppearsResolved(ticketId);
      // Refresh ticket to show updated appearsResolvedAt
      await loadTicket();
      setArSuccess(true);
    } catch (err: any) {
      setArError(err.message || "Failed to flag problem as appears resolved.");
    } finally {
      setArBusy(false);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return (
          <span data-testid="status-badge-NEW" className="badge fw-medium px-2 py-1" style={{ backgroundColor: "#E0F2FE", color: "#0369A1" }}>
            🔵 NEW
          </span>
        );
      case "OPEN":
        return (
          <span data-testid="status-badge-OPEN" className="badge fw-medium px-2 py-1" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
            🟡 OPEN
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span data-testid="status-badge-IN_PROGRESS" className="badge fw-medium px-2 py-1" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
            🟡 IN_PROGRESS
          </span>
        );
      case "WAITING_FOR_REQUESTER":
        return (
          <span data-testid="status-badge-WAITING_FOR_REQUESTER" className="badge fw-medium px-2 py-1" style={{ backgroundColor: "#FDE8D8", color: "#9A3412" }}>
            🟠 WAITING
          </span>
        );
      case "RESOLVED":
        return (
          <span data-testid="status-badge-RESOLVED" className="badge fw-medium px-2 py-1" style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}>
            🟢 RESOLVED
          </span>
        );
      case "CLOSED":
        return (
          <span data-testid="status-badge-CLOSED" className="badge fw-medium px-2 py-1" style={{ backgroundColor: "#F1F5F9", color: "#475569" }}>
            ⚫ CLOSED
          </span>
        );
      case "REOPENED":
        return (
          <span data-testid="status-badge-REOPENED" className="badge fw-medium px-2 py-1" style={{ backgroundColor: "#EDE9FE", color: "#6D28D9" }}>
            🔁 REOPENED
          </span>
        );
      case "CANCELLED":
        return (
          <span data-testid="status-badge-CANCELLED" className="badge fw-medium px-2 py-1" style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}>
            ⚪ CANCELLED
          </span>
        );
      default:
        return <span data-testid={`status-badge-${status}`} className="badge bg-secondary px-2 py-1">{status}</span>;
    }
  };

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return (
          <span className="badge fw-semibold px-2 py-1" style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}>
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="badge fw-semibold px-2 py-1" style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}>
            MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span className="badge fw-semibold px-2 py-1" style={{ backgroundColor: "#F1F5F9", color: "#475569" }}>
            LOW
          </span>
        );
      default:
        return <span className="badge bg-secondary px-2 py-1">{priority}</span>;
    }
  };

  const canAppearsResolved =
    ticket !== null &&
    APPEARS_RESOLVED_ALLOWED_STATUSES.has(ticket.currentStatus) &&
    !ticket.appearsResolvedAt;

  const alreadyFlagged = ticket?.appearsResolvedAt != null;

  return (
    <div className="container py-4" style={{ maxWidth: "1200px" }}>
      {/* Prominent Back Link */}
      <div className="mb-3">
        <button
          type="button"
          className="btn btn-link text-decoration-none p-0 fw-semibold d-inline-flex align-items-center gap-1"
          style={{ color: "var(--zg-secondary)" }}
          onClick={onBack}
        >
          ← Back to My Tickets
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="card card-zen p-5 text-center">
          <div className="spinner-border text-success mx-auto mb-3" role="status" />
          <p className="text-muted mb-0">Loading ticket detail...</p>
        </div>
      )}

      {/* Error States */}
      {!loading && errorStatus === 403 && (
        <div className="card card-zen p-5 text-center">
          <div className="text-danger mb-3" style={{ fontSize: "2.5rem" }}>🔒</div>
          <h4 className="fw-bold" style={{ color: "var(--zg-text-primary)" }}>Access Denied</h4>
          <p className="text-muted mb-4">You do not own this ticket and cannot view its details.</p>
          <div>
            <button type="button" className="btn btn-secondary-zen" onClick={onBack}>
              Return to My Tickets
            </button>
          </div>
        </div>
      )}

      {!loading && errorStatus === 404 && (
        <div className="card card-zen p-5 text-center">
          <div className="text-muted mb-3" style={{ fontSize: "2.5rem" }}>🔍</div>
          <h4 className="fw-bold" style={{ color: "var(--zg-text-primary)" }}>Ticket Not Found</h4>
          <p className="text-muted mb-4">The requested ticket does not exist or has been removed.</p>
          <div>
            <button type="button" className="btn btn-secondary-zen" onClick={onBack}>
              Return to My Tickets
            </button>
          </div>
        </div>
      )}

      {!loading && errorStatus && errorStatus !== 403 && errorStatus !== 404 && (
        <div className="card card-zen p-5 text-center">
          <div className="text-danger mb-3" style={{ fontSize: "2.5rem" }}>⚠️</div>
          <h4 className="fw-bold" style={{ color: "var(--zg-text-primary)" }}>Unable to Load Ticket</h4>
          <p className="text-muted mb-4">{errorMessage || "An unexpected error occurred while loading this ticket."}</p>
          <div className="d-flex justify-content-center gap-2">
            <button type="button" className="btn btn-primary-zen" onClick={loadTicket}>Retry</button>
            <button type="button" className="btn btn-secondary-zen" onClick={onBack}>Return to My Tickets</button>
          </div>
        </div>
      )}

      {/* Loaded Ticket Detail */}
      {!loading && !errorStatus && ticket && (
        <>
          {/* Read-Only Ticket Info Card */}
          <div className="card card-zen mb-4">
            <div className="card-header bg-white py-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex align-items-center gap-3">
                <span className="font-monospace fw-bold fs-4" style={{ color: "var(--zg-primary)" }}>
                  {ticket.ticketNo}
                </span>
                {renderStatusBadge(ticket.currentStatus)}
              </div>
              <div className="text-muted" style={{ fontSize: "0.9rem" }}>
                Created:{" "}
                <span className="fw-semibold text-dark">
                  {new Date(ticket.createdAt).toLocaleDateString()}{" "}
                  {new Date(ticket.createdAt).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <div className="card-body p-4">
              {/* Classification Info Row */}
              <div className="row g-3 mb-4 p-3 rounded" style={{ backgroundColor: "var(--zg-readonly-bg)" }}>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="text-muted small fw-semibold">Requester</div>
                  <div className="fw-bold text-dark">{requesterName}</div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="text-muted small fw-semibold">Category</div>
                  <div className="fw-bold text-dark">{ticket.categoryName}</div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="text-muted small fw-semibold">Related System</div>
                  <div className="fw-bold text-dark">{ticket.relatedSystemName}</div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="text-muted small fw-semibold">Ticket Owner</div>
                  <div className="fw-bold text-dark">{ticket.ticketOwnerName || "Unassigned"}</div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="text-muted small fw-semibold">Requested Priority</div>
                  <div className="mt-1">{renderPriorityBadge(ticket.requestedPriority)}</div>
                </div>
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="text-muted small fw-semibold">IT Priority</div>
                  <div className="mt-1">{renderPriorityBadge(ticket.itPriority)}</div>
                </div>
              </div>

              {/* Summary */}
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ color: "var(--zg-text-primary)" }}>
                  Summary
                </label>
                <textarea
                  className="form-control form-control-zen text-break"
                  value={ticket.summary}
                  readOnly
                  rows={2}
                  style={{ resize: "none" }}
                />
              </div>

              {/* Description */}
              <div className="mb-2">
                <label className="form-label fw-semibold" style={{ color: "var(--zg-text-primary)" }}>
                  Description
                </label>
                <textarea
                  className="form-control form-control-zen"
                  value={ticket.description}
                  readOnly
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* ── P10: Problem Appears Resolved Banner + Button ─────────────────── */}
          {alreadyFlagged && (
            <div className="alert alert-warning d-flex align-items-start gap-2 mb-4" role="alert"
              data-testid="appears-resolved-banner">
              <span>⚠️</span>
              <div>
                <strong>You indicated this problem appears resolved</strong> on{" "}
                {new Date(ticket.appearsResolvedAt!).toLocaleString()}.
                IT Staff will verify and complete formal resolution.
              </div>
            </div>
          )}

          {canAppearsResolved && (
            <div className="card card-zen mb-4">
              <div className="card-body d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div>
                  <h6 className="fw-bold mb-1" style={{ color: "var(--zg-text-primary)" }}>
                    Problem Appears Resolved?
                  </h6>
                  <p className="text-muted small mb-0">
                    If the issue seems resolved, notify IT Staff. They will verify and formally close the ticket.
                  </p>
                </div>
                <div>
                  {arError && (
                    <div className="alert alert-danger py-1 px-2 mb-2 small" role="alert">{arError}</div>
                  )}
                  {arSuccess && (
                    <div className="alert alert-success py-1 px-2 mb-2 small" role="alert">
                      Flagged — IT Staff notified.
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-warning fw-semibold"
                    data-testid="appears-resolved-btn"
                    disabled={arBusy}
                    onClick={handleAppearsResolved}
                  >
                    {arBusy ? (
                      <><span className="spinner-border spinner-border-sm me-1" role="status" /> Submitting…</>
                    ) : (
                      "✅ Problem Appears Resolved"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── P10: Public Comments ─────────────────────────────────────────── */}
          <div className="card card-zen mb-4" data-testid="public-comments-panel">
            <div className="card-header bg-white py-3 border-bottom">
              <h6 className="fw-bold mb-0" style={{ color: "var(--zg-text-primary)" }}>
                💬 Public Comments
              </h6>
            </div>
            <div className="card-body p-4">
              {/* Comments List */}
              {commentsLoading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-secondary" role="status" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-muted fst-italic small mb-4">No comments yet. Be the first to leave a comment.</p>
              ) : (
                <div className="mb-4" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  {comments.map((c) => (
                    <div key={c.id} className="mb-3 pb-3 border-bottom">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="fw-semibold small" style={{ color: "var(--zg-text-primary)" }}>
                          {c.author.name}
                        </span>
                        <span
                          className="badge small"
                          style={{
                            backgroundColor:
                              c.author.role === "IT_STAFF" ? "#DCFCE7" : c.author.role === "ADMINISTRATOR" ? "#FEE2E2" : "#E0F2FE",
                            color:
                              c.author.role === "IT_STAFF" ? "#15803D" : c.author.role === "ADMINISTRATOR" ? "#B91C1C" : "#0369A1",
                          }}
                        >
                          {c.author.role === "IT_STAFF" ? "IT Staff" : c.author.role === "ADMINISTRATOR" ? "Admin" : "Requester"}
                        </span>
                        <span className="text-muted small ms-auto">
                          {new Date(c.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="mb-0 small" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {c.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* New Comment Form */}
              <div>
                <label htmlFor={`comment-input-${ticketId}`} className="form-label fw-semibold small"
                  style={{ color: "var(--zg-text-primary)" }}>
                  Add a Comment
                </label>
                <textarea
                  id={`comment-input-${ticketId}`}
                  data-testid="public-comment-input"
                  className="form-control form-control-zen mb-2"
                  rows={3}
                  placeholder="Write a public comment visible to IT Staff…"
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  disabled={commentSubmitting}
                  maxLength={2000}
                />
                {commentError && (
                  <div className="alert alert-danger py-1 px-2 mb-2 small" role="alert">
                    {commentError}
                  </div>
                )}
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small">{commentDraft.length}/2000</span>
                  <button
                    type="button"
                    className="btn btn-primary-zen btn-sm"
                    data-testid="submit-public-comment-btn"
                    disabled={commentSubmitting || commentDraft.trim().length === 0}
                    onClick={handlePostComment}
                  >
                    {commentSubmitting ? (
                      <><span className="spinner-border spinner-border-sm me-1" role="status" />Posting…</>
                    ) : (
                      "Post Comment"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Embedded Attachment Section */}
          <AttachmentSection
            ticketId={ticket.id}
            requesterId={requesterId}
            initialAttachments={ticket.attachments}
          />
        </>
      )}
    </div>
  );
}

export default RequesterTicketDetail;
