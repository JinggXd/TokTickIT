import React, { useEffect, useState } from "react";
import { fetchTicketDetail, TicketDetail } from "../api.js";
import AttachmentSection from "../components/AttachmentSection.js";

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

  const loadTicket = async () => {
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
  };

  useEffect(() => {
    loadTicket();
  }, [ticketId, requesterId]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return (
          <span
            className="badge fw-medium px-2 py-1"
            style={{ backgroundColor: "#E0F2FE", color: "#0369A1" }}
          >
            🔵 NEW
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span
            className="badge fw-medium px-2 py-1"
            style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
          >
            🟡 IN_PROGRESS
          </span>
        );
      case "RESOLVED":
        return (
          <span
            className="badge fw-medium px-2 py-1"
            style={{ backgroundColor: "#DCFCE7", color: "#15803D" }}
          >
            🟢 RESOLVED
          </span>
        );
      default:
        return <span className="badge bg-secondary px-2 py-1">{status}</span>;
    }
  };

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "HIGH":
        return (
          <span
            className="badge fw-semibold px-2 py-1"
            style={{ backgroundColor: "#FEE2E2", color: "#B91C1C" }}
          >
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span
            className="badge fw-semibold px-2 py-1"
            style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}
          >
            MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span
            className="badge fw-semibold px-2 py-1"
            style={{ backgroundColor: "#F1F5F9", color: "#475569" }}
          >
            LOW
          </span>
        );
      default:
        return <span className="badge bg-secondary px-2 py-1">{priority}</span>;
    }
  };

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
          <div className="text-danger mb-3" style={{ fontSize: "2.5rem" }}>
            🔒
          </div>
          <h4 className="fw-bold" style={{ color: "var(--zg-text-primary)" }}>
            Access Denied
          </h4>
          <p className="text-muted mb-4">
            You do not own this ticket and cannot view its details.
          </p>
          <div>
            <button type="button" className="btn btn-secondary-zen" onClick={onBack}>
              Return to My Tickets
            </button>
          </div>
        </div>
      )}

      {!loading && errorStatus === 404 && (
        <div className="card card-zen p-5 text-center">
          <div className="text-muted mb-3" style={{ fontSize: "2.5rem" }}>
            🔍
          </div>
          <h4 className="fw-bold" style={{ color: "var(--zg-text-primary)" }}>
            Ticket Not Found
          </h4>
          <p className="text-muted mb-4">
            The requested ticket does not exist or has been removed.
          </p>
          <div>
            <button type="button" className="btn btn-secondary-zen" onClick={onBack}>
              Return to My Tickets
            </button>
          </div>
        </div>
      )}

      {!loading && errorStatus && errorStatus !== 403 && errorStatus !== 404 && (
        <div className="card card-zen p-5 text-center">
          <div className="text-danger mb-3" style={{ fontSize: "2.5rem" }}>
            ⚠️
          </div>
          <h4 className="fw-bold" style={{ color: "var(--zg-text-primary)" }}>
            Unable to Load Ticket
          </h4>
          <p className="text-muted mb-4">
            {errorMessage || "An unexpected error occurred while loading this ticket."}
          </p>
          <div className="d-flex justify-content-center gap-2">
            <button type="button" className="btn btn-primary-zen" onClick={loadTicket}>
              Retry
            </button>
            <button type="button" className="btn btn-secondary-zen" onClick={onBack}>
              Return to My Tickets
            </button>
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
                  {new Date(ticket.createdAt).toLocaleDateString()} {new Date(ticket.createdAt).toLocaleTimeString()}
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
                <input
                  type="text"
                  className="form-control form-control-zen"
                  value={ticket.summary}
                  readOnly
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
