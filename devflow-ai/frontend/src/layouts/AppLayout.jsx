import { Outlet, Link } from "react-router-dom";
import { ThemeToggle } from "../components/ThemeToggle";
import { LogoIcon, LogOutIcon } from "../components/icons";
import { useAuth } from "../hooks/useAuth";
import "./AppLayout.css";

export function AppLayout() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : "";
  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "U";

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__left">
          <Link to="/app/workspaces" className="app-header__brand">
            <span className="app-header__logo-wrapper">
              <LogoIcon size={18} />
            </span>
            <span className="app-header__name">DevFlow AI</span>
            <span className="app-header__badge">Workspace</span>
          </Link>
        </div>

        <div className="app-header__controls">
          <ThemeToggle />

          {user && (
            <div className="app-header__user-pill">
              <div className="app-header__avatar" aria-hidden="true">
                {initials}
              </div>
              <div className="app-header__user-info">
                <span className="app-header__user-name">{displayName}</span>
                <span className="app-header__user-email">{user.email}</span>
              </div>
              <button
                id="logout-button"
                className="app-header__logout-btn"
                onClick={handleLogout}
                type="button"
                title="Sign out"
              >
                <LogOutIcon size={14} />
                <span>Sign out</span>
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
