import { useEffect, useState } from "react";
import {
  assignTaskRequest,
  deleteTaskRequest,
  getTaskRequest,
  listTaskActivitiesRequest,
  updateTaskStatusRequest,
} from "../../api/taskApi";
import { TaskActivityList } from "./TaskActivityList";
import {
  STATUS_TRANSITIONS,
  formatTaskDate,
  formatTaskLabel,
  getTaskDisplayName,
  getTaskErrorMessage,
} from "./taskUtils";

function DetailField({ label, children }) {
  return (
    <div className="task-detail-field">
      <dt>{label}</dt>
      <dd>{children ?? "Not set"}</dd>
    </div>
  );
}

export function TaskDetailsPanel({
  workspaceId,
  projectId,
  taskId,
  members,
  onClose,
  onEdit,
  onChanged,
  onDeleted,
}) {
  const [task, setTask] = useState(null);
  const [taskError, setTaskError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activity, setActivity] = useState([]);
  const [activityError, setActivityError] = useState(null);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [assigneeValue, setAssigneeValue] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [detailReload, setDetailReload] = useState(0);
  const [activityReload, setActivityReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadTask() {
      setIsLoading(true);
      setTaskError(null);
      try {
        const response = await getTaskRequest(workspaceId, projectId, taskId);
        if (active) {
          setTask(response.data);
          setAssigneeValue(response.data.assigneeId || "");
        }
      } catch (error) {
        if (active) setTaskError(error);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadTask();
    return () => { active = false; };
  }, [workspaceId, projectId, taskId, detailReload]);

  useEffect(() => {
    let active = true;
    async function loadActivity() {
      setIsActivityLoading(true);
      setActivityError(null);
      try {
        const response = await listTaskActivitiesRequest(workspaceId, projectId, taskId);
        if (active) setActivity(response.data);
      } catch (error) {
        if (active) setActivityError(error);
      } finally {
        if (active) setIsActivityLoading(false);
      }
    }
    loadActivity();
    return () => { active = false; };
  }, [workspaceId, projectId, taskId, activityReload]);

  const refreshList = (updatedTask) => {
    onChanged(updatedTask);
    setActivityReload((value) => value + 1);
    setActionError("");
    setActionSuccess("");
  };

  const runTaskAction = async (action, request, successMessage) => {
    setActionError("");
    setActionSuccess("");
    setPendingAction(action);
    try {
      const response = await request();
      if (response.data) {
        setTask(response.data);
        setAssigneeValue(response.data.assigneeId || "");
        refreshList(response.data);
      }
      if (successMessage) setActionSuccess(successMessage);
      return response;
    } catch (error) {
      setActionError(getTaskErrorMessage(error, "Unable to update this task."));
      return null;
    } finally {
      setPendingAction("");
    }
  };

  const handleDelete = async (event) => {
    event.preventDefault();
    if (deleteConfirmation !== task.taskNumber) return;
    setActionError("");
    setPendingAction("delete");
    try {
      await deleteTaskRequest(workspaceId, projectId, taskId);
      onDeleted();
    } catch (error) {
      setActionError(getTaskErrorMessage(error, "Unable to permanently delete this task."));
    } finally {
      setPendingAction("");
    }
  };

  if (isLoading) {
    return <aside className="task-panel task-detail-panel" aria-label="Task details" role="status">Loading task…</aside>;
  }

  if (taskError || !task) {
    return (
      <aside className="task-panel task-detail-panel" aria-label="Task details">
        <header className="task-panel__header">
          <h2>Task unavailable</h2>
          <button className="task-icon-button" type="button" onClick={onClose} aria-label="Close task details">×</button>
        </header>
        <div className="task-inline-error" role="alert">
          <p>{getTaskErrorMessage(taskError, "This task could not be loaded.")}</p>
          {taskError?.response?.status !== 404 && (
            <button className="task-button task-button--quiet" type="button" onClick={() => setDetailReload((value) => value + 1)}>Retry</button>
          )}
          <button className="task-button task-button--quiet" type="button" onClick={onClose}>Back to tasks</button>
        </div>
      </aside>
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[task.status] || [];

  return (
    <aside className="task-panel task-detail-panel" aria-label={`Details for ${task.taskNumber}`}>
      <header className="task-panel__header">
        <div>
          <p className="task-eyebrow">TASK DETAILS</p>
          <h2>{task.taskNumber}</h2>
        </div>
        <button className="task-icon-button" type="button" onClick={onClose} aria-label="Close task details">×</button>
      </header>

      <div className="task-detail-title">
        <h3>{task.title}</h3>
        <div className="task-detail-badges">
          <span className="task-badge">{formatTaskLabel(task.status)}</span>
          <span className="task-badge">{formatTaskLabel(task.priority)}</span>
          <span className="task-badge">{formatTaskLabel(task.type)}</span>
        </div>
      </div>

      <section className="task-detail-section">
        <h3>Description</h3>
        <p className="task-detail-description">{task.description || "No description provided."}</p>
      </section>

      <dl className="task-detail-grid">
        <DetailField label="Story points">{task.storyPoints ?? "Not set"}</DetailField>
        <DetailField label="Assignee">{getTaskDisplayName(task.assignee)}</DetailField>
        <DetailField label="Requirement">{task.requirement?.title}</DetailField>
        <DetailField label="Due date">{task.dueDate ? formatTaskDate(task.dueDate) : null}</DetailField>
        <DetailField label="Started">{task.startedAt ? formatTaskDate(task.startedAt) : null}</DetailField>
        <DetailField label="Completed">{task.completedAt ? formatTaskDate(task.completedAt) : null}</DetailField>
        <DetailField label="Created by">{getTaskDisplayName(task.createdBy)}</DetailField>
        <DetailField label="Created">{formatTaskDate(task.createdAt, { dateStyle: "medium", timeStyle: "short" })}</DetailField>
        <DetailField label="Updated">{formatTaskDate(task.updatedAt, { dateStyle: "medium", timeStyle: "short" })}</DetailField>
      </dl>

      <section className="task-detail-section task-detail-section--actions" aria-label="Task actions">
        <div className="task-action-heading">
          <h3>Status</h3>
          <button className="task-button task-button--quiet" type="button" onClick={() => onEdit(task)}>Edit task</button>
        </div>
        {allowedTransitions.length > 0 ? (
          <div className="task-transition-actions">
            {allowedTransitions.map((status) => (
              <button
                className="task-button task-button--quiet"
                type="button"
                key={status}
                disabled={Boolean(pendingAction)}
                onClick={() => runTaskAction("status", () => updateTaskStatusRequest(workspaceId, projectId, task.id, status), `Status changed to ${formatTaskLabel(status)}.`)}
              >
                Move to {formatTaskLabel(status)}
              </button>
            ))}
          </div>
        ) : <p className="task-empty-inline">No status transitions are available.</p>}

        <form
          className="task-assignment-form"
          onSubmit={(event) => {
            event.preventDefault();
            runTaskAction("assignee", () => assignTaskRequest(workspaceId, projectId, task.id, assigneeValue || null), "Assignment updated.");
          }}
        >
          <label className="task-field">
            <span>Assignee</span>
            <select value={assigneeValue} onChange={(event) => setAssigneeValue(event.target.value)}>
              <option value="">Unassigned</option>
              {task.assigneeId && !members.some((member) => member.userId === task.assigneeId) && (
                <option value={task.assigneeId}>{getTaskDisplayName(task.assignee)} · current assignee</option>
              )}
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {[member.firstName, member.lastName].filter(Boolean).join(" ") || member.email} · {formatTaskLabel(member.role)}
                </option>
              ))}
            </select>
          </label>
          <button className="task-button task-button--quiet" type="submit" disabled={Boolean(pendingAction) || assigneeValue === (task.assigneeId || "")}>
            {pendingAction === "assignee" ? "Saving…" : "Save assignee"}
          </button>
        </form>
        {actionError && <p className="task-form__error" role="alert">{actionError}</p>}
        {actionSuccess && <p className="task-success" role="status">{actionSuccess}</p>}
      </section>

      <section className="task-detail-section" aria-labelledby="task-activity-title">
        <div className="task-action-heading">
          <h3 id="task-activity-title">Activity</h3>
          <button className="task-text-button" type="button" onClick={() => setActivityReload((value) => value + 1)} disabled={isActivityLoading}>
            Refresh
          </button>
        </div>
        {isActivityLoading ? <p className="task-empty-inline" role="status">Loading activity…</p> : null}
        {!isActivityLoading && activityError && (
          <div className="task-inline-error" role="alert">
            <p>{getTaskErrorMessage(activityError, "Unable to load activity.")}</p>
            <button className="task-button task-button--quiet" type="button" onClick={() => setActivityReload((value) => value + 1)}>Retry activity</button>
          </div>
        )}
        {!isActivityLoading && !activityError && <TaskActivityList activities={activity} />}
      </section>

      <section className="task-delete-section">
        {!isDeleteConfirming && (
          <button className="task-button task-button--danger-quiet" type="button" onClick={() => { setDeleteConfirmation(""); setIsDeleteConfirming(true); }}>
            Delete task permanently
          </button>
        )}
        {isDeleteConfirming && (
          <form className="task-delete-confirmation" onSubmit={handleDelete}>
            <h3>Permanently delete this task?</h3>
            <p>This cannot be undone. The task and its recorded activity will be deleted. Type <strong>{task.taskNumber}</strong> to confirm.</p>
            <label className="task-field">
              <span>Task number confirmation</span>
              <input autoComplete="off" value={deleteConfirmation.trim()} onChange={(event) => setDeleteConfirmation(event.target.value)} />
            </label>
            <div className="task-form__actions">
              <button className="task-button task-button--danger" type="submit" disabled={deleteConfirmation.trim() !== task.taskNumber || pendingAction === "delete"}>
                {pendingAction === "delete" ? "Deleting…" : "Permanently delete"}
              </button>
              <button className="task-button task-button--quiet" type="button" onClick={() => { setDeleteConfirmation(""); setIsDeleteConfirming(false); }} disabled={pendingAction === "delete"}>Cancel</button>
            </div>
          </form>
        )}
      </section>
    </aside>
  );
}