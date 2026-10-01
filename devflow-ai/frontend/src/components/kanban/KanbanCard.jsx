import {
  formatTaskDate,
  formatTaskLabel,
  getTaskDisplayName,
  STATUS_TRANSITIONS,
} from "../tasks/taskUtils";

export function KanbanCard({ task, pending, onMove, onDragStart, onDragEnd }) {
  const transitions = STATUS_TRANSITIONS[task.status] || [];

  return (
    <article
      className={`kanban-card${pending ? " is-pending" : ""}`}
      draggable={!pending}
      aria-roledescription="draggable task card"
      onDragStart={(event) => onDragStart(task, event)}
      onDragEnd={onDragEnd}
    >
      <div className="kanban-card__topline">
        <span className="kanban-card__number">{task.taskNumber}</span>
        {pending && <span className="kanban-card__pending" role="status">Updating…</span>}
      </div>
      <h3>{task.title}</h3>
      <div className="kanban-card__labels">
        <span className="kanban-chip">{formatTaskLabel(task.priority)}</span>
        <span className="kanban-card__type">{formatTaskLabel(task.type)}</span>
      </div>
      <div className="kanban-card__metadata">
        <span>{task.storyPoints == null ? "No points" : `${task.storyPoints} points`}</span>
        <span>{getTaskDisplayName(task.assignee)}</span>
        <span>{task.dueDate ? `Due ${formatTaskDate(task.dueDate)}` : "No due date"}</span>
      </div>
      {transitions.length > 0 && (
        <div className="kanban-card__moves" aria-label={`Move ${task.taskNumber} to another status`}>
          {transitions.map((status) => (
            <button
              className="kanban-card__move-button"
              type="button"
              key={status}
              disabled={pending}
              onClick={() => onMove(task, status)}
            >
              Move to {formatTaskLabel(status)}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}