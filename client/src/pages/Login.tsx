import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

interface LoginProps {
  onSuccess: (role: string, mustChangePassword: boolean) => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      nextErrors.email = "Email address is required";
    }
    if (!password) {
      nextErrors.password = "Password is required";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const user = await login(email.trim(), password);
      onSuccess(user.role, user.mustChangePassword);
    } catch (err: any) {
      if (err.status === 429) {
        setErrorMessage("Too many failed attempts. Please try again later.");
      } else {
        setErrorMessage(err.message || "Invalid email or password");
      }
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
          maxWidth: "440px",
          backgroundColor: "var(--zg-surface)",
          borderColor: "var(--zg-border)",
          borderRadius: "8px",
        }}
      >
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center p-2 rounded-circle mb-2" style={{ backgroundColor: "var(--zg-pale-green)", fontSize: "1.8rem" }}>
            🌿
          </div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--zg-primary)" }}>
            TokTickIT
          </h1>
          <p className="text-muted small mb-0">Sign in to your account</p>
        </div>

        {errorMessage && (
          <div
            className="alert alert-danger py-2 px-3 small mb-3"
            role="alert"
            data-testid="login-error-alert"
            style={{
              backgroundColor: "var(--zg-error-bg)",
              color: "var(--zg-error)",
              borderColor: "var(--zg-error)",
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="login-email" className="form-label fw-semibold small" style={{ color: "var(--zg-text-primary)" }}>
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className={`form-control ${errors.email ? "is-invalid" : ""}`}
              placeholder="name@example.com"
              autoFocus
              disabled={isSubmitting}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              data-testid="login-email-input"
              aria-describedby={errors.email ? "login-email-error" : undefined}
            />
            {errors.email && (
              <div id="login-email-error" className="invalid-feedback d-block" style={{ color: "var(--zg-error)" }}>
                {errors.email}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="login-password" className="form-label fw-semibold small" style={{ color: "var(--zg-text-primary)" }}>
              Password
            </label>
            <div className="input-group">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className={`form-control ${errors.password ? "is-invalid" : ""}`}
                placeholder="Enter password"
                disabled={isSubmitting}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                data-testid="login-password-input"
                aria-describedby={errors.password ? "login-password-error" : undefined}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                disabled={isSubmitting}
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
                data-testid="toggle-password-visibility"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
            {errors.password && (
              <div id="login-password-error" className="invalid-feedback d-block" style={{ color: "var(--zg-error)" }}>
                {errors.password}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn w-100 py-2 fw-semibold"
            disabled={isSubmitting}
            style={{
              backgroundColor: "var(--zg-primary)",
              color: "#FFFFFF",
              borderColor: "var(--zg-primary)",
            }}
            data-testid="login-submit-button"
          >
            {isSubmitting ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
export default Login;
