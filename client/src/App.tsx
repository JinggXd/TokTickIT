import React, { useCallback, useEffect, useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { AppShell } from "./components/AppShell.js";
import { RequesterSelection } from "./pages/RequesterSelection.js";
import { CreateTicket } from "./pages/CreateTicket.js";
import { RouteGuard } from "./components/RouteGuard.js";

type TabType = "my-tickets" | "create-ticket" | "select-requester";

const TAB_PATHS: Record<TabType, string> = {
  "my-tickets": "/my-tickets",
  "create-ticket": "/create-ticket",
  "select-requester": "/select-requester",
};

function getTabFromPath(pathname = window.location.pathname): TabType {
  if (pathname === TAB_PATHS["create-ticket"]) return "create-ticket";
  if (pathname === TAB_PATHS["select-requester"]) return "select-requester";
  return "my-tickets";
}

function MainContent() {
  const { currentRequester, isLoading } = useRequester();
  const [activeTab, setActiveTab] = useState<TabType>(() => getTabFromPath());

  const navigate = useCallback((tab: TabType, replace = false) => {
    const nextPath = TAB_PATHS[tab];
    if (window.location.pathname !== nextPath) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", nextPath);
    }
    setActiveTab(tab);
  }, []);

  useEffect(() => {
    const handlePopState = () => setActiveTab(getTabFromPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (!isLoading && !currentRequester && activeTab !== "select-requester") {
      navigate("select-requester", true);
    }
  }, [activeTab, currentRequester, isLoading, navigate]);

  const currentView = !isLoading && !currentRequester ? "select-requester" : activeTab;

  return (
    <AppShell currentTab={currentView} onTabChange={navigate}>
      {currentView === "select-requester" && (
        <RequesterSelection onSuccess={() => navigate("my-tickets")} />
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
                onClick={() => navigate("create-ticket")}
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
          <CreateTicket
            onSuccess={() => {
              // Option to stay on success screen or navigate
            }}
            onCancel={() => navigate("my-tickets")}
          />
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
