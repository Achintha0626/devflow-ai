import { formatCount, formatPercent } from "./analyticsUtils";

export function AnalyticsSummary({ overview }) {
  const safeOverview = overview || {};
  const completionPct = Number.isFinite(safeOverview.completionPercentage)
    ? safeOverview.completionPercentage
    : 0;

  const metrics = [
    { label: "Total tasks", value: formatCount(safeOverview.totalTasks), detail: "Across all sprints" },
    { label: "Completed tasks", value: formatCount(safeOverview.completedTasks), detail: `${formatPercent(completionPct)} of total tasks` },
    { label: "Completion rate", value: formatPercent(completionPct), detail: "Overall project progress" },
    { label: "Requirements", value: formatCount(safeOverview.totalRequirements), detail: "Documented scopes" },
    { label: "Project members", value: formatCount(safeOverview.totalMembers), detail: "Active contributors" },
  ];

  return (
    <section className="analytics-summary-grid" aria-label="Project summary metrics">
      {metrics.map((metric) => (
        <article className="analytics-metric" key={metric.label}>
          <div className="analytics-metric__header">
            <h2>{metric.label}</h2>
          </div>
          <p className="analytics-metric__value">{metric.value}</p>
          <p className="analytics-metric__detail">{metric.detail}</p>
        </article>
      ))}
    </section>
  );
}
