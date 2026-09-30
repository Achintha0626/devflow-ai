/**
 * DashboardPlaceholder.jsx
 *
 * Temporary placeholder rendered at /app.
 * The full DevFlow AI workspace (Kanban, projects, AI planner, etc.)
 * will be implemented in a later phase and replace this component.
 */

import { useAuth } from "../../hooks/useAuth";
import "./DashboardPlaceholder.css";

export function DashboardPlaceholder() {
  const { user } = useAuth();

  const firstName = user?.firstName || "there";

  return (
    <div className="dashboard-placeholder">
      <div className="dashboard-placeholder__card">
        <div className="dashboard-placeholder__icon" aria-hidden="true">⬡</div>
        <h1 className="dashboard-placeholder__title">Welcome, {firstName}!</h1>
        <p className="dashboard-placeholder__subtitle">
          The DevFlow AI workspace is coming soon.
        </p>
        <p className="dashboard-placeholder__description">
          The full dashboard — including Kanban boards, sprint planning, AI
          requirement analysis, project management, and real-time notifications
          — will be implemented here in a future phase.
        </p>
        <div className="dashboard-placeholder__chips">
          <span className="chip">Kanban Board</span>
          <span className="chip">Sprint Planner</span>
          <span className="chip">AI Insights</span>
          <span className="chip">Team Collaboration</span>
          <span className="chip">Notifications</span>
        </div>
      </div>
    </div>
  );
}
