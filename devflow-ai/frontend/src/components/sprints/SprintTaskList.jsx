import { useState } from "react";
import {
  formatTaskDate,
  formatTaskLabel,
  getTaskDisplayName,
} from "../tasks/taskUtils";
import { UserIcon } from "../icons";

function SprintTaskRow({ task, sprints, pending, onMove, onRemove }) {
  const [targetSprintId, setTargetSprintId] = useState("");
  const destinations = sprints.filter(
    (sprint) => sprint.id !== task.sprintId && ["PLANNED", "ACTIVE"].includes(sprint.status)
  );

  const statusSlug = (task.status || "").toLowerCase();
  const prioritySlug = (task.priority || "").toLowerCase();

  return (
    <li className={`sprint-task-card${pending ? " is-pending" : ""}`}>
      <div className="sprint-task-card__body">
        <div className="sprint-task-card__title-line">
          <span className="sprint-task-card__number">{task.taskNumber}</span>
          <span className="sprint-task-card__title">{task.title}</span>
        </div>
        <div className="sprint-task-card__meta">
          <span className={`task-badge task-badge--${statusSlug}`}>
            {formatTaskLabel(task.status)}
          </span>
          <span className={`task-priority-badge task-priority--${prioritySlug}`}>
            {formatTaskLabel(task.priority)}
          </span>
          <span className="task-type-badge">{formatTaskLabel(task.type)}</span>
          <span className="task-points-badge">
            {task.storyPoints == null ? "—" : `${task.storyPoints} pts`}
          </span>
          <span className="sprint-task-card__assignee" title={getTaskDisplayName(task.assignee)}>
            <UserIcon size={11} />
            <span>{getTaskDisplayName(task.assignee)}</span>
          </span>
          {task.dueDate && (
            <span className="sprint-task-card__due">Due {formatTaskDate(task.dueDate)}</span>
          )}
          {task.requirement && (
            <span className="sprint-task-card__requirement">
              Req: {task.requirement.title}
            </span>
          )}
        </div>
      </div>

      <div className="sprint-task-card__actions">
        <div className="sprint-task-card__move-controls">
          {destinations.length > 0 && (
            <form
              className="sprint-task-card__move-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (targetSprintId) onMove(task, targetSprintId);
              }}
            >
              <label className="sprint-sr-only" htmlFor={`destination-${task.id}`}>
                Move {task.taskNumber} to another sprint
              </label>
              <select
                id={`destination-${task.id}`}
                className="sprint-task-card__select"
                value={targetSprintId}
                onChange={(event) => setTargetSprintId(event.target.value)}
              >
                <option value="">Move to sprint…</option>
                {destinations.map((sprint) => (
                  <option key={sprint.id} value={sprint.id}>
                    {sprint.name} · {formatTaskLabel(sprint.status)}
                  </option>
                ))}
              </select>
              <button
                className={`sprint-button sprint-button--sm ${targetSprintId ? "sprint-button--primary" : "sprint-button--disabled"}`}
                type="submit"
                disabled={pending || !targetSprintId}
                aria-disabled={pending || !targetSprintId}
                title={targetSprintId ? "Move task to selected sprint" : "Select a destination sprint first"}
              >
                Move
              </button>
            </form>
          )}
          <button
            className="sprint-text-button sprint-task-card__remove-button"
            type="button"
            onClick={() => onRemove(task)}
            disabled={pending}
          >
            {pending ? "Moving…" : "Move to backlog"}
          </button>
        </div>
      </div>
    </li>
  );
}

export function SprintTaskList({ tasks, sprints, pendingTaskIds, onMove, onRemove }) {
  if (tasks.length === 0) {
    return (
      <div className="sprint-empty-note">
        <p>No tasks are assigned to this sprint. Add tasks from the backlog to start planning iteration work.</p>
      </div>
    );
  }

  return (
    <ul className="sprint-task-list">
      {tasks.map((task) => (
        <SprintTaskRow
          key={task.id}
          task={task}
          sprints={sprints}
          pending={pendingTaskIds.has(task.id)}
          onMove={onMove}
          onRemove={onRemove}
        />
      ))}
    </ul>
  );
}