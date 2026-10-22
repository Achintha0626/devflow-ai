import { useState } from "react";
import { Link } from "react-router-dom";
import {
  TasksIcon,
  CheckIcon,
  RequirementsIcon,
  UserIcon,
  SprintsIcon,
  PlusIcon,
  EditIcon,
  AlertCircleIcon,
  CalendarIcon,
  ChevronRightIcon,
} from "../icons";

function formatCount(value) {
  return new Intl.NumberFormat().format(value || 0);
}

function formatPercent(value) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value || 0)}%`;
}

function formatLabel(value) {
  if (!value) return "";
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function ProgressTrack({ value, label, variant }) {
  const percentage = Math.min(100, Math.max(0, value || 0));
  return (
    <div
      className={`dashboard-progress${variant ? ` dashboard-progress--${variant}` : ""}`}
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

export function SummaryCards({ overview = {}, workspaceId, projectId }) {
  const completionRate = overview.totalTasks > 0
    ? ((overview.completedTasks || 0) / overview.totalTasks) * 100
    : 0;

  const basePath = workspaceId && projectId ? `/app/workspaces/${workspaceId}/projects/${projectId}` : "";

  const metrics = [
    {
      label: "Total tasks",
      value: overview.totalTasks ?? 0,
      detail: "Across backlog and sprints",
      icon: TasksIcon,
      to: basePath ? `${basePath}/tasks` : null,
    },
    {
      label: "Completed tasks",
      value: overview.completedTasks ?? 0,
      detail: `${formatPercent(completionRate)} completed`,
      icon: CheckIcon,
      highlight: true,
      rate: completionRate,
      to: basePath ? `${basePath}/tasks` : null,
    },
    {
      label: "Requirements",
      value: overview.totalRequirements ?? 0,
      detail: "Documented specifications",
      icon: RequirementsIcon,
      to: basePath ? `${basePath}/requirements` : null,
    },
    {
      label: "Project members",
      value: overview.totalMembers ?? 0,
      detail: "Assigned contributors",
      icon: UserIcon,
      to: basePath ? `${basePath}/members` : null,
    },
  ];

  return (
    <section className="dashboard-summary-grid" aria-label="Project summary">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        const CardContent = (
          <>
            <div className="dashboard-metric__top">
              <h2>{metric.label}</h2>
              <span className="dashboard-metric__icon" aria-hidden="true">
                <Icon size={15} />
              </span>
            </div>
            <div className="dashboard-metric__body">
              <p className="dashboard-metric__value">{formatCount(metric.value)}</p>
              {metric.highlight && metric.value > 0 && (
                <div className="dashboard-metric__progress-wrap">
                  <ProgressTrack value={metric.rate} label="Completion progress" variant="success" />
                </div>
              )}
            </div>
            <div className="dashboard-metric__footer">
              <span className="dashboard-metric__detail">{metric.detail}</span>
              {metric.to && (
                <ChevronRightIcon size={12} className="dashboard-metric__arrow" aria-hidden="true" />
              )}
            </div>
          </>
        );

        if (metric.to) {
          return (
            <Link
              to={metric.to}
              className={`dashboard-metric dashboard-metric--link${metric.highlight ? " dashboard-metric--highlight" : ""}`}
              key={metric.label}
            >
              {CardContent}
            </Link>
          );
        }

        return (
          <article
            className={`dashboard-metric${metric.highlight ? " dashboard-metric--highlight" : ""}`}
            key={metric.label}
          >
            {CardContent}
          </article>
        );
      })}
    </section>
  );
}

export function DistributionSection({
  title,
  description,
  distribution,
  total,
  type = "default",
  actionLink,
  actionLabel,
  emptyMessage,
}) {
  const entries = Object.entries(distribution || {});
  const safeTotal = Number.isFinite(total) ? total : 0;
  const isEmpty = safeTotal === 0 || entries.length === 0;

  return (
    <section className="dashboard-panel" aria-label={title}>
      <header className="dashboard-panel__header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <span className="dashboard-panel__total">{formatCount(safeTotal)} total</span>
      </header>
      {isEmpty ? (
        <div className="dashboard-empty-state">
          <p className="dashboard-empty-state__message">{emptyMessage}</p>
          {actionLink && actionLabel && (
            <Link to={actionLink} className="dashboard-empty-state__action">
              <PlusIcon size={13} />
              <span>{actionLabel}</span>
            </Link>
          )}
        </div>
      ) : (
        <ul className="dashboard-distribution">
          {entries.map(([name, count]) => {
            const share = safeTotal > 0 ? (count / safeTotal) * 100 : 0;
            const slug = name.toLowerCase();
            return (
              <li className="dashboard-distribution__row" key={name}>
                <div className="dashboard-distribution__labels">
                  <span className="dashboard-distribution__name-wrap">
                    {type === "status" && (
                      <span
                        className={`dashboard-dot dashboard-dot--status-${slug}`}
                        aria-hidden="true"
                      />
                    )}
                    {type === "priority" && (
                      <span
                        className={`dashboard-dot dashboard-dot--priority-${slug}`}
                        aria-hidden="true"
                      />
                    )}
                    {type === "requirement" && (
                      <span
                        className={`dashboard-dot dashboard-dot--requirement-${slug}`}
                        aria-hidden="true"
                      />
                    )}
                    <span className="dashboard-distribution__name">{formatLabel(name)}</span>
                  </span>
                  <span className="dashboard-distribution__value">
                    {formatCount(count)}
                    <span className="dashboard-distribution__share">({formatPercent(share)})</span>
                  </span>
                </div>
                <ProgressTrack
                  value={share}
                  label={`${formatLabel(name)} share`}
                  variant={type === "status" || type === "priority" ? slug : undefined}
                />
              </li>
            );
          })}
        </ul>
      )}
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

export function ActiveSprintSection({ sprint, workspaceId, projectId }) {
  const pointsPct = sprint?.totalStoryPoints > 0
    ? ((sprint.completedStoryPoints || 0) / sprint.totalStoryPoints) * 100
    : 0;

  const sprintsPath = workspaceId && projectId
    ? `/app/workspaces/${workspaceId}/projects/${projectId}/sprints`
    : null;

  return (
    <section className="dashboard-panel dashboard-panel--sprint" aria-label="Active sprint">
      <header className="dashboard-panel__header">
        <div>
          <h2>Active sprint</h2>
          <p>Progress for the current sprint</p>
        </div>
        <div className="dashboard-panel__actions">
          {sprintsPath && (
            <Link to={sprintsPath} className="dashboard-panel__action-link">
              Manage sprints
            </Link>
          )}
          <span className="dashboard-panel__icon" aria-hidden="true">
            <SprintsIcon size={15} />
          </span>
        </div>
      </header>
      {!sprint ? (
        <div className="dashboard-empty-state">
          <p className="dashboard-empty-state__message">
            No active sprint is currently running for this project.
          </p>
          {sprintsPath && (
            <Link to={sprintsPath} className="dashboard-empty-state__action">
              <PlusIcon size={13} />
              <span>Plan a sprint</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="dashboard-sprint">
          <div className="dashboard-sprint__heading">
            <div className="dashboard-sprint__title-group">
              <h3>{sprint.name}</h3>
              {sprint.goal && <p className="dashboard-sprint__goal">{sprint.goal}</p>}
            </div>
            <span className="dashboard-badge">{formatLabel(sprint.status)}</span>
          </div>
          {(sprint.startDate || sprint.endDate) && (
            <p className="dashboard-sprint__dates">
              <CalendarIcon size={12} aria-hidden="true" />
              <span>
                {formatDate(sprint.startDate) || "Start date not set"}
                <span aria-hidden="true"> → </span>
                {formatDate(sprint.endDate) || "End date not set"}
              </span>
            </p>
          )}

          <div className="dashboard-sprint__progress-group">
            <div className="dashboard-sprint__progress-label">
              <span>Task completion</span>
              <span>
                {formatCount(sprint.completedTasks)} / {formatCount(sprint.totalTasks)} ({formatPercent(sprint.completionPercentage)})
              </span>
            </div>
            <ProgressTrack
              value={sprint.completionPercentage}
              label="Active sprint task completion"
              variant="in_progress"
            />
          </div>

          <div className="dashboard-sprint__progress-group">
            <div className="dashboard-sprint__progress-label">
              <span>Story points progress</span>
              <span>
                {formatCount(sprint.completedStoryPoints)} / {formatCount(sprint.totalStoryPoints)} ({formatPercent(pointsPct)})
              </span>
            </div>
            <ProgressTrack
              value={pointsPct}
              label="Active sprint story points completion"
              variant="accent"
            />
          </div>

          <dl className="dashboard-sprint__metrics">
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

function getMemberName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return name || user?.email || "Unnamed member";
}

export function TeamWorkloadSection({ members = [], workspaceId, projectId }) {
  const membersPath = workspaceId && projectId
    ? `/app/workspaces/${workspaceId}/projects/${projectId}/members`
    : null;

  return (
    <section className="dashboard-panel dashboard-panel--workload" aria-label="Team workload">
      <header className="dashboard-panel__header">
        <div>
          <h2>Team workload</h2>
          <p>Assigned task counts and story points by member</p>
        </div>
        <div className="dashboard-panel__actions">
          {membersPath && (
            <Link to={membersPath} className="dashboard-panel__action-link">
              Manage members
            </Link>
          )}
          <span className="dashboard-panel__total">{formatCount(members.length)} members</span>
        </div>
      </header>
      {members.length === 0 ? (
        <div className="dashboard-empty-state">
          <p className="dashboard-empty-state__message">
            No team members assigned to this project yet.
          </p>
          {membersPath && (
            <Link to={membersPath} className="dashboard-empty-state__action">
              <UserIcon size={13} />
              <span>Assign members</span>
            </Link>
          )}
        </div>
      ) : (
        <ul className="dashboard-workload-list">
          {members.map((member) => {
            const memberName = getMemberName(member.user);
            const initial = memberName.charAt(0).toUpperCase();
            return (
              <li className="dashboard-workload" key={member.user?.id || member.id || memberName}>
                <div className="dashboard-workload__heading">
                  <div className="dashboard-workload__identity">
                    <span className="dashboard-workload__avatar" aria-hidden="true">{initial}</span>
                    <div>
                      <h3>{memberName}</h3>
                      <p>{(member.role || "Member").replaceAll("_", " ")}</p>
                    </div>
                  </div>
                  <span className="dashboard-workload__assigned">
                    {formatCount(member.totalAssignedTasks)} assigned · {formatCount(member.totalStoryPoints)} pts
                  </span>
                </div>
                <dl className="dashboard-workload__counts">
                  <div className="dashboard-workload__stat">
                    <dt>To do</dt>
                    <dd>{formatCount(member.todoTasks)}</dd>
                  </div>
                  <div className="dashboard-workload__stat">
                    <dt>In progress</dt>
                    <dd>{formatCount(member.inProgressTasks)}</dd>
                  </div>
                  <div className="dashboard-workload__stat">
                    <dt>In review</dt>
                    <dd>{formatCount(member.inReviewTasks)}</dd>
                  </div>
                  <div className="dashboard-workload__stat">
                    <dt>Done</dt>
                    <dd>{formatCount(member.doneTasks)}</dd>
                  </div>
                </dl>
              </li>
            );
          })}
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

function formatValueDisplay(field, value) {
  if (value === null || value === undefined || value === "") return "None";
  if (field === "status" || field === "priority" || field === "type") {
    return formatLabel(value);
  }
  return String(value);
}

function formatActivityAction(type) {
  switch (type) {
    case "TASK_CREATED":
      return "created task";
    case "STATUS_CHANGED":
      return "changed status of";
    case "PRIORITY_CHANGED":
      return "changed priority of";
    case "ASSIGNEE_CHANGED":
      return "reassigned";
    case "SPRINT_CHANGED":
      return "updated sprint for";
    case "TASK_UPDATED":
      return "updated";
    default:
      return formatLabel(type).toLowerCase();
  }
}

function getActivityIcon(type) {
  switch (type) {
    case "TASK_CREATED":
      return PlusIcon;
    case "STATUS_CHANGED":
      return CheckIcon;
    case "PRIORITY_CHANGED":
      return AlertCircleIcon;
    case "ASSIGNEE_CHANGED":
      return UserIcon;
    case "SPRINT_CHANGED":
      return SprintsIcon;
    default:
      return EditIcon;
  }
}

function formatActivityChangeText(field, oldValue, newValue) {
  if (!field) return null;
  const label = formatLabel(field);
  const oldText = formatValueDisplay(field, oldValue);
  const newText = formatValueDisplay(field, newValue);

  if (field === "assigneeId") {
    if (oldValue === null || oldValue === undefined) return "Assigned to member";
    if (newValue === null || newValue === undefined) return "Unassigned from member";
    return "Reassigned to another member";
  }
  if (field === "sprintId") {
    if (oldValue === null || oldValue === undefined) return "Added to sprint";
    if (newValue === null || newValue === undefined) return "Removed from sprint";
    return "Moved to another sprint";
  }

  if (oldValue !== undefined || newValue !== undefined) {
    return `${label}: ${oldText} → ${newText}`;
  }
  return label;
}

export function RecentActivitySection({ activities = [] }) {
  const [showAll, setShowAll] = useState(false);
  const visibleActivities = showAll ? activities : activities.slice(0, 5);
  const hasMore = activities.length > 5;

  return (
    <section className="dashboard-panel dashboard-panel--activity" aria-label="Recent activity">
      <header className="dashboard-panel__header">
        <div>
          <h2>Recent activity</h2>
          <p>Latest task updates in this project</p>
        </div>
        <span className="dashboard-panel__total">
          {activities.length > 0
            ? `${showAll ? activities.length : Math.min(5, activities.length)} of ${activities.length}`
            : "0"}
        </span>
      </header>
      {activities.length === 0 ? (
        <div className="dashboard-empty-state">
          <p className="dashboard-empty-state__message">No recent activity recorded yet.</p>
        </div>
      ) : (
        <div className={`dashboard-activity-container${showAll ? " is-scrollable" : ""}`}>
          <ol className="dashboard-activity-list">
            {visibleActivities.map((activity) => {
              const actor = getMemberName(activity.actor);
              const task = activity.task;
              const taskNumber = task?.taskNumber;
              const taskTitle = task?.title;
              const actionText = formatActivityAction(activity.type);
              const changeText = formatActivityChangeText(
                activity.field,
                activity.oldValue,
                activity.newValue
              );
              const Icon = getActivityIcon(activity.type);

              return (
                <li className="dashboard-activity" key={activity.id}>
                  <div className="dashboard-activity__marker" aria-hidden="true">
                    <Icon size={12} />
                  </div>
                  <div className="dashboard-activity__body">
                    <p className="dashboard-activity__summary">
                      <strong className="dashboard-activity__actor">{actor}</strong>
                      {" "}
                      <span className="dashboard-activity__action">{actionText}</span>
                      {" "}
                      {taskNumber && (
                        <span className="dashboard-activity__task-badge">
                          #{taskNumber}
                        </span>
                      )}
                      {taskTitle && (
                        <span className="dashboard-activity__task-title">
                          {" "}{taskTitle}
                        </span>
                      )}
                    </p>
                    {changeText && (
                      <p className="dashboard-activity__change">
                        {changeText}
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
        </div>
      )}
      {hasMore && (
        <footer className="dashboard-activity__footer">
          <button
            type="button"
            className="dashboard-activity__toggle"
            onClick={() => setShowAll((prev) => !prev)}
            aria-expanded={showAll}
          >
            {showAll ? "Show less" : `View all (${activities.length})`}
          </button>
        </footer>
      )}
    </section>
  );
}