import { formatActivityTime, formatLabel } from "./analyticsUtils";

function formatDelayProbability(value) {
  if (!Number.isFinite(value)) return "";
  const pct = value * 100;
  return `${pct.toFixed(2).replace(/\.?0+$/, "")}%`;
}

function formatCoveragePercent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${Number(value.toFixed(2))}%`;
}

function formatPredictionDate(value) {
  if (!value) return "";
  return formatActivityTime(value);
}

function isDevModel(version) {
  return typeof version === "string" && version.startsWith("dev-");
}

function RiskLevelBadge({ level }) {
  return (
    <span className={`risk-badge risk-badge--${(level || "").toLowerCase()}`}>
      {level || ""}
    </span>
  );
}

function RiskMetricCard({ label, value, detail }) {
  return (
    <article className="analytics-metric">
      <h3>{label}</h3>
      <p className="analytics-metric__value">{value}</p>
      {detail && <p className="analytics-metric__detail">{detail}</p>}
    </article>
  );
}

function RiskDistributionBar({ label, count, total }) {
  const pct = total > 0 ? Math.min(100, (count / total) * 100) : 0;
  return (
    <li className="analytics-distribution__row">
      <div className="analytics-distribution__labels">
        <span>{label}</span>
        <span>
          {count}
          {total > 0 && (
            <span className="analytics-distribution__share">
              {pct.toFixed(0)}%
            </span>
          )}
        </span>
      </div>
      <div
        className="analytics-progress"
        role="progressbar"
        aria-label={`${label} risk tasks`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <span
          className={`analytics-progress__fill risk-bar--${label.toLowerCase()}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

function HighestRiskTaskRow({ task }) {
  return (
    <tr>
      <td>
        <span className="risk-task__number">#{task.taskNumber}</span>
      </td>
      <td>
        <span className="risk-task__title">{task.title}</span>
      </td>
      <td>
        <span className="analytics-badge">{formatLabel(task.status || "")}</span>
      </td>
      <td>
        <span className="analytics-badge">{formatLabel(task.priority || "")}</span>
      </td>
      <td className="risk-task__prob">
        {formatDelayProbability(task.delayProbability)}
      </td>
      <td>
        <RiskLevelBadge level={task.riskLevel} />
      </td>
      <td className="risk-task__meta">{task.modelVersion || ""}</td>
      <td className="risk-task__meta">{formatPredictionDate(task.predictedAt)}</td>
    </tr>
  );
}

function MLRiskInsightsLoading() {
  return (
    <div className="risk-section__loading" role="status" aria-live="polite">
      <span className="navigation-state__spinner" aria-hidden="true" />
      <span>Loading ML risk insights</span>
    </div>
  );
}

