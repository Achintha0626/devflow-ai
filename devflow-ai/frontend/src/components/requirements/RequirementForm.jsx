import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createRequirementRequest,
  updateRequirementRequest,
} from "../../api/requirementApi";
import {
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_STATUSES,
  formatTaskLabel,
  getRequirementErrorMessage,
} from "./requirementUtils";
import { CloseIcon } from "../icons";

function getValues(requirement) {
  return {
    title: requirement?.title || "",
    description: requirement?.description || "",
    priority: requirement?.priority || "MEDIUM",
    status: requirement?.status || "DRAFT",
  };
}

function getChangedFields(values, requirement) {
  const payload = {};
  const title = values.title.trim();
  const description = values.description.trim();
  if (title !== requirement.title) payload.title = title;
  if (description !== requirement.description) payload.description = description;
  if (values.priority !== requirement.priority) payload.priority = values.priority;
  if (values.status !== requirement.status) payload.status = values.status;
  return payload;
}

export function RequirementForm({ requirement = null, onCancel, onSaved }) {
  const { workspaceId, projectId } = useParams();
  const isEditing = Boolean(requirement);
  const [prevRequirementId, setPrevRequirementId] = useState(requirement?.id);
  const [values, setValues] = useState(() => getValues(requirement));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (requirement?.id !== prevRequirementId) {
    setPrevRequirementId(requirement?.id);
    setValues(getValues(requirement));
  }

  const initialValues = getValues(requirement);

  const isDirty =
    values.title !== initialValues.title ||
    values.description !== initialValues.description ||
    values.priority !== initialValues.priority ||
    values.status !== initialValues.status;

  const handleCancel = useCallback(() => {
    if (isDirty) {
      if (window.confirm("You have unsaved changes. Discard them?")) {
        onCancel();
      }
    } else {
      onCancel();
    }
  }, [isDirty, onCancel]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCancel]);

  const updateField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const title = values.title.trim();
    const description = values.description.trim();
    if (title.length < 2 || title.length > 200) {
      setError("Title must be 2 to 200 characters after trimming.");
      return;
    }
    if (description.length < 1 || description.length > 5000) {
      setError("Description must be 1 to 5000 characters after trimming.");
      return;
    }

    const payload = isEditing
      ? getChangedFields(values, requirement)
      : {
        title,
        description,
        priority: values.priority,
        status: values.status,
      };

    if (isEditing && Object.keys(payload).length === 0) {
      setError("There are no changes to save.");
      return;
    }

    setError("");
    setIsSaving(true);
    try {
      const response = isEditing
        ? await updateRequirementRequest(workspaceId, projectId, requirement.id, payload)
        : await createRequirementRequest(workspaceId, projectId, payload);
      onSaved(response.data, isEditing ? "Requirement updated." : "Requirement created.");
    } catch (requestError) {
      setError(getRequirementErrorMessage(requestError, "Unable to save this requirement."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="requirement-form-wrapper">
      <header className="requirement-panel__header">
        <div>
          <p className="requirement-eyebrow">{isEditing ? "EDIT REQUIREMENT" : "NEW REQUIREMENT"}</p>
          <h2 id="requirement-form-heading">{isEditing ? requirement.title : "Create requirement"}</h2>
        </div>
        <button
          className="requirement-icon-button"
          type="button"
          onClick={handleCancel}
          aria-label="Close requirement form"
        >
          <CloseIcon size={16} />
        </button>
      </header>
      <form className="requirement-form" onSubmit={handleSubmit}>
        <label className="requirement-field">
          <span>Title <b aria-hidden="true">*</b></span>
          <input
            autoFocus
            required
            minLength={2}
            maxLength={200}
            value={values.title}
            onChange={updateField("title")}
            placeholder="e.g. User Authentication & Session Security"
          />
        </label>
        <label className="requirement-field">
          <span>Description <b aria-hidden="true">*</b></span>
          <textarea
            required
            minLength={1}
            maxLength={5000}
            rows={7}
            value={values.description}
            onChange={updateField("description")}
            placeholder="Describe the goal, business requirement, and expected acceptance scope…"
          />
        </label>
        <div className="requirement-form__row">
          <label className="requirement-field">
            <span>Priority</span>
            <select value={values.priority} onChange={updateField("priority")}>
              {REQUIREMENT_PRIORITIES.map((priority) => (
                <option key={priority} value={priority}>{formatTaskLabel(priority)}</option>
              ))}
            </select>
          </label>
          <label className="requirement-field">
            <span>Status</span>
            <select value={values.status} onChange={updateField("status")}>
              {REQUIREMENT_STATUSES.map((status) => (
                <option key={status} value={status}>{formatTaskLabel(status)}</option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="requirement-form__error" role="alert">{error}</p>}
        <div className="requirement-form__actions">
          <button className="requirement-button requirement-button--primary" type="submit" disabled={isSaving}>
            {isSaving ? "Saving…" : isEditing ? "Save changes" : "Create requirement"}
          </button>
          <button className="requirement-button requirement-button--quiet" type="button" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}