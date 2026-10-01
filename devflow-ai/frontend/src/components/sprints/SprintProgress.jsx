function formatPercentage(value) {
  if (!Number.isFinite(value)) return "Unavailable";
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
}

function ProgressRow({ label, value, caption }) {
  const percentage = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <div className="sprint-progress-row">
      <div className="sprint-progress-row__labels">
        <span>{label}</span>
        <span>{caption} · {formatPercentage(value)}</span>
      </div>
      <div className="sprint-progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}>
        <span style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function SprintProgress({ stats }) {
  const taskCaption = `${stats.doneTasks} / ${stats.totalTasks} tasks`;
  const pointCaption = `${stats.completedStoryPoints} / ${stats.totalStoryPoints} points`;

  return (
    <section className="sprint-progress" aria-label="Sprint progress">
      <ProgressRow label="Task completion" value={stats.completionPercentage} caption={taskCaption} />
      <ProgressRow label="Story-point completion" value={stats.storyPointCompletionPercentage} caption={pointCaption} />
      <dl className="sprint-progress__counts">
        <div><dt>Total tasks</dt><dd>{stats.totalTasks}</dd></div>
        <div><dt>To do</dt><dd>{stats.todoTasks}</dd></div>
        <div><dt>In progress</dt><dd>{stats.inProgressTasks}</dd></div>
        <div><dt>In review</dt><dd>{stats.inReviewTasks}</dd></div>
        <div><dt>Done</dt><dd>{stats.doneTasks}</dd></div>
        <div><dt>Story points</dt><dd>{stats.totalStoryPoints}</dd></div>
      </dl>
    </section>
  );
}