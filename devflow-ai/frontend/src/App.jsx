/**
 * App.jsx
 *
 * Root application component.
 * Provider order (outer → inner):
 *   ThemeProvider — manages light/dark theme, applies data-theme to <html>
 *   AuthProvider  — manages authentication state
 *   Routes        — react-router-dom v7 route tree
 *
 * Route structure:
 *   /          → redirects to /login
 *   /login     → LoginPage  (public only; authenticated users → /app)
 *   /register  → RegisterPage (public only; authenticated users → /app)
 *   /app       → ProtectedRoute → AppLayout → DashboardPlaceholder
 *   *          → redirects to /login
 */

import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPlaceholder } from "./pages/app/DashboardPlaceholder";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { PublicRoute } from "./routes/PublicRoute";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* Public-only routes: redirect authenticated users to /app */}
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected routes: redirect unauthenticated users to /login */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/app" element={<DashboardPlaceholder />} />
            </Route>
          </Route>

          {/* Catch-all and root redirects */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
