import { useState } from "react";
import { SprintProgress } from "./SprintProgress";
import { SprintTaskList } from "./SprintTaskList";
import { formatTaskDate, formatTaskLabel } from "./sprintUtils";

export function SprintDetails({
  sprint,
  sprints,
  pendingTaskIds,
  pendingAction,
  onEdit,
  onLifecycle,
  onDelete,
  onMoveTask,
  onRemoveTask,
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const canDelete = sprint.status !== "ACTIVE";

  return (
    <section className="sprint-panel sprint-details" aria-labelledby="sprint-details-heading">
      <header className="sprint-details__header">
        <div>
          <p className="sprint-eyebrow">SPRINT DETAILS</p>
          <h2 id="sprint-details-heading">{sprint.name}</h2>
          <span className="sprint-status">{formatTaskLabel(sprint.status)}</span>
        </div>
        <button className="sprint-button sprint-button--quiet" type="button" onClick={() => onEdit(sprint)}>
          Edit sprint
        </button>
      </header>

      <div className="sprint-details__metadata">
        <div>
          <span>Goal</span>
          <p>{sprint.goal || "No goal provided."}</p>
        </div>
        <div>
          <span>Start date</span>
          <p>{formatTaskDate(sprint.startDate)}</p>
        </div>
        <div>
          <span>End date</span>
          <p>{formatTaskDate(sprint.endDate)}</p>
        </div>
      </div>

      <SprintProgress stats={sprint.stats} />

      <section className="sprint-details__actions" aria-label="Sprint lifecycle actions">
        <h3>Sprint actions</h3>
        <div className="sprint-details__action-buttons">
          {sprint.status === "PLANNED" && (
            <>
              <button className="sprint-button sprint-button--primary" type="button" onClick={() => onLifecycle(sprint, "start")} disabled={Boolean(pendingAction)}>
                {pendingAction === "start" ? "Starting…" : "Start sprint"}
              </button>
              <button className="sprint-button sprint-button--quiet" type="button" onClick={() => onLifecycle(sprint, "cancel")} disabled={Boolean(pendingAction)}>
                {pendingAction === "cancel" ? "Cancelling…" : "Cancel sprint"}
              </button>
            </>
          )}
          {sprint.status === "ACTIVE" && (
            <>
              <button className="sprint-button sprint-button--primary" type="button" onClick={() => onLifecycle(sprint, "complete")} disabled={Boolean(pendingAction)}>
                {pendingAction === "complete" ? "Completing…" : "Complete sprint"}
              </button>
              <button className="sprint-button sprint-button--quiet" type="button" onClick={() => onLifecycle(sprint, "cancel")} disabled={Boolean(pendingAction)}>
                {pendingAction === "cancel" ? "Cancelling…" : "Cancel sprint"}
              </button>
              <p className="sprint-inline-note">Completing the sprint changes its status; remaining tasks stay assigned to it.</p>
            </>
          )}
          {sprint.status === "COMPLETED" && <p className="sprint-inline-note">This sprint is complete. Its tasks remain associated with it.</p>}
          {sprint.status === "CANCELLED" && <p className="sprint-inline-note">This sprint is cancelled. Its tasks remain associated with it.</p>}
          {canDelete && !isConfirmingDelete && (
            <button className="sprint-button sprint-button--danger-quiet" type="button" onClick={() => setIsConfirmingDelete(true)}>
              Delete sprint
            </button>
          )}
        </div>
        {isConfirmingDelete && (
          <div className="sprint-delete-confirmation" role="alertdialog" aria-labelledby="sprint-delete-heading">
            <h4 id="sprint-delete-heading">Delete {sprint.name}?</h4>
            <p>Deleting this sprint will return its associated tasks to the backlog. The tasks themselves will not be deleted.</p>
            <div className="sprint-form__actions">
              <button className="sprint-button sprint-button--danger" type="button" onClick={() => onDelete(sprint)} disabled={pendingAction === "delete"}>
                {pendingAction === "delete" ? "Deleting…" : "Confirm delete sprint"}
              </button>
              <button className="sprint-button sprint-button--quiet" type="button" onClick={() => setIsConfirmingDelete(false)} disabled={pendingAction === "delete"}>Keep sprint</button>
            </div>
          </div>
        )}
      </section>

      <section className="sprint-details__tasks" aria-labelledby="sprint-tasks-heading">
        <header className="sprint-panel__header">
          <div>
            <p className="sprint-eyebrow">SPRINT WORK</p>
            <h3 id="sprint-tasks-heading">Tasks <span className="sprint-count">{sprint.tasks.length}</span></h3>
          </div>
        </header>
        <SprintTaskList
          tasks={sprint.tasks}
          sprints={sprints}
          pendingTaskIds={pendingTaskIds}
          onMove={onMoveTask}
          onRemove={onRemoveTask}
        />
      </section>
    </section>
  );
}