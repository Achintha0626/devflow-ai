import { useState } from "react";
import { formatTaskDate, formatTaskLabel, getTaskDisplayName } from "./taskUtils";
import {
  PlusIcon,
  CheckIcon,
  AlertCircleIcon,
  UserIcon,
  SprintsIcon,
  EditIcon,
} from "../icons";

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

function formatActivityAction(type) {
  switch (type) {
    case "TASK_CREATED":
      return "created this task";
    case "STATUS_CHANGED":
      return "changed status";
    case "PRIORITY_CHANGED":
      return "changed priority";
    case "ASSIGNEE_CHANGED":
      return "reassigned task";
    case "SPRINT_CHANGED":
      return "updated sprint";
    case "TASK_UPDATED":
      return "updated task details";
    default:
      return formatTaskLabel(type).toLowerCase();
  }
}

function formatActivityField(field) {
  if (!field) return "";
  if (field === "storyPoints") return "Story points";
  if (field === "assigneeId") return "Assignee";
  if (field === "sprintId") return "Sprint";
  if (field === "dueDate") return "Due date";
  if (field === "startedAt") return "Started date";
  if (field === "completedAt") return "Completed date";
  return formatTaskLabel(field);
}

function formatActivityValue(value, field) {
  if (value === null || value === undefined) return "None";
  if (value === "") return "None";
  if (field === "status") {
    if (value === "IN_PROGRESS") return "In Progress";
    if (value === "IN_REVIEW") return "In Review";
    return formatTaskLabel(value);
  }
  if (field === "priority") {
    if (value === "CRITICAL") return "Critical";
    return formatTaskLabel(value);
  }
  if (field === "type") return formatTaskLabel(value);
  if (field === "dueDate" || field === "startedAt" || field === "completedAt") {
    return formatTaskDate(value);
  }
  if (field === "sprintId") {
    return value ? "Assigned sprint" : "No sprint";
  }
  if (field === "assigneeId") {
    return value ? "Assigned member" : "Unassigned";
  }
  return String(value);
}

function formatChangeDetail(activity) {
  const { field, oldValue, newValue } = activity;
  if (!field) return "";

  const fieldLabel = formatActivityField(field);

  if (field === "sprintId") {
    if (oldValue === null || oldValue === undefined) return "Added to sprint";
    if (newValue === null || newValue === undefined) return "Removed from sprint";
    return "Moved to another sprint";
  }

  if (field === "assigneeId") {
    if (oldValue === null || oldValue === undefined) return "Assigned to team member";
    if (newValue === null || newValue === undefined) return "Removed assignment";
    return "Reassigned to another member";
  }

  if (oldValue !== null || newValue !== null) {
    const oldDisplay = formatActivityValue(oldValue, field);
    const newDisplay = formatActivityValue(newValue, field);
    return `${fieldLabel}: ${oldDisplay} → ${newDisplay}`;
  }

  return fieldLabel;
}

export function TaskActivityList({ activities = [] }) {
  const [showAll, setShowAll] = useState(false);

  if (activities.length === 0) {
    return (
      <div className="task-activity-empty">
        <AlertCircleIcon size={18} />
        <p>No activity recorded for this task yet.</p>
      </div>
    );
  }

  const visibleActivities = showAll ? activities : activities.slice(0, 5);
  const hasMore = activities.length > 5;

  return (
    <div className="task-activity-wrapper">
      <ol className="task-activity-list">
        {visibleActivities.map((activity) => {
          const action = formatActivityAction(activity.type);
          const change = formatChangeDetail(activity);
          const Icon = getActivityIcon(activity.type);
          const actorName = getTaskDisplayName(activity.actor);

          return (
            <li className="task-activity" key={activity.id}>
              <div className="task-activity__marker" aria-hidden="true">
                <Icon size={11} />
              </div>
              <div className="task-activity__content">
                <div className="task-activity__headline">
                  <strong className="task-activity__actor">{actorName}</strong>
                  <span className="task-activity__action">{action}</span>
                  <span className="task-activity__dot" aria-hidden="true">·</span>
                  <time className="task-activity__time" dateTime={activity.createdAt}>
                    {formatTaskDate(activity.createdAt, { dateStyle: "medium", timeStyle: "short" })}
                  </time>
                </div>
                {change && <span className="task-activity__change">{change}</span>}
              </div>
            </li>
          );
        })}
      </ol>
      {hasMore && (
        <div className="task-activity__footer">
          <button
            type="button"
            className="task-activity__toggle"
            onClick={() => setShowAll((prev) => !prev)}
            aria-expanded={showAll}
          >
            {showAll ? "Show less" : `Show more (${activities.length - 5} older)`}
          </button>
        </div>
      )}
    </div>
  );
}