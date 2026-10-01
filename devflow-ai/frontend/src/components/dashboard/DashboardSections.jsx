function formatCount(value) {
  return new Intl.NumberFormat().format(value);
}

function formatPercent(value) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
}

function formatLabel(value) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function ProgressTrack({ value, label }) {
  const percentage = Math.min(100, Math.max(0, value));
  return (
    <div
      className="dashboard-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
    >
      <span className="dashboard-progress__fill" style={{ width: `${percentage}%` }} />
    </div>
  );
}

export function SummaryCards({ overview }) {
  const metrics = [
    { label: "Total tasks", value: overview.totalTasks, detail: "In this project" },
    {
      label: "Completed tasks",
      value: overview.completedTasks,
      detail: `${formatPercent(overview.completionPercentage)} complete`,
    },
    { label: "Requirements", value: overview.totalRequirements, detail: "In this project" },
    { label: "Project members", value: overview.totalMembers, detail: "On this project" },
  ];

  return (
    <section className="dashboard-summary-grid" aria-label="Project summary">
      {metrics.map((metric) => (
        <article className="dashboard-metric" key={metric.label}>
          <h2>{metric.label}</h2>
          <p className="dashboard-metric__value">{formatCount(metric.value)}</p>
          <p className="dashboard-metric__detail">{metric.detail}</p>
        </article>
      ))}
    </section>
  );
}

export function DistributionSection({ title, description, distribution, total, emptyMessage }) {
  const entries = Object.entries(distribution || {});

  return (
    <section className="dashboard-panel" aria-label={title}>
      <header className="dashboard-panel__header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="dashboard-panel__total">{formatCount(total)}</span>
      </header>
      {total === 0 && <p className="dashboard-empty-note">{emptyMessage}</p>}
      <ul className="dashboard-distribution">
        {entries.map(([name, count]) => {
          const share = total > 0 ? (count / total) * 100 : 0;
          return (
            <li className="dashboard-distribution__row" key={name}>
              <div className="dashboard-distribution__labels">
                <span>{formatLabel(name)}</span>
                <span>{formatCount(count)} <span className="dashboard-distribution__share">{formatPercent(share)}</span></span>
              </div>
              <ProgressTrack value={share} label={`${formatLabel(name)} share`} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SprintMetric({ label, value }) {
  return (
    <div className="dashboard-sprint__metric">
      <dt>{label}</dt>
      <dd>{formatCount(value)}</dd>
    </div>
  );
}

export function ActiveSprintSection({ sprint }) {
  return (
    <section className="dashboard-panel">
      <header className="dashboard-panel__header">
        <div>
          <h2>Active sprint</h2>
          <p>Progress for the current sprint</p>
        </div>
      </header>
      {!sprint ? (
        <p className="dashboard-empty-note dashboard-empty-note--panel">No active sprint</p>
      ) : (
        <div className="dashboard-sprint">
          <div className="dashboard-sprint__heading">
            <div>
              <h3>{sprint.name}</h3>
              {sprint.goal && <p>{sprint.goal}</p>}
            </div>
            <span className="dashboard-badge">{formatLabel(sprint.status)}</span>
          </div>
          {(sprint.startDate || sprint.endDate) && (
            <p className="dashboard-sprint__dates">
              {formatDate(sprint.startDate) || "Start date not set"}
              <span aria-hidden="true"> to </span>
              {formatDate(sprint.endDate) || "End date not set"}
            </p>
          )}
          <div className="dashboard-sprint__progress-label">
            <span>Task completion</span>
            <span>{formatCount(sprint.completedTasks)} / {formatCount(sprint.totalTasks)} · {formatPercent(sprint.completionPercentage)}</span>
          </div>
          <ProgressTrack value={sprint.completionPercentage} label="Active sprint task completion" />
          <dl className="dashboard-sprint__metrics">
            <SprintMetric label="Tasks" value={sprint.totalTasks} />
            <SprintMetric label="Completed" value={sprint.completedTasks} />
            <SprintMetric label="Story points" value={sprint.totalStoryPoints} />
            <SprintMetric label="Completed points" value={sprint.completedStoryPoints} />
          </dl>
        </div>
      )}
    </section>
  );
}

function getMemberName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return name || user?.email || "Unnamed member";
}

export function TeamWorkloadSection({ members }) {
  return (
    <section className="dashboard-panel">
      <header className="dashboard-panel__header">
        <div>
          <h2>Team workload</h2>
          <p>Assigned task counts by project member</p>
        </div>
        <span className="dashboard-panel__total">{formatCount(members.length)}</span>
      </header>
      {members.length === 0 ? (
        <p className="dashboard-empty-note dashboard-empty-note--panel">No project members to show.</p>
      ) : (
        <ul className="dashboard-workload-list">
          {members.map((member) => (
            <li className="dashboard-workload" key={member.user.id}>
              <div className="dashboard-workload__heading">
                <div>
                  <h3>{getMemberName(member.user)}</h3>
                  <p>{member.role.replaceAll("_", " ")}</p>
                </div>
                <span className="dashboard-workload__assigned">
                  {formatCount(member.totalAssignedTasks)} assigned
                </span>
              </div>
              <dl className="dashboard-workload__counts">
                <div><dt>To do</dt><dd>{formatCount(member.todoTasks)}</dd></div>
                <div><dt>In progress</dt><dd>{formatCount(member.inProgressTasks)}</dd></div>
                <div><dt>In review</dt><dd>{formatCount(member.inReviewTasks)}</dd></div>
                <div><dt>Done</dt><dd>{formatCount(member.doneTasks)}</dd></div>
              </dl>
              <p className="dashboard-workload__points">{formatCount(member.totalStoryPoints)} story points</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function formatActivityTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatActivityValue(value) {
  if (value === null) return "None";
  return value === undefined ? "" : value;
}

export function RecentActivitySection({ activities }) {
  return (
    <section className="dashboard-panel">
      <header className="dashboard-panel__header">
        <div>
          <h2>Recent activity</h2>
          <p>Latest task activity in this project</p>
        </div>
        <span className="dashboard-panel__total">{formatCount(activities.length)}</span>
      </header>
      {activities.length === 0 ? (
        <p className="dashboard-empty-note dashboard-empty-note--panel">No recent activity.</p>
      ) : (
        <ol className="dashboard-activity-list">
          {activities.map((activity) => {
            const hasChangedValues = activity.oldValue !== undefined || activity.newValue !== undefined;
            const changedValues = [
              formatActivityValue(activity.oldValue),
              formatActivityValue(activity.newValue),
            ];
            const actor = getMemberName(activity.actor);
            const taskLabel = activity.task.taskNumber || activity.task.title;

            return (
              <li className="dashboard-activity" key={activity.id}>
                <div className="dashboard-activity__marker" aria-hidden="true" />
                <div className="dashboard-activity__body">
                  <p className="dashboard-activity__summary">
                    <strong>{actor}</strong> {formatLabel(activity.type).toLowerCase()}
                    {taskLabel && <> · <strong>{taskLabel}</strong></>}
                  </p>
                  {activity.field && (
                    <p className="dashboard-activity__change">
                      {activity.field.replaceAll("_", " ")}
                      {hasChangedValues && `: ${changedValues[0]} → ${changedValues[1]}`}
                    </p>
                  )}
                  <time className="dashboard-activity__time" dateTime={activity.createdAt}>
                    {formatActivityTime(activity.createdAt)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}