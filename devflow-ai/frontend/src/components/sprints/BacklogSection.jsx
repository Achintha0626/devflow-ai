import { formatTaskDate, formatTaskLabel, getTaskDisplayName } from "../tasks/taskUtils";

export function BacklogSection({ backlog, selectedSprint, pendingTaskIds, onAddTask }) {
  const canAddToSelectedSprint = selectedSprint && ["PLANNED", "ACTIVE"].includes(selectedSprint.status);

  return (
    <section className="sprint-panel sprint-backlog" aria-labelledby="sprint-backlog-heading">
      <header className="sprint-panel__header">
        <div>
          <p className="sprint-eyebrow">UNSCHEDULED WORK</p>
          <h2 id="sprint-backlog-heading">Backlog <span className="sprint-count">{backlog.length}</span></h2>
        </div>
      </header>
      {!selectedSprint && <p className="sprint-empty-note">Select a sprint to add backlog tasks.</p>}
      {selectedSprint && !canAddToSelectedSprint && (
        <p className="sprint-empty-note">Tasks can be added from the backlog when a planned or active sprint is selected.</p>
      )}
      {backlog.length === 0 ? (
        <p className="sprint-empty-note">The backlog is empty.</p>
      ) : (
        <ul className="sprint-task-list sprint-backlog__list">
          {backlog.map((task) => (
            <li className="sprint-task" key={task.id}>
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
              {canAddToSelectedSprint && (
                <button
                  className="sprint-button sprint-button--quiet"
                  type="button"
                  onClick={() => onAddTask(task)}
                  disabled={pendingTaskIds.has(task.id)}
                >
                  {pendingTaskIds.has(task.id) ? "Adding…" : `Add to ${selectedSprint.name}`}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}