import React from "react";
import { useRequester } from "../context/RequesterContext.js";
import { RequesterSelection } from "../pages/RequesterSelection.js";

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * RouteGuard (FR-02, AC-02, UI-10):
 * Prevents access to protected ticket views when no Development Requester is selected.
 * Displays the Requester Selection screen if context is empty.
 */
export const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { currentRequester, isLoading } = useRequester();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5" data-testid="routeguard-loading">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading session...</span>
        </div>
      </div>
    );
  }

  if (!currentRequester) {
    return <RequesterSelection />;
  }

  return <>{children}</>;
};

export default RouteGuard;
