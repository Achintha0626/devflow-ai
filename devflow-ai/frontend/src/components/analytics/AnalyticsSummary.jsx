import { formatCount, formatPercent } from "./analyticsUtils";

export function AnalyticsSummary({ overview }) {
  const completionPct = Number.isFinite(overview.completionPercentage)
    ? overview.completionPercentage
    : 0;

  const metrics = [
    { label: "Total tasks", value: formatCount(overview.totalTasks), detail: "In this project" },
    { label: "Completed tasks", value: formatCount(overview.completedTasks), detail: `${formatPercent(completionPct)} complete` },
    { label: "Completion rate", value: formatPercent(completionPct), detail: "Tasks completed" },
    { label: "Requirements", value: formatCount(overview.totalRequirements), detail: "In this project" },
    { label: "Project members", value: formatCount(overview.totalMembers), detail: "On this project" },
  ];

  return (
    <section className="analytics-summary-grid" aria-label="Project summary metrics">
      {metrics.map((metric) => (
        <article className="analytics-metric" key={metric.label}>
          <h2>{metric.label}</h2>
          <p className="analytics-metric__value">{metric.value}</p>
          <p className="analytics-metric__detail">{metric.detail}</p>
        </article>
      ))}
    </section>
  );
}