function MLRiskInsightsError({ error, onRetry }) {
  const status = error?.response?.status;
  let message = "ML risk insights could not be loaded.";
  if (status === 403) message = "You do not have permission to view risk insights.";
  else if (status === 404) message = "Risk summary is not available for this project.";
  else if (error?.message) message = error.message;

  return (
    <div className="risk-section__error" role="alert">
      <p className="risk-section__error-message">{message}</p>
      {onRetry && (
        <button className="navigation-button" type="button" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function MLRiskInsights({ data, isLoading, error, onRetry }) {
  return (
    <section className="risk-section" aria-label="ML Risk Insights">
      <header className="risk-section__header">
        <div>
          <h2 className="risk-section__title">ML Risk Insights</h2>
          <p className="risk-section__description">
            Based on stored ML predictions. Only tasks with existing predictions are included in these calculations.
          </p>
        </div>
      </header>

      {isLoading && <MLRiskInsightsLoading />}
      {!isLoading && error && <MLRiskInsightsError error={error} onRetry={onRetry} />}
      {!isLoading && !error && data && <MLRiskInsightsContent data={data} />}
    </section>
  );
}

function MLRiskInsightsContent({ data }) {
  const summary = data.summary || {};
  const riskDistribution = data.riskDistribution || {};
  const highestRiskTasks = data.highestRiskTasks || [];
  const modelVersions = data.modelVersions || [];
  const latestPredictionAt = data.latestPredictionAt || null;

  const totalWithPredictions = summary.tasksWithPredictions ?? 0;
  const totalWithout = summary.tasksWithoutPredictions ?? 0;
  const totalTasks = summary.totalTasks ?? 0;
  const coveragePct = summary.coveragePercentage ?? 0;
  const avgDelay = summary.averageDelayProbability;
  const hasNoPredictions = totalWithPredictions === 0;

  const distributedTotal =
    (riskDistribution.LOW ?? 0) +
    (riskDistribution.MEDIUM ?? 0) +
    (riskDistribution.HIGH ?? 0);

  const hasDevModel = modelVersions.some(isDevModel);

  return (
    <div>
      {hasDevModel && (
        <div className="risk-notice risk-notice--dev">
          <strong>Development model notice:</strong> Predictions were generated using a development model ({modelVersions.filter(isDevModel).join(", ")}). These are development estimates and should not be interpreted as production-grade forecasting.
        </div>
      )}

      {totalWithout > 0 && (
        <div className="risk-notice risk-notice--coverage">
          Risk insights currently cover {totalWithPredictions} of {totalTasks} task{totalTasks !== 1 ? "s" : ""}. Tasks without stored predictions are excluded from the risk calculations.
        </div>
      )}

      {hasNoPredictions && (
        <div className="risk-notice risk-notice--empty">
          No stored risk predictions are available for this project yet. Run predictions on individual tasks to populate this section.
        </div>
      )}

      <div className="analytics-summary-grid risk-summary-grid">
        <RiskMetricCard
          label="Prediction coverage"
          value={formatCoveragePercent(coveragePct)}
          detail={`${totalWithPredictions} of ${totalTasks} task${totalTasks !== 1 ? "s" : ""} predicted`}
        />
        <RiskMetricCard
          label="Avg. delay probability"
          value={hasNoPredictions ? "" : formatDelayProbability(avgDelay)}
          detail={hasNoPredictions ? "No predictions yet" : "Across predicted tasks"}
        />
        <RiskMetricCard
          label="Tasks with predictions"
          value={String(totalWithPredictions)}
          detail="Have stored ML predictions"
        />
        <RiskMetricCard
          label="Tasks without predictions"
          value={String(totalWithout)}
          detail="No stored predictions"
        />
      </div>

      <div className="risk-panels">
        <section className="analytics-panel" aria-label="Risk distribution">
          <header className="analytics-panel__header">
            <div>
              <h3>Risk distribution</h3>
              <p>Count of predicted tasks by risk level</p>
            </div>
            <span className="analytics-panel__total">{distributedTotal}</span>
          </header>
          {distributedTotal === 0 ? (
            <p className="analytics-empty-note">No predictions to distribute.</p>
          ) : (
            <ul className="analytics-distribution">
              <RiskDistributionBar label="LOW" count={riskDistribution.LOW ?? 0} total={distributedTotal} />
              <RiskDistributionBar label="MEDIUM" count={riskDistribution.MEDIUM ?? 0} total={distributedTotal} />
              <RiskDistributionBar label="HIGH" count={riskDistribution.HIGH ?? 0} total={distributedTotal} />
            </ul>
          )}
        </section>

        <section className="analytics-panel" aria-label="Model information">
          <header className="analytics-panel__header">
            <div>
              <h3>Model information</h3>
              <p>Details about the ML models behind these predictions</p>
            </div>
          </header>
          <dl className="risk-model-info">
            <div className="risk-model-info__row">
              <dt>Latest prediction</dt>
              <dd>{formatPredictionDate(latestPredictionAt)}</dd>
            </div>
            <div className="risk-model-info__row">
              <dt>Model version{modelVersions.length !== 1 ? "s" : ""}</dt>
              <dd>
                {modelVersions.length === 0
                  ? "”"
                  : modelVersions.map((v) => (
                    <span key={v} className="risk-model-version">{v}</span>
                  ))}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="analytics-panel risk-tasks-panel" aria-label="Highest risk tasks">
        <header className="analytics-panel__header">
          <div>
            <h3>Highest risk tasks</h3>
            <p>Tasks ranked by predicted delay probability</p>
          </div>
          <span className="analytics-panel__total">{highestRiskTasks.length}</span>
        </header>
        {highestRiskTasks.length === 0 ? (
          <p className="analytics-empty-note">
            {hasNoPredictions
              ? "No predictions available yet."
              : "No high-risk tasks identified."}
          </p>
        ) : (
          <div className="risk-tasks-table-wrapper">
            <table className="risk-tasks-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Title</th>
                  <th scope="col">Status</th>
                  <th scope="col">Priority</th>
                  <th scope="col">Delay prob.</th>
                  <th scope="col">Risk level</th>
                  <th scope="col">Model</th>
                  <th scope="col">Predicted at</th>
                </tr>
              </thead>
              <tbody>
                {highestRiskTasks.map((task) => (
                  <HighestRiskTaskRow key={task.id} task={task} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
