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
import {
  CloseIcon,
  EditIcon,
  TrashIcon,
  RefreshIcon,
  AlertCircleIcon,
  CheckIcon,
} from "../icons";

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
  const [activeTab, setActiveTab] = useState("details");
  const [prevTaskId, setPrevTaskId] = useState(taskId);

  if (prevTaskId !== taskId) {
    setPrevTaskId(taskId);
    setActiveTab("details");
  }

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
    return (
      <aside className="task-panel task-detail-panel" aria-label="Task details" role="status">
        <div className="task-loading">
          <span className="navigation-state__spinner" aria-hidden="true" />
          <span>Loading task details…</span>
        </div>
      </aside>
    );
  }

  if (taskError || !task) {
    return (
      <aside className="task-panel task-detail-panel" aria-label="Task details">
        <header className="task-panel__header">
          <h2>Task unavailable</h2>
          <button className="task-icon-button" type="button" onClick={onClose} aria-label="Close task details">
            <CloseIcon size={16} />
          </button>
        </header>
        <div className="task-inline-error" role="alert">
          <AlertCircleIcon size={16} />
          <p>{getTaskErrorMessage(taskError, "This task could not be loaded.")}</p>
          {taskError?.response?.status !== 404 && (
            <button className="task-button task-button--quiet" type="button" onClick={() => setDetailReload((value) => value + 1)}>
              <RefreshIcon size={13} />
              <span>Retry</span>
            </button>
          )}
          <button className="task-button task-button--quiet" type="button" onClick={onClose}>Back to tasks</button>
        </div>
      </aside>
    );
  }

  const allowedTransitions = STATUS_TRANSITIONS[task.status] || [];
  const statusSlug = (task.status || "").toLowerCase();
  const prioritySlug = (task.priority || "").toLowerCase();

  return (
    <aside className="task-panel task-detail-panel" aria-label={`Details for ${task.taskNumber}`}>
      <header className="task-panel__header">
        <div className="task-panel__header-main">
          <p className="task-eyebrow">TASK DETAILS</p>
          <div className="task-panel__header-identity">
            <h2>{task.taskNumber}</h2>
            <div className="task-detail-badges">
              <span className={`task-badge task-badge--${statusSlug}`}>
                {formatTaskLabel(task.status)}
              </span>
              <span className={`task-priority-badge task-priority--${prioritySlug}`}>
                {formatTaskLabel(task.priority)}
              </span>
              <span className="task-type-badge">{formatTaskLabel(task.type)}</span>
            </div>
          </div>
        </div>
        <div className="task-panel__header-actions">
          <button className="task-button task-button--quiet" type="button" onClick={() => onEdit(task)} title="Edit task">
            <EditIcon size={14} />
            <span>Edit</span>
          </button>
          <button className="task-icon-button" type="button" onClick={onClose} aria-label="Close task details">
            <CloseIcon size={16} />
          </button>
        </div>
      </header>

      <div className="task-panel-tabs" role="tablist" aria-label="Task panel sections">
        <button
          role="tab"
          id="task-tab-details"
          aria-controls="task-tabpanel-details"
          aria-selected={activeTab === "details"}
          className={`task-panel-tab${activeTab === "details" ? " is-active" : ""}`}
          onClick={() => setActiveTab("details")}
          type="button"
        >
          <span>Details</span>
        </button>
        <button
          role="tab"
          id="task-tab-activity"
          aria-controls="task-tabpanel-activity"
          aria-selected={activeTab === "activity"}
          className={`task-panel-tab${activeTab === "activity" ? " is-active" : ""}`}
          onClick={() => setActiveTab("activity")}
          type="button"
        >
          <span>Activity</span>
          {activity.length > 0 && (
            <span className="task-panel-tab__badge">{activity.length}</span>
          )}
        </button>
      </div>

      <div className="task-panel-tabcontent">
        <div
          role="tabpanel"
          id="task-tabpanel-details"
          aria-labelledby="task-tab-details"
          className={`task-tabpanel${activeTab === "details" ? " is-active" : ""}`}
          hidden={activeTab !== "details"}
        >
          <div className="task-detail-title">
            <h3>{task.title}</h3>
          </div>

          <section className="task-detail-section">
            <h4 className="task-detail-section__heading">Description</h4>
            <p className="task-detail-description">{task.description || "No description provided."}</p>
          </section>

          <section className="task-detail-section">
            <h4 className="task-detail-section__heading">Attributes</h4>
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
          </section>

          <section className="task-detail-section task-detail-section--actions" aria-label="Task workflow and assignment">
            <h4 className="task-detail-section__heading">Workflow Status</h4>
            {allowedTransitions.length > 0 ? (
              <div className="task-transition-actions">
                {allowedTransitions.map((status) => (
                  <button
                    className="task-button task-button--quiet"
                    type="button"
                    key={status}
                    disabled={Boolean(pendingAction)}
                    onClick={() =>
                      runTaskAction(
                        "status",
                        () => updateTaskStatusRequest(workspaceId, projectId, task.id, status),
                        `Status changed to ${formatTaskLabel(status)}.`
                      )
                    }
                  >
                    <CheckIcon size={13} />
                    <span>Move to {formatTaskLabel(status)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="task-empty-inline">No status transitions are available from this state.</p>
            )}

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
                    <option value={task.assigneeId}>{getTaskDisplayName(task.assignee)} · current</option>
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

          <section className="task-delete-section">
            {!isDeleteConfirming && (
              <button className="task-button task-button--danger-quiet" type="button" onClick={() => { setDeleteConfirmation(""); setIsDeleteConfirming(true); }}>
                <TrashIcon size={14} />
                <span>Delete task permanently</span>
              </button>
            )}
            {isDeleteConfirming && (
              <form className="task-delete-confirmation" onSubmit={handleDelete}>
                <h3>Permanently delete this task?</h3>
                <p>This cannot be undone. Type <strong>{task.taskNumber}</strong> below to confirm deletion.</p>
                <label className="task-field">
                  <span>Confirmation</span>
                  <input autoComplete="off" value={deleteConfirmation.trim()} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder={`Type ${task.taskNumber}`} />
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
        </div>

        <div
          role="tabpanel"
          id="task-tabpanel-activity"
          aria-labelledby="task-tab-activity"
          className={`task-tabpanel${activeTab === "activity" ? " is-active" : ""}`}
          hidden={activeTab !== "activity"}
        >
          <div className="task-activity-header">
            <div>
              <h4 className="task-detail-section__heading">Activity Timeline</h4>
              <p className="task-activity-header__subtitle">Chronological record of updates on this task</p>
            </div>
            <button
              className="task-button task-button--quiet task-button--icon-only"
              type="button"
              onClick={() => setActivityReload((value) => value + 1)}
              disabled={isActivityLoading}
              title="Refresh activity"
              aria-label="Refresh activity"
            >
              <RefreshIcon size={13} className={isActivityLoading ? "is-spinning" : ""} />
            </button>
          </div>

          {isActivityLoading && (
            <div className="task-loading task-loading--compact" role="status">
              <span className="navigation-state__spinner" aria-hidden="true" />
              <span>Loading activity…</span>
            </div>
          )}
          {!isActivityLoading && activityError && (
            <div className="task-inline-error" role="alert">
              <AlertCircleIcon size={16} />
              <p>{getTaskErrorMessage(activityError, "Unable to load activity.")}</p>
              <button className="task-button task-button--quiet" type="button" onClick={() => setActivityReload((value) => value + 1)}>Retry</button>
            </div>
          )}
          {!isActivityLoading && !activityError && (
            <TaskActivityList activities={activity} />
          )}
        </div>
      </div>
    </aside>
  );
}