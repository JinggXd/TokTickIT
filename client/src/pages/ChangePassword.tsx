import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

interface ChangePasswordProps {
  onSuccess: () => void;
  onCancel?: () => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ onSuccess, onCancel }) => {
  const { user, changePassword, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const isMandatory = user?.mustChangePassword === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const nextErrors: {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};

    if (!currentPassword) {
      nextErrors.currentPassword = "Current password is required";
    }

    const codePoints = Array.from(newPassword).length;
    if (codePoints < 12 || codePoints > 128) {
      nextErrors.newPassword = "Password must be between 12 and 128 characters.";
    }

    if (newPassword && currentPassword && newPassword === currentPassword) {
      nextErrors.newPassword = "New password must be different from current password";
    }

    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const updatedUser = await changePassword(currentPassword, newPassword, confirmPassword);
      setSuccessMessage("Password changed successfully! Redirecting...");
      setTimeout(() => {
        updateUser(updatedUser);
        onSuccess();
      }, 1000);
    } catch (err: any) {
      if (err.details) {
        setErrors(err.details);
      }
      setErrorMessage(err.message || "Unable to update password. Please check your inputs.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{ backgroundColor: "var(--zg-canvas)" }}
    >
      <div
        className="card shadow-sm border p-4 w-100"
        style={{
          maxWidth: "520px",
          backgroundColor: "var(--zg-surface)",
          borderColor: "var(--zg-border)",
          borderRadius: "8px",
        }}
      >
        <div className="mb-4">
          <h1 className="h4 fw-bold mb-1" style={{ color: "var(--zg-primary)" }}>
            Change Password
          </h1>
          <p className="text-muted small mb-0">
            {isMandatory
              ? "Set a new personal password to activate your account."
              : "Update your password to keep your account secure."}
          </p>
        </div>

        {isMandatory && (
          <div
            className="alert alert-warning py-2 px-3 small mb-3 d-flex align-items-center gap-2"
            role="alert"
            data-testid="mandatory-change-alert"
            style={{
              backgroundColor: "var(--zg-warning-bg)",
              color: "var(--zg-warning)",
              borderColor: "var(--zg-warning)",
            }}
          >
            <span>⚠️</span>
            <span>You are required to set a new password before proceeding.</span>
          </div>
        )}

        <div
          className="alert py-2 px-3 small mb-3"
          style={{
            backgroundColor: "var(--zg-pale-green)",
            color: "var(--zg-text-primary)",
            borderColor: "var(--zg-secondary)",
          }}
        >
          ℹ️ Password must be between 12 and 128 characters.
        </div>

        {errorMessage && (
          <div
            className="alert alert-danger py-2 px-3 small mb-3"
            role="alert"
            data-testid="change-password-error-alert"
            style={{
              backgroundColor: "var(--zg-error-bg)",
              color: "var(--zg-error)",
              borderColor: "var(--zg-error)",
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            className="alert alert-success py-2 px-3 small mb-3"
            role="alert"
            data-testid="change-password-success-alert"
            style={{
              backgroundColor: "var(--zg-success-bg)",
              color: "var(--zg-success)",
              borderColor: "var(--zg-success)",
            }}
          >
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="current-password" className="form-label fw-semibold small" style={{ color: "var(--zg-text-primary)" }}>
              Current Password
            </label>
            <input
              id="current-password"
              type="password"
              className={`form-control ${errors.currentPassword ? "is-invalid" : ""}`}
              placeholder="Enter current password"
              autoFocus
              disabled={isSubmitting}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (errors.currentPassword) setErrors((prev) => ({ ...prev, currentPassword: undefined }));
              }}
              data-testid="current-password-input"
            />
            {errors.currentPassword && (
              <div className="invalid-feedback d-block" style={{ color: "var(--zg-error)" }}>
                {errors.currentPassword}
              </div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="new-password" className="form-label fw-semibold small" style={{ color: "var(--zg-text-primary)" }}>
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              className={`form-control ${errors.newPassword ? "is-invalid" : ""}`}
              placeholder="Enter at least 12 characters"
              disabled={isSubmitting}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
              }}
              data-testid="new-password-input"
            />
            {errors.newPassword && (
              <div className="invalid-feedback d-block" style={{ color: "var(--zg-error)" }}>
                {errors.newPassword}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="confirm-password" className="form-label fw-semibold small" style={{ color: "var(--zg-text-primary)" }}>
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
              placeholder="Re-enter new password"
              disabled={isSubmitting}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              data-testid="confirm-password-input"
            />
            {errors.confirmPassword && (
              <div className="invalid-feedback d-block" style={{ color: "var(--zg-error)" }}>
                {errors.confirmPassword}
              </div>
            )}
          </div>

          <div className="d-flex gap-2 justify-content-end">
            {!isMandatory && onCancel && (
              <button
                type="button"
                className="btn btn-outline-secondary px-4 py-2 fw-semibold"
                disabled={isSubmitting}
                onClick={onCancel}
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn px-4 py-2 fw-semibold"
              disabled={isSubmitting}
              style={{
                backgroundColor: "var(--zg-primary)",
                color: "#FFFFFF",
                borderColor: "var(--zg-primary)",
              }}
              data-testid="update-password-submit-button"
            >
              {isSubmitting ? (
                <span className="d-flex align-items-center gap-2">
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  Updating...
                </span>
              ) : (
                "Update Password"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default ChangePassword;
