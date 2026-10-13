import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "../../components/ThemeToggle";
import { LogoIcon, AlertCircleIcon } from "../../components/icons";
import { useAuth } from "../../hooks/useAuth";
import { getErrorMessage } from "../../utils/errorUtils";
import "./AuthPages.css";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/app";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="auth-container">
      <header className="auth-page-topbar">
        <ThemeToggle />
      </header>

      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-card__header">
            <div className="auth-card__logo-container">
              <span className="auth-card__logo" aria-hidden="true">
                <LogoIcon size={26} />
              </span>
            </div>
            <h1 className="auth-card__title">Sign in to DevFlow AI</h1>
            <p className="auth-card__subtitle">
              Don&apos;t have an account?{" "}
              <Link id="register-link" to="/register" className="auth-link">
                Create an account
              </Link>
            </p>
          </div>

          {error && (
            <div id="login-error" className="auth-error" role="alert">
              <AlertCircleIcon size={16} />
              <span>{error}</span>
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
                placeholder="developer@devflow.ai"
                disabled={isSubmitting}
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="login-password" className="auth-label">
                  Password
                </label>
                <button
                  type="button"
                  className="auth-password-toggle"
                  onClick={() => setShowPassword((prev) => !prev)}
                  tabIndex={-1}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleChange}
                className="auth-input"
                placeholder="••••••••••••"
                disabled={isSubmitting}
              />
            </div>

            <button
              id="login-submit"
              type="submit"
              className="auth-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in…" : "Sign in to workspace"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
