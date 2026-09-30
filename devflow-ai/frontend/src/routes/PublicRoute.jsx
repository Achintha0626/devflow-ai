/**
 * PublicRoute.jsx
 *
 * Redirects already-authenticated users away from public-only pages
 * (login, register) to the main app.
 */

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return <Outlet />;
}
