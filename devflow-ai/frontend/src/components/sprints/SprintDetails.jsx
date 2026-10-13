import { useState } from "react";
import { SprintProgress } from "./SprintProgress";
import { formatTaskDate, formatTaskLabel } from "./sprintUtils";
import {
  EditIcon,
  TrashIcon,
  CalendarIcon,
  CheckIcon,
  CloseIcon,
} from "../icons";

export function SprintDetails({
  sprint,
  pendingAction,
  onEdit,
  onLifecycle,
  onDelete,
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const canDelete = sprint.status !== "ACTIVE";
  const statusSlug = (sprint.status || "").toLowerCase();

  return (
    <section
      id="sprint-overview-panel"
      className="sprint-panel sprint-overview-card"
      aria-labelledby="sprint-overview-heading"
    >
      <div className="sprint-overview-card__header">
        <div className="sprint-overview-card__identity">
          <div className="sprint-overview-card__title-row">
            <h2 id="sprint-overview-heading">{sprint.name}</h2>
            <span className={`sprint-status sprint-status--${statusSlug}`}>
              {formatTaskLabel(sprint.status)}
            </span>
          </div>
          <div className="sprint-overview-card__dates">
            <CalendarIcon size={13} />
            <span>
              {formatTaskDate(sprint.startDate)}
              <span aria-hidden="true"> – </span>
              {formatTaskDate(sprint.endDate)}
            </span>
          </div>
          {sprint.goal && (
            <p className="sprint-overview-card__goal">{sprint.goal}</p>
          )}
        </div>

        <div className="sprint-overview-card__controls">
          <div className="sprint-overview-card__actions">
            <button
              className="sprint-button sprint-button--quiet sprint-button--edit"
              type="button"
              onClick={() => onEdit(sprint)}
            >
              <EditIcon size={14} />
              <span>Edit sprint</span>
            </button>

            {sprint.status === "PLANNED" && (
              <>
                <button
                  className="sprint-button sprint-button--primary"
                  type="button"
                  onClick={() => onLifecycle(sprint, "start")}
                  disabled={Boolean(pendingAction)}
                >
                  {pendingAction === "start" ? "Starting…" : "Start sprint"}
                </button>
                <button
                  className="sprint-button sprint-button--cancel"
                  type="button"
                  onClick={() => onLifecycle(sprint, "cancel")}
                  disabled={Boolean(pendingAction)}
                >
                  <CloseIcon size={14} />
                  <span>{pendingAction === "cancel" ? "Cancelling…" : "Cancel sprint"}</span>
                </button>
              </>
            )}

            {sprint.status === "ACTIVE" && (
              <>
                <button
                  className="sprint-button sprint-button--complete"
                  type="button"
                  onClick={() => onLifecycle(sprint, "complete")}
                  disabled={Boolean(pendingAction)}
                >
                  <CheckIcon size={14} />
                  <span>{pendingAction === "complete" ? "Completing…" : "Complete sprint"}</span>
                </button>
                <button
                  className="sprint-button sprint-button--cancel"
                  type="button"
                  onClick={() => onLifecycle(sprint, "cancel")}
                  disabled={Boolean(pendingAction)}
                >
                  <CloseIcon size={14} />
                  <span>{pendingAction === "cancel" ? "Cancelling…" : "Cancel sprint"}</span>
                </button>
              </>
            )}

            {canDelete && !isConfirmingDelete && (
              <button
                className="sprint-button sprint-button--danger-quiet"
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
              >
                <TrashIcon size={14} />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {sprint.status === "ACTIVE" && (
        <p className="sprint-inline-note">
          Completing the sprint marks it completed; remaining tasks stay assigned to this sprint.
        </p>
      )}
      {sprint.status === "COMPLETED" && (
        <p className="sprint-inline-note">
          This sprint is complete. Its tasks remain associated with it for reporting.
        </p>
      )}
      {sprint.status === "CANCELLED" && (
        <p className="sprint-inline-note">
          This sprint is cancelled. Its tasks remain associated with it.
        </p>
      )}

      {isConfirmingDelete && (
        <div
          className="sprint-delete-confirmation"
          role="alertdialog"
          aria-labelledby="sprint-delete-heading"
        >
          <h4 id="sprint-delete-heading">Delete {sprint.name}?</h4>
          <p>
            Deleting this sprint will return its assigned tasks to the backlog. The tasks themselves will not be deleted.
          </p>
          <div className="sprint-form__actions">
            <button
              className="sprint-button sprint-button--danger"
              type="submit"
              onClick={() => onDelete(sprint)}
              disabled={pendingAction === "delete"}
            >
              {pendingAction === "delete" ? "Deleting…" : "Confirm delete sprint"}
            </button>
            <button
              className="sprint-button sprint-button--quiet"
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={pendingAction === "delete"}
            >
              Keep sprint
            </button>
          </div>
        </div>
      )}

      <SprintProgress stats={sprint.stats} />
    </section>
  );
}