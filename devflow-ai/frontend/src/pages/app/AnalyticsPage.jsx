import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getProjectDashboardRequest, getProjectRiskSummary } from "../../api/dashboardApi";
import { ActiveSprintAnalytics } from "../../components/analytics/ActiveSprintAnalytics";
import { AnalyticsSummary } from "../../components/analytics/AnalyticsSummary";
import { DistributionCard } from "../../components/analytics/DistributionCard";
import { MLRiskInsights } from "../../components/analytics/MLRiskInsights";
import { RecentActivityAnalytics } from "../../components/analytics/RecentActivityAnalytics";
import { TeamWorkload } from "../../components/analytics/TeamWorkload";
import { clampProgress, formatCount, formatPercent, safePercent } from "../../components/analytics/analyticsUtils";
import { ErrorState, LoadingState } from "../../components/NavigationFeedback";
import { AlertCircleIcon, CheckIcon, RefreshIcon } from "../../components/icons";
import "./Analytics.css";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "delivery", label: "Delivery" },
  { id: "risk", label: "ML Risk" },
  { id: "team", label: "Team & Activity" },
];

function ProjectDeliverySummaryCard({ data, riskData }) {
  const totalTasks = data?.overview?.totalTasks ?? 0;
  const completedTasks = data?.overview?.completedTasks ?? 0;
  const completionPct = Number.isFinite(data?.overview?.completionPercentage)
    ? data.overview.completionPercentage
    : safePercent(completedTasks, totalTasks);
  const clampedCompletion = clampProgress(completionPct);

  const statusMap = data?.tasksByStatus || {};
  const todoCount = statusMap.TODO ?? 0;
  const inProgressCount = statusMap.IN_PROGRESS ?? 0;
  const inReviewCount = statusMap.IN_REVIEW ?? 0;
  const doneCount = statusMap.DONE ?? 0;

  const todoShare = safePercent(todoCount, totalTasks);
  const inProgressShare = safePercent(inProgressCount, totalTasks);
  const inReviewShare = safePercent(inReviewCount, totalTasks);
  const doneShare = safePercent(doneCount, totalTasks);

  const activeSprint = data?.activeSprint;
  const riskSummary = riskData?.summary || {};
  const coveragePct = riskSummary.coveragePercentage ?? 0;

  return (
    <div className="analytics-overview-dashboard">
      <div className="analytics-overview-grid">
        <section className="analytics-panel analytics-progress-hero" aria-label="Project health summary">
          <header className="analytics-panel__header">
            <div>
              <h2>Project delivery health</h2>
              <p>Overall completion rate and milestone progress</p>
            </div>
            <span className="analytics-badge">
              {clampedCompletion >= 100 ? "Completed" : clampedCompletion >= 50 ? "On track" : "In progress"}
            </span>
          </header>

          <div className="analytics-health-card-body">
            <div className="analytics-radial-stat">
              <div
                className="analytics-radial-circle"
                style={{
                  background: `conic-gradient(var(--accent) ${clampedCompletion * 3.6}deg, var(--surface-raised) 0deg)`,
                }}
              >
                <div className="analytics-radial-inner">
                  <span className="analytics-radial-value">{formatPercent(clampedCompletion)}</span>
                  <span className="analytics-radial-label">DONE</span>
                </div>
              </div>
            </div>

            <div className="analytics-health-details">
              <div className="analytics-health-row">
                <span className="analytics-health-label">Total tasks</span>
                <span className="analytics-health-val">{formatCount(totalTasks)}</span>
              </div>
              <div className="analytics-health-row">
                <span className="analytics-health-label">Completed tasks</span>
                <span className="analytics-health-val">{formatCount(completedTasks)}</span>
              </div>
              <div className="analytics-health-row">
                <span className="analytics-health-label">Requirements</span>
                <span className="analytics-health-val">{formatCount(data?.overview?.totalRequirements ?? 0)}</span>
              </div>
              <div className="analytics-health-row">
                <span className="analytics-health-label">Team members</span>
                <span className="analytics-health-val">{formatCount(data?.overview?.totalMembers ?? 0)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="analytics-panel analytics-segmented-task-card" aria-label="Task progress breakdown">
          <header className="analytics-panel__header">
            <div>
              <h2>Task progress breakdown</h2>
              <p>Current distribution across engineering statuses</p>
            </div>
            <span className="analytics-panel__total">{formatCount(totalTasks)} tasks</span>
          </header>

          {totalTasks === 0 ? (
            <p className="analytics-empty-note">No tasks recorded yet in this project.</p>
          ) : (
            <div className="analytics-multi-progress-wrap">
              <div className="analytics-multi-bar" role="progressbar" aria-label="Task status distribution">
                <span className="analytics-bar-segment analytics-bar-segment--todo" style={{ width: `${todoShare}%` }} title={`To Do: ${todoCount}`} />
                <span className="analytics-bar-segment analytics-bar-segment--progress" style={{ width: `${inProgressShare}%` }} title={`In Progress: ${inProgressCount}`} />
                <span className="analytics-bar-segment analytics-bar-segment--review" style={{ width: `${inReviewShare}%` }} title={`In Review: ${inReviewCount}`} />
                <span className="analytics-bar-segment analytics-bar-segment--done" style={{ width: `${doneShare}%` }} title={`Done: ${doneCount}`} />
              </div>

              <div className="analytics-status-legend">
                <div className="analytics-legend-item">
                  <span className="analytics-legend-dot analytics-legend-dot--todo" />
                  <span className="analytics-legend-label">To do</span>
                  <span className="analytics-legend-count">{formatCount(todoCount)} ({formatPercent(todoShare)})</span>
                </div>
                <div className="analytics-legend-item">
                  <span className="analytics-legend-dot analytics-legend-dot--progress" />
                  <span className="analytics-legend-label">In progress</span>
                  <span className="analytics-legend-count">{formatCount(inProgressCount)} ({formatPercent(inProgressShare)})</span>
                </div>
                <div className="analytics-legend-item">
                  <span className="analytics-legend-dot analytics-legend-dot--review" />
                  <span className="analytics-legend-label">In review</span>
                  <span className="analytics-legend-count">{formatCount(inReviewCount)} ({formatPercent(inReviewShare)})</span>
                </div>
                <div className="analytics-legend-item">
                  <span className="analytics-legend-dot analytics-legend-dot--done" />
                  <span className="analytics-legend-label">Done</span>
                  <span className="analytics-legend-count">{formatCount(doneCount)} ({formatPercent(doneShare)})</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="analytics-overview-subgrid">
        <section className="analytics-panel" aria-label="Active sprint status">
          <header className="analytics-panel__header">
            <div>
              <h2>Active sprint pace</h2>
              <p>Current delivery cycle progress</p>
            </div>
            {activeSprint?.status && <span className="analytics-badge">{activeSprint.status}</span>}
          </header>
          {!activeSprint ? (
            <p className="analytics-empty-note">No active sprint at this time.</p>
          ) : (
            <div className="analytics-overview-sprint-info">
              <div className="analytics-overview-sprint-header">
                <h3>{activeSprint.name}</h3>
                <span className="analytics-overview-sprint-pct">
                  {formatPercent(activeSprint.completionPercentage)} complete
                </span>
              </div>
              <div className="analytics-progress">
                <span
                  className="analytics-progress__fill"
                  style={{ width: `${clampProgress(activeSprint.completionPercentage)}%` }}
                />
              </div>
              <div className="analytics-overview-sprint-stats">
                <div>
                  <span>Tasks</span>
                  <strong>{formatCount(activeSprint.completedTasks)} / {formatCount(activeSprint.totalTasks)}</strong>
                </div>
                <div>
                  <span>Points</span>
                  <strong>{formatCount(activeSprint.completedStoryPoints)} / {formatCount(activeSprint.totalStoryPoints)}</strong>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="analytics-panel" aria-label="ML risk forecast highlight">
          <header className="analytics-panel__header">
            <div>
              <h2>ML risk prediction</h2>
              <p>Forecast confidence & coverage</p>
            </div>
            <span className="analytics-badge">
              {riskSummary.tasksWithPredictions > 0 ? "Coverage active" : "No predictions"}
            </span>
          </header>
          <div className="analytics-overview-risk-info">
            <div className="analytics-overview-risk-stat">
              <div>
                <span className="analytics-overview-risk-label">Prediction coverage</span>
                <span className="analytics-overview-risk-val">{formatPercent(coveragePct)}</span>
              </div>
              <div>
                <span className="analytics-overview-risk-label">Predicted tasks</span>
                <span className="analytics-overview-risk-val">
                  {formatCount(riskSummary.tasksWithPredictions)} / {formatCount(riskSummary.totalTasks)}
                </span>
              </div>
            </div>
            <div className="analytics-progress">
              <span
                className="analytics-progress__fill"
                style={{ width: `${clampProgress(coveragePct)}%` }}
              />
            </div>
            <p className="analytics-overview-risk-footnote">
              {riskSummary.tasksWithPredictions > 0
                ? "Risk forecast based on project task metrics and stored ML estimates."
                : "Run predictions on tasks to activate risk forecasting."}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { workspaceId, projectId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshFeedback, setRefreshFeedback] = useState("");
  const [refreshError, setRefreshError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const [riskData, setRiskData] = useState(null);
  const [riskError, setRiskError] = useState(null);
  const [isRiskLoading, setIsRiskLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      setIsLoading(true);
      setIsRiskLoading(true);
      setError(null);
      setRiskError(null);

      try {
        const [dashRes, riskRes] = await Promise.allSettled([
          getProjectDashboardRequest(workspaceId, projectId),
          getProjectRiskSummary(workspaceId, projectId),
        ]);

        if (!active) return;

        if (dashRes.status === "fulfilled") {
          setData(dashRes.value.data);
        } else {
          setError(dashRes.reason);
        }

        if (riskRes.status === "fulfilled") {
          setRiskData(riskRes.value.data);
        } else {
          setRiskError(riskRes.reason);
        }
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) {
          setIsLoading(false);
          setIsRiskLoading(false);
        }
      }
    }

    loadInitialData();
    return () => {
      active = false;
    };
  }, [workspaceId, projectId]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshFeedback("");
    setRefreshError(null);

    try {
      const [dashRes, riskRes] = await Promise.allSettled([
        getProjectDashboardRequest(workspaceId, projectId),
        getProjectRiskSummary(workspaceId, projectId),
      ]);

      if (dashRes.status === "fulfilled") {
        setData(dashRes.value.data);
      } else {
        setRefreshError(dashRes.reason);
      }

      if (riskRes.status === "fulfilled") {
        setRiskData(riskRes.value.data);
        setRiskError(null);
      } else {
        setRiskError(riskRes.reason);
      }

      if (dashRes.status === "fulfilled") {
        setRefreshFeedback("Analytics updated.");
        setTimeout(() => {
          setRefreshFeedback("");
        }, 4000);
      }
    } catch (err) {
      setRefreshError(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRiskRetry = async () => {
    setIsRiskLoading(true);
    setRiskError(null);
    try {
      const res = await getProjectRiskSummary(workspaceId, projectId);
      setRiskData(res.data);
    } catch (err) {
      setRiskError(err);
    } finally {
      setIsRiskLoading(false);
    }
  };

  if (isLoading && !data) return <LoadingState label="Loading analytics..." />;

  if (error && !data) {
    return (
      <div className="analytics-page__message">
        <ErrorState
          error={error}
          onRetry={handleRefresh}
          backTo={`/app/workspaces/${workspaceId}/projects`}
          backLabel="Back to projects"
        />
      </div>
    );
  }

  const totalTasks = data?.overview?.totalTasks ?? 0;
  const totalRequirements = data?.overview?.totalRequirements ?? 0;

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div className="analytics-header__top">
          <div className="analytics-header__info">
            <p className="navigation-page__eyebrow">PROJECT ANALYTICS</p>
            <h1>Project Analytics</h1>
            <p className="analytics-header__description">
              Track delivery progress, sprint performance, team workload, and project risk.
            </p>
          </div>
          <div className="analytics-header__actions">
            {refreshFeedback && (
              <span className="analytics-feedback-pill" role="status">
                <CheckIcon size={13} />
                <span>{refreshFeedback}</span>
              </span>
            )}
            <button
              type="button"
              className="analytics-refresh-button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh project analytics"
            >
              <RefreshIcon size={14} className={isRefreshing ? "is-spinning" : ""} />
              <span>{isRefreshing ? "Refreshing…" : "Refresh"}</span>
            </button>
          </div>
        </div>

        {refreshError && (
          <div className="analytics-banner analytics-banner--error" role="alert">
            <div className="analytics-banner__content">
              <AlertCircleIcon size={15} />
              <span>Could not refresh analytics data. Showing last loaded results.</span>
            </div>
            <button type="button" className="analytics-banner__action" onClick={handleRefresh}>
              Retry
            </button>
          </div>
        )}

        <div className="analytics-tabs-wrapper">
          <nav className="analytics-tabs" role="tablist" aria-label="Analytics sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-controls={`panel-${tab.id}`}
                aria-selected={activeTab === tab.id}
                className={`analytics-tab${activeTab === tab.id ? " is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {activeTab === "overview" && (
        <div id="panel-overview" role="tabpanel" aria-labelledby="tab-overview" className="analytics-tab-panel">
          <AnalyticsSummary overview={data?.overview} />
          <ProjectDeliverySummaryCard data={data} riskData={riskData} />
        </div>
      )}

      {activeTab === "delivery" && (
        <div id="panel-delivery" role="tabpanel" aria-labelledby="tab-delivery" className="analytics-tab-panel">
          <section className="analytics-section" aria-label="Delivery overview">
            <header className="analytics-section__header">
              <div>
                <h2 className="analytics-section__title">Delivery overview</h2>
                <p className="analytics-section__subtitle">
                  Task distribution across statuses, priorities, and types alongside requirement progress.
                </p>
              </div>
            </header>
            <div className="analytics-delivery-grid">
              <DistributionCard
                title="Tasks by status"
                description="Current task distribution across statuses"
                distribution={data?.tasksByStatus}
                total={totalTasks}
                emptyMessage="No tasks yet."
              />
              <DistributionCard
                title="Tasks by priority"
                description="Priority distribution across all tasks"
                distribution={data?.tasksByPriority}
                total={totalTasks}
                emptyMessage="No tasks yet."
              />
              <DistributionCard
                title="Task type distribution"
                description="Tasks grouped by engineering category"
                distribution={data?.tasksByType}
                total={totalTasks}
                emptyMessage="No tasks yet."
              />
              <DistributionCard
                title="Requirements by status"
                description="Requirement progress across all statuses"
                distribution={data?.requirementsByStatus}
                total={totalRequirements}
                emptyMessage="No requirements yet."
              />
            </div>
          </section>

          <section className="analytics-section" aria-label="Sprint delivery performance">
            <header className="analytics-section__header">
              <div>
                <h2 className="analytics-section__title">Active sprint performance</h2>
                <p className="analytics-section__subtitle">
                  Pace and completion breakdown for the current sprint cycle.
                </p>
              </div>
            </header>
            <ActiveSprintAnalytics sprint={data?.activeSprint} />
          </section>
        </div>
      )}

      {activeTab === "risk" && (
        <div id="panel-risk" role="tabpanel" aria-labelledby="tab-risk" className="analytics-tab-panel">
          <MLRiskInsights
            data={riskData}
            isLoading={isRiskLoading}
            error={riskError}
            onRetry={handleRiskRetry}
          />
        </div>
      )}

      {activeTab === "team" && (
        <div id="panel-team" role="tabpanel" aria-labelledby="tab-team" className="analytics-tab-panel">
          <section className="analytics-section" aria-label="Sprint and team performance">
            <header className="analytics-section__header">
              <div>
                <h2 className="analytics-section__title">Sprint & Team Workload</h2>
                <p className="analytics-section__subtitle">
                  Work distribution and capacity across team contributors.
                </p>
              </div>
            </header>
            <div className="analytics-sprint-team-grid">
              <ActiveSprintAnalytics sprint={data?.activeSprint} />
              <TeamWorkload members={data?.memberWorkload ?? []} />
            </div>
          </section>

          <section className="analytics-section" aria-label="Recent activity">
            <header className="analytics-section__header">
              <div>
                <h2 className="analytics-section__title">Project Activity Feed</h2>
                <p className="analytics-section__subtitle">
                  Recent actions, assignments, and status updates.
                </p>
              </div>
            </header>
            <RecentActivityAnalytics activities={data?.recentActivity ?? []} />
          </section>
        </div>
      )}
    </div>
  );
}
