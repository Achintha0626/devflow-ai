import { useState } from "react";
import { reviewSuggestionRequest } from "../../api/aiPlannerApi";
import { AI_SUGGESTION_PRIORITIES, AI_SUGGESTION_TYPES, getAiPlannerErrorMessage, parseSuggestionFormValues, sortSuggestionCriteria } from "./aiPlannerUtils";
import { formatTaskLabel } from "../tasks/taskUtils";

export function SuggestionReviewForm({
  workspaceId,
  projectId,
  requirementId,
  suggestion,
  onUpdated,
  pending,
}) {
  const [values, setValues] = useState(() => parseSuggestionFormValues(suggestion));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateField = (field) => (event) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setError("");
  };

  const updateCriteria = (index, value) => {
    setValues((current) => {
      const criteria = [...(current.acceptanceCriteria || [""])];
      criteria[index] = value;
      return { ...current, acceptanceCriteria: criteria };
    });
    setError("");
  };

  const addCriteria = () => {
    setValues((current) => ({
      ...current,
      acceptanceCriteria: [...(current.acceptanceCriteria || [""]), ""],
    }));
  };

  const removeCriteria = (index) => {
    setValues((current) => {
      const next = [...(current.acceptanceCriteria || [""])];
      next.splice(index, 1);
      return { ...current, acceptanceCriteria: next.length ? next : [""] };
    });
  };

  const handleSave = async () => {
    const payload = {};
    const title = values.title.trim();
    const description = values.description.trim();
    const criteria = sortSuggestionCriteria(values.acceptanceCriteria);
    const hasEdits =
      title !== suggestion.title ||
      description !== suggestion.description ||
      values.type !== suggestion.type ||
      values.priority !== suggestion.priority ||
      values.complexity !== suggestion.complexity ||
      Number(values.estimatedStoryPoints) !== Number(suggestion.estimatedStoryPoints) ||
      JSON.stringify(criteria) !== JSON.stringify(sortSuggestionCriteria(suggestion.acceptanceCriteria));

    if (!hasEdits) {
      setError("No changes were made to this suggestion.");
      return;
    }

    if (title.length < 2 || title.length > 200) {
      setError("Title must be 2 to 200 characters.");
      return;
    }
    if (description.length < 1 || description.length > 2000) {
      setError("Description must be 1 to 2000 characters.");
      return;
    }
    if (!values.complexity || values.complexity.trim().length > 50) {
      setError("Complexity must be 1 to 50 characters.");
      return;
    }
    if (criteria.length < 1 || criteria.length > 10) {
      setError("Acceptance criteria must contain between 1 and 10 items.");
      return;
    }
    if (!AI_SUGGESTION_TYPES.includes(values.type)) {
      setError("Select a valid task type.");
      return;
    }
    if (!AI_SUGGESTION_PRIORITIES.includes(values.priority)) {
      setError("Select a valid priority.");
      return;
    }

    payload.title = title;
    payload.description = description;
    payload.type = values.type;
    payload.priority = values.priority;
    payload.complexity = values.complexity.trim();
    payload.estimatedStoryPoints = Number(values.estimatedStoryPoints);
    payload.acceptanceCriteria = criteria;
    payload.status = "EDITED";

    setIsSaving(true);
    setError("");

    try {
      const response = await reviewSuggestionRequest(
        workspaceId,
        projectId,
        requirementId,
        suggestion.id,
        payload
      );
      onUpdated(response.data, "Suggestion reviewed and updated.");
    } catch (requestError) {
      setError(getAiPlannerErrorMessage(requestError, "Unable to update this suggestion."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="ai-suggestion-edit">
      <div className="ai-suggestion-edit__grid">
        <label className="ai-field">
          <span>Title</span>
          <input value={values.title} onChange={updateField("title")} />
        </label>
        <label className="ai-field">
          <span>Type</span>
          <select value={values.type} onChange={updateField("type")}>
            {AI_SUGGESTION_TYPES.map((type) => (
              <option key={type} value={type}>{formatTaskLabel(type)}</option>
            ))}
          </select>
        </label>
        <label className="ai-field">
          <span>Priority</span>
          <select value={values.priority} onChange={updateField("priority")}>
            {AI_SUGGESTION_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{formatTaskLabel(priority)}</option>
            ))}
          </select>
        </label>
        <label className="ai-field">
          <span>Complexity</span>
          <input value={values.complexity} onChange={updateField("complexity")} />
        </label>
        <label className="ai-field">
          <span>Story points</span>
          <select value={values.estimatedStoryPoints} onChange={updateField("estimatedStoryPoints")}>
            {[1, 2, 3, 5, 8, 13, 21].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="ai-field">
        <span>Description</span>
        <textarea rows={6} value={values.description} onChange={updateField("description")} />
      </label>
      <div className="ai-field">
        <span>Acceptance criteria</span>
        <div className="ai-criteria-editor">
          {(values.acceptanceCriteria || [""]).map((criterion, index) => (
            <div key={`${suggestion.id}-criteria-${index}`} className="ai-criteria-row">
              <input
                value={criterion}
                onChange={(event) => updateCriteria(index, event.target.value)}
              />
              <button type="button" className="ai-small-button ai-small-button--quiet" onClick={() => removeCriteria(index)} disabled={(values.acceptanceCriteria || []).length <= 1}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="ai-small-button ai-small-button--quiet" onClick={addCriteria}>
            Add criterion
          </button>
        </div>
      </div>
      {error && <p className="ai-error-inline" role="alert">{error}</p>}
      <div className="ai-form-actions">
        <button type="button" className="ai-button ai-button--primary" onClick={handleSave} disabled={pending || isSaving}>
          {isSaving ? "Saving…" : "Save review"}
        </button>
      </div>
    </div>
  );
}
