import { formatTaskDate, formatTaskLabel, getTaskDisplayName } from "./taskUtils";

const ACTIVITY_LABELS = {
  TASK_CREATED: "Task created",
  TASK_UPDATED: "Task updated",
  STATUS_CHANGED: "Status changed",
  ASSIGNEE_CHANGED: "Assignee changed",
  PRIORITY_CHANGED: "Priority changed",
  SPRINT_CHANGED: "Sprint changed",
};

function formatActivityValue(value, field) {
  if (value === null) return "None";
  if (value === undefined || value === "") return "";
  if (["status", "priority", "type"].includes(field)) return formatTaskLabel(value);
  return value;
}

export function TaskActivityList({ activities }) {
  if (activities.length === 0) {
    return <p className="task-empty-inline">No activity recorded for this task.</p>;
  }

  return (
    <ol className="task-activity-list">
      {activities.map((activity) => {
        const description = ACTIVITY_LABELS[activity.type] || formatTaskLabel(activity.type);
        const hasChange = activity.oldValue !== null || activity.newValue !== null;
        const change = activity.field
          ? `${formatTaskLabel(activity.field)}${hasChange ? `: ${formatActivityValue(activity.oldValue, activity.field)} → ${formatActivityValue(activity.newValue, activity.field)}` : ""}`
          : "";

        return (
          <li className="task-activity" key={activity.id}>
            <div className="task-activity__marker" aria-hidden="true" />
            <div className="task-activity__content">
              <p><strong>{getTaskDisplayName(activity.actor)}</strong> {description.toLowerCase()}</p>
              {change && <p className="task-activity__change">{change}</p>}
              <time dateTime={activity.createdAt}>{formatTaskDate(activity.createdAt, { dateStyle: "medium", timeStyle: "short" })}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}