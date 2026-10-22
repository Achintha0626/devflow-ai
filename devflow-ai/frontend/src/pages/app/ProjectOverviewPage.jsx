import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { getProjectDashboardRequest } from "../../api/dashboardApi";
import {
  ActiveSprintSection,
  DistributionSection,
  RecentActivitySection,
  SummaryCards,
  TeamWorkloadSection,
} from "../../components/dashboard/DashboardSections";
import { ErrorState, LoadingState } from "../../components/NavigationFeedback";
import { CalendarIcon, PlusIcon, RefreshIcon } from "../../components/icons";
import "./ProjectDashboard.css";
import "./NavigationPages.css";

function formatProjectSchedule(startDate, deadline) {
  if (!startDate && !deadline) return null;
  const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
  const start = startDate ? formatter.format(new Date(startDate)) : null;
  const end = deadline ? formatter.format(new Date(deadline)) : null;

  if (start && end) return `${start} → ${end}`;
  if (start) return `Starts ${start}`;
  return `Due ${end}`;
}

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

  const scheduleText = formatProjectSchedule(project.startDate, project.deadline);

  return (
    <div className="project-dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header__title-block">
          <p className="navigation-page__eyebrow">PROJECT OVERVIEW</p>
          <div className="dashboard-header__title-row">
            <h1>{project.name}</h1>
            {project.key && <span className="dashboard-project-key">{project.key}</span>}
            {project.status && (
              <span className="project-status">
                <span
                  className={`project-status__dot project-status__dot--${project.status.toLowerCase()}`}
                  aria-hidden="true"
                />
                <span>{project.status.replaceAll("_", " ")}</span>
              </span>
            )}
          </div>
          {scheduleText && (
            <div className="dashboard-header__schedule">
              <CalendarIcon size={13} aria-hidden="true" />
              <span>{scheduleText}</span>
            </div>
          )}
          {project.description && (
            <p className="dashboard-header__description">{project.description}</p>
          )}
        </div>

        <div className="dashboard-header__actions">
          <Link
            to={`/app/workspaces/${workspaceId}/projects/${projectId}/tasks`}
            className="dashboard-action-btn dashboard-action-btn--primary"
          >
            <PlusIcon size={14} />
            <span>Create task</span>
          </Link>
          <button
            type="button"
            className="dashboard-action-btn dashboard-action-btn--secondary"
            onClick={() => setReloadKey((key) => key + 1)}
            disabled={isLoading}
            aria-label="Refresh dashboard data"
          >
            <RefreshIcon size={14} className={isLoading ? "is-spinning" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <SummaryCards overview={dashboard.overview} workspaceId={workspaceId} projectId={projectId} />

      <div className="dashboard-grid">
        <DistributionSection
          title="Tasks by status"
          description="Current task distribution across statuses"
          distribution={dashboard.tasksByStatus}
          total={dashboard.overview.totalTasks}
          type="status"
          actionLink={`/app/workspaces/${workspaceId}/projects/${projectId}/tasks`}
          actionLabel="View tasks"
          emptyMessage="No tasks created yet. Tasks track engineering work, bugs, and features."
        />
        <DistributionSection
          title="Tasks by priority"
          description="Priority breakdown across tasks"
          distribution={dashboard.tasksByPriority}
          total={dashboard.overview.totalTasks}
          type="priority"
          actionLink={`/app/workspaces/${workspaceId}/projects/${projectId}/tasks`}
          actionLabel="View tasks"
          emptyMessage="No task priorities recorded yet."
        />
        <ActiveSprintSection
          sprint={dashboard.activeSprint}
          workspaceId={workspaceId}
          projectId={projectId}
        />
        <DistributionSection
          title="Requirements by status"
          description="Current requirement distribution"
          distribution={dashboard.requirementsByStatus}
          total={dashboard.overview.totalRequirements}
          type="requirement"
          actionLink={`/app/workspaces/${workspaceId}/projects/${projectId}/requirements`}
          actionLabel="View requirements"
          emptyMessage="No requirements documented yet. Define features and scope in Requirements."
        />
        <TeamWorkloadSection
          members={dashboard.memberWorkload}
          workspaceId={workspaceId}
          projectId={projectId}
        />
        <RecentActivitySection activities={dashboard.recentActivity} />
      </div>
    </div>
  );
}