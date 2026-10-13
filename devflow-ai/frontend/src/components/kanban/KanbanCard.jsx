import {
  formatTaskDate,
  formatTaskLabel,
  getTaskDisplayName,
  STATUS_TRANSITIONS,
} from "../tasks/taskUtils";
import { UserIcon, ArrowRightIcon } from "../icons";

export function KanbanCard({
  task,
  pending,
  onMove,
  onDragStart,
  onDragEnd,
  onSelect,
}) {
  const transitions = STATUS_TRANSITIONS[task.status] || [];
  const prioritySlug = (task.priority || "").toLowerCase();

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(task);
    }
  };

  return (
    <article
      className={`kanban-card kanban-card--priority-${prioritySlug}${pending ? " is-pending" : ""}`}
      draggable={!pending}
      tabIndex={0}
      role="button"
      aria-label={`Task ${task.taskNumber}: ${task.title}`}
      onClick={() => onSelect?.(task)}
      onKeyDown={handleKeyDown}
      onDragStart={(event) => onDragStart(task, event)}
      onDragEnd={onDragEnd}
    >
      <div className="kanban-card__header">
        <span className="kanban-card__number">{task.taskNumber}</span>
        <div className="kanban-card__header-right">
          {task.dueDate && (
            <span className="kanban-card__due">Due {formatTaskDate(task.dueDate)}</span>
          )}
          {pending && <span className="kanban-card__pending" role="status">Moving…</span>}
        </div>
      </div>

      <h3 className="kanban-card__title">{task.title}</h3>

      <div className="kanban-card__footer">
        <div className="kanban-card__tags">
          <span className={`kanban-priority-chip kanban-priority--${prioritySlug}`}>
            {formatTaskLabel(task.priority)}
          </span>
          <span className="kanban-type-chip">{formatTaskLabel(task.type)}</span>
          {task.storyPoints != null && (
            <span className="kanban-points-chip">{task.storyPoints} pts</span>
          )}
        </div>
        <span className="kanban-card__assignee" title={getTaskDisplayName(task.assignee)}>
          <UserIcon size={11} />
          <span>{getTaskDisplayName(task.assignee)}</span>
        </span>
      </div>

      {transitions.length > 0 && (
        <div
          className="kanban-card__moves"
          aria-label={`Move ${task.taskNumber} to another status`}
        >
          {transitions.map((status) => (
            <button
              className="kanban-card__move-button"
              type="button"
              key={status}
              disabled={pending}
              onClick={(event) => {
                event.stopPropagation();
                onMove(task, status);
              }}
              title={`Move to ${formatTaskLabel(status)}`}
              aria-label={`Move ${task.taskNumber} to ${formatTaskLabel(status)}`}
            >
              <span>{formatTaskLabel(status)}</span>
              <ArrowRightIcon size={10} />
            </button>
          ))}
        </div>
      )}
    </article>
  );
}