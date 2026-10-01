import { useState } from "react";
import {
  formatTaskDate,
  formatTaskLabel,
  getTaskDisplayName,
} from "../tasks/taskUtils";

function SprintTaskRow({ task, sprints, pending, onMove, onRemove }) {
  const [targetSprintId, setTargetSprintId] = useState("");
  const destinations = sprints.filter((sprint) =>
    sprint.id !== task.sprintId && ["PLANNED", "ACTIVE"].includes(sprint.status)
  );

  return (
    <li className={`sprint-task${pending ? " is-pending" : ""}`}>
      <div className="sprint-task__main">
        <div className="sprint-task__title-line">
          <span className="sprint-task__number">{task.taskNumber}</span>
          <span className="sprint-task__title">{task.title}</span>
        </div>
        <div className="sprint-task__meta">
          <span>{formatTaskLabel(task.status)}</span>
          <span>{formatTaskLabel(task.priority)}</span>
          <span>{formatTaskLabel(task.type)}</span>
          <span>{task.storyPoints == null ? "No points" : `${task.storyPoints} points`}</span>
          <span>{getTaskDisplayName(task.assignee)}</span>
          <span>{task.dueDate ? formatTaskDate(task.dueDate) : "No due date"}</span>
          {task.requirement && <span>Requirement: {task.requirement.title}</span>}
        </div>
      </div>
      <div className="sprint-task__actions">
        {destinations.length > 0 && (
          <form onSubmit={(event) => { event.preventDefault(); if (targetSprintId) onMove(task, targetSprintId); }}>
            <label className="sprint-sr-only" htmlFor={`destination-${task.id}`}>Move {task.taskNumber} to another sprint</label>
            <select id={`destination-${task.id}`} value={targetSprintId} onChange={(event) => setTargetSprintId(event.target.value)}>
              <option value="">Move to sprint…</option>
              {destinations.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.name} · {formatTaskLabel(sprint.status)}</option>)}
            </select>
            <button className="sprint-button sprint-button--quiet" type="submit" disabled={pending || !targetSprintId}>Move</button>
          </form>
        )}
        <button className="sprint-text-button" type="button" onClick={() => onRemove(task)} disabled={pending}>
          {pending ? "Moving…" : "Move to backlog"}
        </button>
      </div>
    </li>
  );
}

export function SprintTaskList({ tasks, sprints, pendingTaskIds, onMove, onRemove }) {
  if (tasks.length === 0) {
    return <p className="sprint-empty-note">No tasks are assigned to this sprint.</p>;
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