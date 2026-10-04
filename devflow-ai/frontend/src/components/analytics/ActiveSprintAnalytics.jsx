import { clampProgress, formatCount, formatDate, formatLabel, formatPercent } from "./analyticsUtils";

function SprintMetric({ label, value }) {
  return (
    <div className="analytics-sprint__metric">
      <dt>{label}</dt>
      <dd>{formatCount(value)}</dd>
    </div>
  );
}

function ProgressTrack({ value, label }) {
  const percentage = clampProgress(value);
  return (
    <div
      className="analytics-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
    >
      <span className="analytics-progress__fill" style={{ width: `${percentage}%` }} />
    </div>
  );
}

export function ActiveSprintAnalytics({ sprint }) {
  return (
    <section className="analytics-panel" aria-label="Active sprint">
      <header className="analytics-panel__header">
        <div>
          <h2>Active sprint</h2>
          <p>Progress for the current sprint</p>
        </div>
      </header>
      {!sprint ? (
        <p className="analytics-empty-note">No active sprint</p>
      ) : (
        <div>
          <div className="analytics-sprint__heading">
            <div>
              <h3>{sprint.name}</h3>
              {sprint.goal && <p>{sprint.goal}</p>}
            </div>
            <span className="analytics-badge">{formatLabel(sprint.status)}</span>
          </div>
          {(sprint.startDate || sprint.endDate) && (
            <p className="analytics-sprint__dates">
              {formatDate(sprint.startDate) || "Start date not set"}
              <span aria-hidden="true"> to </span>
              {formatDate(sprint.endDate) || "End date not set"}
            </p>
          )}
          <div className="analytics-sprint__progress-label">
            <span>Task completion</span>
            <span>
              {formatCount(sprint.completedTasks)} / {formatCount(sprint.totalTasks)} · {formatPercent(sprint.completionPercentage)}
            </span>
          </div>
          <ProgressTrack value={sprint.completionPercentage} label="Sprint task completion" />
          <dl className="analytics-sprint__metrics">
            <SprintMetric label="Tasks" value={sprint.totalTasks} />
            <SprintMetric label="Completed" value={sprint.completedTasks} />
            <SprintMetric label="Story points" value={sprint.totalStoryPoints} />
            <SprintMetric label="Points done" value={sprint.completedStoryPoints} />
          </dl>
        </div>
      )}
    </section>
  );
}
