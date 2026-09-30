/**
 * AppLayout.jsx
 *
 * Minimal shell for authenticated pages.
 * Contains DevFlow AI branding, theme toggle, current user info, and logout.
 * Child pages are rendered via <Outlet />.
 */

import { Outlet } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { useAuth } from "../hooks/useAuth";
import "./AppLayout.css";

export function AppLayout() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    // Navigation to /login is handled by ProtectedRoute detecting
    // isAuthenticated === false after logout clears the user state.
  };

  const displayName =
    user ? `${user.firstName} ${user.lastName}`.trim() : "";

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__brand">
          <span className="app-header__logo" aria-hidden="true">⬡</span>
          <span className="app-header__name">DevFlow AI</span>
        </div>

        <div className="app-header__controls">
          <ThemeToggle />

          {user && (
            <div className="app-header__user">
              <span className="app-header__user-name">{displayName}</span>
              <span className="app-header__user-email">{user.email}</span>
              <button
                id="logout-button"
                className="app-header__logout-btn"
                onClick={handleLogout}
                type="button"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
