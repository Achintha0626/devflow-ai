import {
  formatTaskDate,
  formatTaskLabel,
  getTaskDisplayName,
} from "../tasks/taskUtils";
import { PlusIcon, UserIcon } from "../icons";

export function BacklogSection({
  backlog,
  selectedSprint,
  pendingTaskIds,
  onAddTask,
}) {
  const canAddToSelectedSprint =
    selectedSprint && ["PLANNED", "ACTIVE"].includes(selectedSprint.status);

  return (
    <section
      className="sprint-panel sprint-backlog-panel"
      aria-labelledby="sprint-backlog-heading"
    >
      <header className="sprint-panel__header">
        <div>
          <p className="sprint-eyebrow">UNSCHEDULED WORK</p>
          <h2 id="sprint-backlog-heading">
            Backlog <span className="sprint-count">{backlog.length}</span>
          </h2>
        </div>
      </header>

      {!selectedSprint && (
        <div className="sprint-empty-note">
          <p>Select a sprint to add backlog tasks.</p>
        </div>
      )}

      {selectedSprint && !canAddToSelectedSprint && (
        <div className="sprint-empty-note">
          <p>Tasks can be added from the backlog when a planned or active sprint is selected.</p>
        </div>
      )}

      {backlog.length === 0 ? (
        <div className="sprint-empty-note">
          <p>The backlog is empty.</p>
        </div>
      ) : (
        <div className="sprint-backlog__scroll">
          <ul className="sprint-task-list">
            {backlog.map((task) => {
              const statusSlug = (task.status || "").toLowerCase();
              const prioritySlug = (task.priority || "").toLowerCase();
              const isPending = pendingTaskIds.has(task.id);

              return (
                <li
                  className={`sprint-task-card${isPending ? " is-pending" : ""}`}
                  key={task.id}
                >
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
                      <span
                        className="sprint-task-card__assignee"
                        title={getTaskDisplayName(task.assignee)}
                      >
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

                  {canAddToSelectedSprint && (
                    <div className="sprint-task-card__actions">
                      <button
                        className="sprint-button sprint-button--quiet sprint-button--sm"
                        type="button"
                        onClick={() => onAddTask(task)}
                        disabled={isPending}
                        title={`Add ${task.taskNumber} to ${selectedSprint.name}`}
                      >
                        <PlusIcon size={12} />
                        <span>{isPending ? "Adding…" : `Add to ${selectedSprint.name}`}</span>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}