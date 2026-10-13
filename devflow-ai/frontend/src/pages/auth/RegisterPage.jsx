import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "../../components/ThemeToggle";
import { LogoIcon, AlertCircleIcon } from "../../components/icons";
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
      await register(form.firstName, form.lastName, form.email, form.password);
      navigate("/app", { replace: true });
    } catch (err) {
      if (err.message === "AUTO_LOGIN_FAILED") {
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
              <AlertCircleIcon size={16} />
              <span>{error}</span>
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
                placeholder="developer@devflow.ai"
                disabled={isSubmitting}
              />
            </div>

            <div className="auth-field">
              <div className="auth-label-row">
                <label htmlFor="register-password" className="auth-label">
                  Password
                  <span className="auth-label__hint">(min 8 characters)</span>
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
                id="register-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={form.password}
                onChange={handleChange}
                className="auth-input"
                placeholder="••••••••••••"
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
    </div>
  );
}
