/**
 * RegisterPage.jsx
 *
 * Controlled-form registration page.
 *
 * After a successful form submission:
 *   - AuthContext.register() creates the account AND immediately logs in.
 *   - On success the user is navigated directly to /app (no manual login step).
 *   - On rare auto-login failure, the user is redirected to /login with a note.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "../../components/ThemeToggle";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../utils/errorUtils";
import "./AuthPages.css";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });
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
      // register() creates the account then auto-logs in, returning the user.
      // On success the user state in AuthContext is already set, so navigating
      // to /app is safe — ProtectedRoute will allow it.
      await register(form.firstName, form.lastName, form.email, form.password);
      navigate("/app", { replace: true });
    } catch (err) {
      if (err.message === "AUTO_LOGIN_FAILED") {
        // Account was created but auto-login failed — send to login page.
        navigate("/login", {
          replace: true,
          state: { registrationSuccess: true },
        });
        return;
      }
      setError(getErrorMessage(err, "Registration failed. Please try again."));
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
            <h1 className="auth-card__title">Create your account</h1>
            <p className="auth-card__subtitle">
              Already have an account?{" "}
              <Link id="login-link" to="/login" className="auth-link">
                Sign in
              </Link>
            </p>
          </div>

          {error && (
            <div id="register-error" className="auth-error" role="alert">
              {error}
            </div>
          )}

          <form id="register-form" onSubmit={handleSubmit} noValidate>
            <div className="auth-row">
              <div className="auth-field">
                <label htmlFor="register-firstName" className="auth-label">
                  First name
                </label>
                <input
                  id="register-firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  minLength={2}
                  maxLength={50}
                  value={form.firstName}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Jane"
                  disabled={isSubmitting}
                />
              </div>

              <div className="auth-field">
                <label htmlFor="register-lastName" className="auth-label">
                  Last name
                </label>
                <input
                  id="register-lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  minLength={2}
                  maxLength={50}
                  value={form.lastName}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Doe"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="register-email" className="auth-label">
                Email address
              </label>
              <input
                id="register-email"
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
              <label htmlFor="register-password" className="auth-label">
                Password
                <span className="auth-label__hint">(min 8 characters)</span>
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={form.password}
                onChange={handleChange}
                className="auth-input"
                placeholder="••••••••"
                disabled={isSubmitting}
              />
            </div>

            <button
              id="register-submit"
              type="submit"
              className="auth-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
