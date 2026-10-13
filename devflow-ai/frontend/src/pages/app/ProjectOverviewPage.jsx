import { useEffect, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { getProjectDashboardRequest } from "../../api/dashboardApi";
import {
  ActiveSprintSection,
  DistributionSection,
  RecentActivitySection,
  SummaryCards,
  TeamWorkloadSection,
} from "../../components/dashboard/DashboardSections";
import { ErrorState, LoadingState } from "../../components/NavigationFeedback";
import { RefreshIcon } from "../../components/icons";
import "./ProjectDashboard.css";
import "./NavigationPages.css";

export function ProjectOverviewPage() {
  const { project } = useOutletContext();
  const { workspaceId, projectId } = useParams();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getProjectDashboardRequest(workspaceId, projectId);
        if (active) setDashboard(response.data);
      } catch (requestError) {
        if (active) setError(requestError);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [workspaceId, projectId, reloadKey]);

  if (isLoading) return <LoadingState label="Loading project dashboard…" />;
  if (error) {
    return (
      <div className="project-dashboard__message">
        <ErrorState
          error={error}
          onRetry={() => setReloadKey((key) => key + 1)}
          backTo={`/app/workspaces/${workspaceId}/projects`}
          backLabel="Back to projects"
        />
      </div>
    );
  }

  return (
    <div className="project-dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header__title">
          <p className="navigation-page__eyebrow">PROJECT OVERVIEW</p>
          <h1>{project.name}</h1>
          {project.description && <p className="dashboard-header__description">{project.description}</p>}
        </div>
        <div className="dashboard-header__meta">
          {project.key && <span className="dashboard-project-key">{project.key}</span>}
          {project.status && <span className="project-status">{project.status.replaceAll("_", " ")}</span>}
          <button
            type="button"
            className="dashboard-refresh-button"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={isLoading}
            aria-label="Refresh dashboard data"
          >
            <RefreshIcon size={14} className={isLoading ? "is-spinning" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <SummaryCards overview={dashboard.overview} />
      <div className="dashboard-grid">
        <DistributionSection
          title="Tasks by status"
          description="Current task distribution across statuses"
          distribution={dashboard.tasksByStatus}
          total={dashboard.overview.totalTasks}
          emptyMessage="No tasks yet."
        />
        <DistributionSection
          title="Tasks by priority"
          description="Priority breakdown across tasks"
          distribution={dashboard.tasksByPriority}
          total={dashboard.overview.totalTasks}
          emptyMessage="No task priorities to show."
        />
        <ActiveSprintSection sprint={dashboard.activeSprint} />
        <DistributionSection
          title="Requirements by status"
          description="Current requirement distribution"
          distribution={dashboard.requirementsByStatus}
          total={dashboard.overview.totalRequirements}
          emptyMessage="No requirements yet."
        />
        <TeamWorkloadSection members={dashboard.memberWorkload} />
        <RecentActivitySection activities={dashboard.recentActivity} />
      </div>
    </div>
  );
}