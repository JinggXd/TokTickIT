import React from "react";
import { useRequester } from "../context/RequesterContext.js";

interface AppShellProps {
  currentTab: "my-tickets" | "create-ticket" | "select-requester";
  onTabChange: (tab: "my-tickets" | "create-ticket" | "select-requester") => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  children,
}) => {
  const { currentRequester, clearRequester } = useRequester();

  const handleChangeRequester = () => {
    onTabChange("select-requester");
  };

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--zg-canvas)" }}>
      {/* Zen Green Navigation Header (ui-spec.md Section 9) */}
      <header className="navbar navbar-expand navbar-zen px-3 px-md-4 py-2 sticky-top shadow-sm">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          {/* Brand Logo & Name */}
          <div className="d-flex align-items-center gap-3">
            <span
              className="navbar-brand d-flex align-items-center gap-2 mb-0 cursor-pointer"
              style={{ cursor: "pointer" }}
              onClick={() => onTabChange("my-tickets")}
            >
              <span style={{ fontSize: "1.3rem" }}>🎫</span>
              <span className="fw-bold">TokTickIT</span>
            </span>

            {/* Navigation links (only when logged in) */}
            {currentRequester && (
              <nav className="d-flex gap-2 ms-3">
                <button
                  className={`btn btn-sm nav-link-zen ${currentTab === "my-tickets" ? "active" : ""}`}
                  onClick={() => onTabChange("my-tickets")}
                  data-testid="nav-my-tickets"
                >
                  📋 My Tickets
                </button>
                <button
                  className={`btn btn-sm nav-link-zen ${currentTab === "create-ticket" ? "active" : ""}`}
                  onClick={() => onTabChange("create-ticket")}
                  data-testid="nav-create-ticket"
                >
                  ➕ Create Ticket
                </button>
              </nav>
            )}
          </div>

          {/* Right-side Requester Profile & Change Action */}
          <div className="d-flex align-items-center gap-2">
            {currentRequester ? (
              <div className="d-flex align-items-center gap-2" data-testid="user-profile-badge">
                <div className="badge-requester d-flex align-items-center gap-2">
                  <span>👤</span>
                  <span className="fw-semibold">{currentRequester.name}</span>
                  <span className="opacity-75 d-none d-sm-inline">({currentRequester.department})</span>
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-light py-1 px-2"
                  style={{ fontSize: "0.8rem", borderRadius: "16px" }}
                  onClick={handleChangeRequester}
                  data-testid="change-requester-button"
                  title="Switch to another Development Requester"
                >
                  Change
                </button>
              </div>
            ) : (
              <span className="badge bg-light text-dark">Select Requester</span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow-1 py-4">{children}</main>

      {/* Footer */}
      <footer className="py-3 text-center text-muted small border-top" style={{ backgroundColor: "var(--zg-surface)" }}>
        TokTickIT Requester Portal • CPE 334 Lab 2
      </footer>
    </div>
  );
};
export default AppShell;
