function formatPercentage(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
}

function ProgressRow({ label, value, caption }) {
  const percentage = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <div className="sprint-progress-bar-group">
      <div className="sprint-progress-bar-group__labels">
        <span className="sprint-progress-bar-group__title">{label}</span>
        <span className="sprint-progress-bar-group__value">
          {caption} · {formatPercentage(value)}
        </span>
      </div>
      <div
        className="sprint-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
      >
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function SprintProgress({ stats }) {
  const taskCaption = `${stats.doneTasks} / ${stats.totalTasks} tasks`;
  const pointCaption = `${stats.completedStoryPoints} / ${stats.totalStoryPoints} points`;

  return (
    <div className="sprint-progress-container" aria-label="Sprint progress metrics">
      <div className="sprint-progress-bars">
        <ProgressRow
          label="Task completion"
          value={stats.completionPercentage}
          caption={taskCaption}
        />
        <ProgressRow
          label="Story-point completion"
          value={stats.storyPointCompletionPercentage}
          caption={pointCaption}
        />
      </div>

      <dl className="sprint-stat-grid">
        <div className="sprint-stat-tile">
          <dt>Total tasks</dt>
          <dd>{stats.totalTasks}</dd>
        </div>
        <div className="sprint-stat-tile">
          <dt>To do</dt>
          <dd>{stats.todoTasks}</dd>
        </div>
        <div className="sprint-stat-tile">
          <dt>In progress</dt>
          <dd>{stats.inProgressTasks}</dd>
        </div>
        <div className="sprint-stat-tile">
          <dt>In review</dt>
          <dd>{stats.inReviewTasks}</dd>
        </div>
        <div className="sprint-stat-tile">
          <dt>Done</dt>
          <dd>{stats.doneTasks}</dd>
        </div>
        <div className="sprint-stat-tile">
          <dt>Story points</dt>
          <dd>{stats.totalStoryPoints}</dd>
        </div>
      </dl>
    </div>
  );
}