import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjectDashboardRequest } from "../../api/dashboardApi";
import { ActiveSprintAnalytics } from "../../components/analytics/ActiveSprintAnalytics";
import { AnalyticsSummary } from "../../components/analytics/AnalyticsSummary";
import { DistributionCard } from "../../components/analytics/DistributionCard";
import { RecentActivityAnalytics } from "../../components/analytics/RecentActivityAnalytics";
import { TeamWorkload } from "../../components/analytics/TeamWorkload";
import { ErrorState, LoadingState } from "../../components/NavigationFeedback";
import "./Analytics.css";

export function AnalyticsPage() {
  const { workspaceId, projectId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAnalytics() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await getProjectDashboardRequest(workspaceId, projectId);
        if (active) setData(response.data);
      } catch (requestError) {
        if (active) setError(requestError);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadAnalytics();
    return () => {
      active = false;
    };
  }, [workspaceId, projectId, reloadKey]);

  if (isLoading) return <LoadingState label="Loading analytics…" />;

  if (error) {
    return (
      <div className="analytics-page__message">
        <ErrorState
          error={error}
          onRetry={() => setReloadKey((key) => key + 1)}
          backTo={`/app/workspaces/${workspaceId}/projects`}
          backLabel="Back to projects"
        />
      </div>
    );
  }

  const totalTasks = data.overview?.totalTasks ?? 0;
  const totalRequirements = data.overview?.totalRequirements ?? 0;

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <p className="navigation-page__eyebrow">PROJECT ANALYTICS</p>
        <h1>Project Analytics</h1>
        <p className="analytics-header__description">
          A summary of project delivery, task distribution, requirement progress, sprint status, team workload, and recent activity.
        </p>
      </header>

      <AnalyticsSummary overview={data.overview} />

      <p className="analytics-risk-note">
        Predictive task delay risk analytics will be available in a future release once a project-wide risk summary endpoint is available.
      </p>

      <div className="analytics-grid">
        <DistributionCard
          title="Tasks by status"
          description="Current task distribution across statuses"
          distribution={data.tasksByStatus}
          total={totalTasks}
          emptyMessage="No tasks yet."
        />
        <DistributionCard
          title="Tasks by priority"
          description="Priority distribution across all tasks"
          distribution={data.tasksByPriority}
          total={totalTasks}
          emptyMessage="No tasks yet."
        />
        <DistributionCard
          title="Task type distribution"
          description="Tasks grouped by engineering category"
          distribution={data.tasksByType}
          total={totalTasks}
          emptyMessage="No tasks yet."
        />
        <DistributionCard
          title="Requirements by status"
          description="Requirement progress across all statuses"
          distribution={data.requirementsByStatus}
          total={totalRequirements}
          emptyMessage="No requirements yet."
        />
        <ActiveSprintAnalytics sprint={data.activeSprint} />
        <TeamWorkload members={data.memberWorkload ?? []} />
        <RecentActivityAnalytics activities={data.recentActivity ?? []} />
      </div>
    </div>
  );
}
