import React, { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
import { RequesterSelection } from "./pages/RequesterSelection.js";
import { RouteGuard } from "./components/RouteGuard.js";

type TabType = "my-tickets" | "create-ticket" | "select-requester";

function MainContent() {
  const { currentRequester } = useRequester();
  const [activeTab, setActiveTab] = useState<TabType>("my-tickets");

  // If no requester is selected, force tab to selection
  const currentView = !currentRequester ? "select-requester" : activeTab;

  return (
    <AppShell currentTab={currentView} onTabChange={setActiveTab}>
      {currentView === "select-requester" && (
        <RequesterSelection onSuccess={() => setActiveTab("my-tickets")} />
      )}

      {currentView === "my-tickets" && (
        <RouteGuard>
          <div className="container py-4" style={{ maxWidth: 1000 }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="h3 fw-bold mb-1">My Tickets</h1>
                <p className="text-muted small mb-0">View and track all of your support requests.</p>
              </div>
              <button
                className="btn btn-primary-zen"
                onClick={() => setActiveTab("create-ticket")}
                data-testid="create-ticket-header-btn"
              >
                + Create Ticket
              </button>
            </div>
            <div className="card card-zen p-5 text-center">
              <div className="py-4">
                <span style={{ fontSize: "2.5rem" }}>📋</span>
                <h5 className="mt-3 fw-bold">My Tickets Workspace</h5>
                <p className="text-muted small mb-0">
                  Tickets belonging to <strong>{currentRequester?.name}</strong> ({currentRequester?.department}) will load here in Phase 4.
                </p>
              </div>
            </div>
          </div>
        </RouteGuard>
      )}

      {currentView === "create-ticket" && (
        <RouteGuard>
          <div className="container py-4" style={{ maxWidth: 800 }}>
            <div className="mb-4">
              <h1 className="h3 fw-bold mb-1">Create Ticket</h1>
              <p className="text-muted small mb-0">Submit a new IT support request.</p>
            </div>
            <div className="card card-zen p-5 text-center">
              <div className="py-4">
                <span style={{ fontSize: "2.5rem" }}>➕</span>
                <h5 className="mt-3 fw-bold">Create Ticket Form</h5>
                <p className="text-muted small mb-0">
                  New ticket submission form for <strong>{currentRequester?.name}</strong> will be built in Phase 3.
                </p>
              </div>
            </div>
          </div>
        </RouteGuard>
      )}
    </AppShell>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <MainContent />
    </RequesterProvider>
  );
}