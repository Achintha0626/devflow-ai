import { useState } from "react";
import { useParams } from "react-router-dom";
import { createSprintRequest, updateSprintRequest } from "../../api/sprintApi";
import { getSprintDates, getSprintErrorMessage, toTaskDate } from "./sprintUtils";
import { CloseIcon } from "../icons";

function getInitialValues(sprint) {
  return {
    name: sprint?.name || "",
    goal: sprint?.goal || "",
    ...getSprintDates(sprint),
  };
}

function getUpdatePayload(values, sprint) {
  const payload = {};
  const name = values.name.trim();
  const goal = values.goal.trim() || null;

  if (name !== sprint.name) payload.name = name;
  if (goal !== (sprint.goal || null)) payload.goal = goal;
  if (values.startDate !== getSprintDates(sprint).startDate) {
    payload.startDate = toTaskDate(values.startDate);
  }
  if (values.endDate !== getSprintDates(sprint).endDate) {
    payload.endDate = toTaskDate(values.endDate);
  }
  return payload;
}

export function SprintForm({ sprint = null, onCancel, onSaved }) {
  const { workspaceId, projectId } = useParams();
  const isEditing = Boolean(sprint);
  const [values, setValues] = useState(() => getInitialValues(sprint));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const name = values.name.trim();
    const goal = values.goal.trim();

    if (name.length < 2 || name.length > 100) {
      setError("Sprint name must be 2 to 100 characters after trimming.");
      return;
    }
    if (goal.length > 1000) {
      setError("Sprint goal cannot exceed 1000 characters.");
      return;
    }
    if (values.startDate && values.endDate && values.endDate <= values.startDate) {
      setError("End date must be after start date.");
      return;
    }

    const payload = isEditing
      ? getUpdatePayload(values, sprint)
      : {
        name,
        goal: goal || null,
        startDate: toTaskDate(values.startDate),
        endDate: toTaskDate(values.endDate),
      };

    if (isEditing && Object.keys(payload).length === 0) {
      setError("There are no changes to save.");
      return;
    }

    setIsSaving(true);
    try {
      const response = isEditing
        ? await updateSprintRequest(workspaceId, projectId, sprint.id, payload)
        : await createSprintRequest(workspaceId, projectId, payload);
      onSaved(response.data, isEditing ? "Sprint updated." : "Sprint created.");
    } catch (requestError) {
      setError(getSprintErrorMessage(requestError, "Unable to save this sprint."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="sprint-panel sprint-form-panel" aria-labelledby="sprint-form-heading">
      <header className="sprint-panel__header">
        <div>
          <p className="sprint-eyebrow">{isEditing ? "EDIT SPRINT" : "NEW SPRINT"}</p>
          <h2 id="sprint-form-heading">{isEditing ? sprint.name : "Create sprint"}</h2>
        </div>
        <button className="sprint-icon-button" type="button" onClick={onCancel} aria-label="Close sprint form">
          <CloseIcon size={16} />
        </button>
      </header>
      <form className="sprint-form" onSubmit={handleSubmit}>
        <label className="sprint-field">
          <span>Sprint Name <b aria-hidden="true">*</b></span>
          <input required minLength={2} maxLength={100} value={values.name} onChange={updateField("name")} placeholder="e.g. Sprint 14 — Auth & Settings" />
        </label>
        <label className="sprint-field">
          <span>Sprint Goal</span>
          <textarea rows={3} maxLength={1000} value={values.goal} onChange={updateField("goal")} placeholder="What is the primary deliverable or target for this sprint?" />
        </label>
        <div className="sprint-form__dates">
          <label className="sprint-field">
            <span>Start date</span>
            <input type="date" value={values.startDate} onChange={updateField("startDate")} />
          </label>
          <label className="sprint-field">
            <span>End date</span>
            <input type="date" value={values.endDate} onChange={updateField("endDate")} />
          </label>
        </div>
        {error && <p className="sprint-form__error" role="alert">{error}</p>}
        <div className="sprint-form__actions">
          <button className="sprint-button sprint-button--primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create sprint"}
          </button>
          <button className="sprint-button sprint-button--quiet" type="button" onClick={onCancel} disabled={isSaving}>Cancel</button>
        </div>
      </form>
    </section>
  );
}