import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { RequesterUser } from "../types.js";
import { fetchActiveRequesters } from "../api.js";

interface RequesterSelectionProps {
  onSuccess?: () => void;
}

export const RequesterSelection: React.FC<RequesterSelectionProps> = ({ onSuccess }) => {
  const { setRequester } = useRequester();
  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchRequesters() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActiveRequesters();
      setRequesters(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requesters");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequesters();
  }, []);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const selected = requesters.find((r) => String(r.id) === selectedId);
    if (selected) {
      setRequester(selected);
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  return (
    <div className="container py-5" style={{ maxWidth: 580 }}>
      {/* Header icon and title */}
      <div className="text-center mb-4">
        <div
          className="d-inline-flex align-items-center justify-content-center mb-3 rounded-circle"
          style={{
            width: 56,
            height: 56,
            backgroundColor: "var(--zg-pale-green)",
            color: "var(--zg-primary)",
            fontSize: "1.75rem",
          }}
        >
          👤
        </div>
        <h1 className="h3 fw-bold" style={{ color: "var(--zg-text-primary)" }}>
          Select Development Requester
        </h1>
        <p className="text-muted small mb-0">
          Choose a development requester to simulate the current requester context for Lab 2.
          <br />
          <strong>This is for testing only and is not a login screen.</strong>
        </p>
      </div>

      <div className="card card-zen p-4">
        {loading ? (
          <div className="text-center py-5" data-testid="loading-state">
            <div className="spinner-border text-success mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted mb-0">Loading Development Requesters…</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger mb-0" role="alert" data-testid="error-state">
            <h6 className="alert-heading fw-bold mb-1">Failed to Load Requesters</h6>
            <p className="small mb-3">{error}</p>
            <button className="btn btn-sm btn-outline-danger" onClick={fetchRequesters}>
              Try Again
            </button>
          </div>
        ) : requesters.length === 0 ? (
          <div className="alert alert-warning mb-0" role="alert" data-testid="empty-state">
            <h6 className="alert-heading fw-bold mb-1">No Active Requesters</h6>
            <p className="small mb-0">
              No active Development Requesters are available — contact your instructor.
            </p>
          </div>
        ) : (
          <form onSubmit={handleContinue} data-testid="requester-form">
            <div className="mb-3">
              <label htmlFor="requester-select" className="form-label fw-semibold">
                Development Requester <span style={{ color: "var(--zg-error)" }}>*</span>
              </label>
              <select
                id="requester-select"
                className="form-select form-select-zen"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
                data-testid="requester-dropdown"
              >
                <option value="" disabled>
                  Select a Development Requester
                </option>
                {requesters.map((req) => (
                  <option key={req.id} value={req.id}>
                    {req.name} ({req.department}) — {req.email}
                  </option>
                ))}
              </select>
              <div className="form-text mt-2" style={{ color: "var(--zg-text-muted)", fontSize: "0.85rem" }}>
                ℹ️ Only active development requesters are shown.
              </div>
            </div>

            {/* Explanatory callout */}
            <div
              className="p-3 mb-4 rounded"
              style={{
                backgroundColor: "var(--zg-pale-green)",
                border: "1px solid var(--zg-border)",
              }}
            >
              <h6 className="fw-bold mb-1" style={{ color: "var(--zg-primary)", fontSize: "0.9rem" }}>
                🛡️ Authentication coming in Lab 3
              </h6>
              <p className="mb-0 small" style={{ color: "var(--zg-text-muted)" }}>
                In Lab 3, this selection will be replaced with secure authentication so you can access the system with your own account.
              </p>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="submit"
                className="btn btn-primary-zen px-4"
                disabled={!selectedId}
                data-testid="continue-button"
              >
                Continue →
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
export default RequesterSelection;
