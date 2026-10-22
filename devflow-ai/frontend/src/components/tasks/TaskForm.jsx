import { useState } from "react";
import { createTaskRequest, updateTaskRequest } from "../../api/taskApi";
import { useParams } from "react-router-dom";
import {
  TASK_PRIORITIES,
  TASK_TYPES,
  formatTaskLabel,
  getTaskErrorMessage,
  toDateInputValue,
  toTaskDate,
} from "./taskUtils";
import { CloseIcon } from "../icons";

function getInitialValues(task) {
  return {
    title: task?.title || "",
    description: task?.description || "",
    type: task?.type || "FRONTEND",
    priority: task?.priority || "MEDIUM",
    storyPoints: task?.storyPoints ?? "",
    requirementId: task?.requirementId || "",
    assigneeId: task?.assigneeId || "",
    dueDate: toDateInputValue(task?.dueDate),
  };
}

function createPayload(values = {}) {
  const storyPoints = values.storyPoints === "" || values.storyPoints == null ? null : Number(values.storyPoints);
  return {
    title: typeof values.title === "string" ? values.title.trim() : "",
    description: typeof values.description === "string" ? values.description.trim() : "",
    type: values.type,
    priority: values.priority,
    storyPoints,
    requirementId: values.requirementId || null,
    assigneeId: values.assigneeId || null,
    dueDate: toTaskDate(values.dueDate),
  };
}

function updatePayload(values, task) {
  const next = createPayload(values);
  const payload = {};
  ["title", "description", "type", "priority"].forEach((field) => {
    if (next[field] !== task[field]) payload[field] = next[field];
  });
  if (next.storyPoints !== (task.storyPoints ?? null)) payload.storyPoints = next.storyPoints;
  if (next.requirementId !== (task.requirementId || null)) payload.requirementId = next.requirementId;
  if (values.dueDate !== toDateInputValue(task.dueDate)) payload.dueDate = next.dueDate;
  return payload;
}

export function TaskForm({
  task = null,
  members,
  requirements,
  memberError,
  requirementError,
  onCancel,
  onSaved,
}) {
  const { workspaceId, projectId } = useParams();
  const isEditing = Boolean(task);
  const [values, setValues] = useState(() => getInitialValues(task));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState("");

  const change = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setValidationError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const title = typeof values.title === "string" ? values.title.trim() : "";
    const description = typeof values.description === "string" ? values.description.trim() : "";
    if (title.length < 2 || title.length > 200) {
      setValidationError("Title must be 2 to 200 characters after trimming.");
      return;
    }
    if (description.length < 1 || description.length > 5000) {
      setValidationError("Description must be 1 to 5000 characters after trimming.");
      return;
    }
    if (values.storyPoints !== "") {
      const points = Number(values.storyPoints);
      if (!Number.isInteger(points) || points < 1 || points > 21) {
        setValidationError("Story points must be a whole number from 1 to 21, or left blank.");
        return;
      }
    }

    const payload = isEditing ? updatePayload(values, task) : createPayload(values);
    if (isEditing && Object.keys(payload).length === 0) {
      setValidationError("There are no changes to save.");
      return;
    }

    setIsSaving(true);
    try {
      const response = isEditing
        ? await updateTaskRequest(workspaceId, projectId, task.id, payload)
        : await createTaskRequest(workspaceId, projectId, payload);
      onSaved(response.data, isEditing ? "Task updated." : "Task created.");
    } catch (requestError) {
      setError(getTaskErrorMessage(requestError, "Unable to save this task."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="task-panel task-form-panel" aria-labelledby="task-form-title">
      <header className="task-panel__header">
        <div>
          <p className="task-eyebrow">{isEditing ? "EDIT TASK" : "NEW TASK"}</p>
          <h2 id="task-form-title">{isEditing ? task.taskNumber : "Create task"}</h2>
        </div>
        <button className="task-icon-button" type="button" onClick={onCancel} aria-label="Close task form">
          <CloseIcon size={16} />
        </button>
      </header>
      <form className="task-form" onSubmit={handleSubmit}>
        <label className="task-field">
          <span>Title <b aria-hidden="true">*</b></span>
          <input autoFocus required minLength={2} maxLength={200} value={values.title} onChange={change("title")} placeholder="Short summary of the task" />
        </label>
        <label className="task-field">
          <span>Description <b aria-hidden="true">*</b></span>
          <textarea required minLength={1} maxLength={5000} rows={5} value={values.description} onChange={change("description")} placeholder="Details, context, or acceptance requirements" />
        </label>
        <div className="task-form__row">
          <label className="task-field">
            <span>Type <b aria-hidden="true">*</b></span>
            <select required value={values.type} onChange={change("type")}>
              {TASK_TYPES.map((type) => (
                <option key={type} value={type}>{formatTaskLabel(type)}</option>
              ))}
            </select>
          </label>
          <label className="task-field">
            <span>Priority <b aria-hidden="true">*</b></span>
            <select required value={values.priority} onChange={change("priority")}>
              {TASK_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{formatTaskLabel(priority)}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="task-form__row">
          <label className="task-field">
            <span>Story points</span>
            <input type="number" min={1} max={21} step={1} value={values.storyPoints} onChange={change("storyPoints")} placeholder="e.g. 3, 5, 8" />
          </label>
          <label className="task-field">
            <span>Due date</span>
            <input type="date" value={values.dueDate} onChange={change("dueDate")} />
          </label>
        </div>
        {memberError && <p className="task-option-warning" role="status">Project members could not be loaded. The task can still be saved unassigned.</p>}
        <label className="task-field">
          <span>Requirement</span>
          <select value={values.requirementId} onChange={change("requirementId")}>
            <option value="">No requirement</option>
            {requirements.map((requirement) => (
              <option key={requirement.id} value={requirement.id}>{requirement.title}</option>
            ))}
          </select>
        </label>
        {requirementError && <p className="task-option-warning" role="status">Requirements could not be loaded. You can leave this task unlinked.</p>}
        {!isEditing && (
          <label className="task-field">
            <span>Assignee</span>
            <select value={values.assigneeId} onChange={change("assigneeId")}>
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {[member.firstName, member.lastName].filter(Boolean).join(" ") || member.email} · {formatTaskLabel(member.role)}
                </option>
              ))}
            </select>
          </label>
        )}
        {(validationError || error) && <p className="task-form__error" role="alert">{validationError || error}</p>}
        <div className="task-form__actions">
          <button className="task-button task-button--primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create task"}
          </button>
          <button className="task-button task-button--quiet" type="button" onClick={onCancel} disabled={isSaving}>Cancel</button>
        </div>
      </form>
    </section>
  );
}