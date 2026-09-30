/**
 * ProtectedRoute.jsx
 *
 * Guards routes that require authentication.
 *
 * Behaviour:
 * - While auth state is loading (session restore in progress), renders nothing
 *   to avoid a flash of the login page.
 * - Unauthenticated users are redirected to /login, with the originally
 *   requested location saved in router state so they can return after login.
 * - Authenticated users are rendered normally via <Outlet />.
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Don't flash the login page while we check credentials.
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
