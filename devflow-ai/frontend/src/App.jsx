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
 *   /app       → ProtectedRoute → AppLayout → workspace selection
 *   /app/workspaces/:workspaceId/projects → project selection
 *   /app/workspaces/:workspaceId/projects/:projectId → ProjectLayout → Overview
 *   /app/workspaces/:workspaceId/projects/:projectId/tasks → project tasks
 *   /app/workspaces/:workspaceId/projects/:projectId/kanban → Kanban board
 *   *          → redirects to /login
 */

import { Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AppLayout } from "./layouts/AppLayout";
import { ProjectLayout } from "./layouts/ProjectLayout";
import { KanbanPage } from "./pages/app/KanbanPage";
import { ProjectOverviewPage } from "./pages/app/ProjectOverviewPage";
import { ProjectSelectionPage } from "./pages/app/ProjectSelectionPage";
import { SprintsPage } from "./pages/app/SprintsPage";
import { TasksPage } from "./pages/app/TasksPage";
import { WorkspaceSelectionPage } from "./pages/app/WorkspaceSelectionPage";
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
            <Route path="/app" element={<AppLayout />}>
              <Route index element={<Navigate to="workspaces" replace />} />
              <Route path="workspaces" element={<WorkspaceSelectionPage />} />
              <Route
                path="workspaces/:workspaceId/projects"
                element={<ProjectSelectionPage />}
              />
              <Route
                path="workspaces/:workspaceId/projects/:projectId"
                element={<ProjectLayout />}
              >
                <Route index element={<ProjectOverviewPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="kanban" element={<KanbanPage />} />
                <Route path="sprints" element={<SprintsPage />} />
              </Route>
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
