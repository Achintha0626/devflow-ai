/**
 * LoginPage.jsx
 *
 * Controlled-form login page.
 * On success: navigates to the originally requested protected route, or /app.
 * On failure: displays the exact message returned by the backend.
 */

import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../utils/errorUtils";
import "./AuthPages.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If the user was redirected here from a protected route, send them back there
  // after successful login.
  const from = location.state?.from?.pathname || "/app";

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(form.email, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="auth-page-topbar">
        <ThemeToggle />
      </div>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__header">
            <span className="auth-card__logo" aria-hidden="true">⬡</span>
            <h1 className="auth-card__title">Sign in to DevFlow AI</h1>
            <p className="auth-card__subtitle">
              Don&apos;t have an account?{" "}
              <Link id="register-link" to="/register" className="auth-link">
                Create one
              </Link>
            </p>
          </div>

          {error && (
            <div id="login-error" className="auth-error" role="alert">
              {error}
            </div>
          )}

          <form id="login-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="login-email" className="auth-label">
                Email address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                className="auth-input"
                placeholder="you@example.com"
                disabled={isSubmitting}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="login-password" className="auth-label">
                Password
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleChange}
                className="auth-input"
                placeholder="••••••••"
                disabled={isSubmitting}
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="auth-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
