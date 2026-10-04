import { useState } from "react";
import { convertSuggestionToTaskRequest, reviewSuggestionRequest } from "../../api/aiPlannerApi";
import { SuggestionReviewForm } from "./SuggestionReviewForm";
import { formatSuggestionStatus, getAiPlannerErrorMessage, isConvertibleStatus } from "./aiPlannerUtils";
import { formatTaskLabel } from "../tasks/taskUtils";

function getSuggestionStatusLabel(status) {
  if (!status) return "Waiting for review";
  return formatSuggestionStatus(status);
}

export function SuggestionCard({
  workspaceId,
  projectId,
  requirementId,
  suggestion,
  members,
  onReview,
  onConverted,
  pendingReviewId,
  setPendingReviewId,
  pendingConvertId,
  setPendingConvertId,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [convertedTask, setConvertedTask] = useState(null);
  const canConvert = isConvertibleStatus(suggestion.status);

  const setApprovalStatus = async (status) => {
    setError("");
    setPendingReviewId(suggestion.id);
    try {
      const response = await reviewSuggestionRequest(
        workspaceId,
        projectId,
        requirementId,
        suggestion.id,
        { status }
      );
      onReview(response.data, `Suggestion marked as ${status.toLowerCase()}.`);
    } catch (requestError) {
      setError(getAiPlannerErrorMessage(requestError, "Unable to update the suggestion."));
    } finally {
      setPendingReviewId("");
    }
  };

  const handleConvert = async () => {
    setError("");
    setPendingConvertId(suggestion.id);
    try {
      const response = await convertSuggestionToTaskRequest(
        workspaceId,
        projectId,
        requirementId,
        suggestion.id,
        {
          ...(assigneeId ? { assigneeId } : {}),
          ...(dueDate ? { dueDate: new Date(`${dueDate}T00:00:00.000Z`).toISOString() } : {}),
        }
      );
      const taskPayload = response.data?.data || response.data || null;
      setConvertedTask(taskPayload);
      onConverted(taskPayload, "Suggestion converted to a task.");
    } catch (requestError) {
      setError(getAiPlannerErrorMessage(requestError, "Unable to convert this suggestion to a task."));
    } finally {
      setPendingConvertId("");
    }
  };

  return (
    <article className="ai-suggestion-card">
      <header className="ai-suggestion-card__header">
        <div>
          <p className="ai-eyebrow">AI SUGGESTION</p>
          <h3>{suggestion.title}</h3>
        </div>
        <span className="ai-chip ai-chip--status">{getSuggestionStatusLabel(suggestion.status)}</span>
      </header>

      <div className="ai-suggestion-card__meta">
        <span>{formatTaskLabel(suggestion.type)}</span>
        <span>{formatTaskLabel(suggestion.priority)}</span>
        <span>Complexity: {suggestion.complexity}</span>
        <span>{suggestion.estimatedStoryPoints} pts</span>
      </div>

      <p className="ai-suggestion-card__description">{suggestion.description}</p>

      <div className="ai-suggestion-card__criteria">
        <h4>Acceptance criteria</h4>
        <ul>
          {(suggestion.acceptanceCriteria || []).map((criterion) => (
            <li key={`${suggestion.id}-${criterion}`}>{criterion}</li>
          ))}
        </ul>
      </div>

      <div className="ai-suggestion-card__actions">
        <button type="button" className="ai-button ai-button--quiet" onClick={() => setApprovalStatus("APPROVED")} disabled={pendingReviewId === suggestion.id || !suggestion.id}>
          {pendingReviewId === suggestion.id ? "Approving…" : "Approve"}
        </button>
        <button type="button" className="ai-button ai-button--quiet" onClick={() => setApprovalStatus("REJECTED")} disabled={pendingReviewId === suggestion.id}>
          {pendingReviewId === suggestion.id ? "Rejecting…" : "Reject"}
        </button>
        <button type="button" className="ai-button ai-button--quiet" onClick={() => setIsEditing((current) => !current)}>
          {isEditing ? "Hide editor" : "Edit"}
        </button>
      </div>

      {isEditing && (
        <SuggestionReviewForm
          workspaceId={workspaceId}
          projectId={projectId}
          requirementId={requirementId}
          suggestion={suggestion}
          onUpdated={(updatedSuggestion, message) => {
            setIsEditing(false);
            onReview(updatedSuggestion, message);
          }}
          pending={pendingReviewId === suggestion.id}
        />
      )}

      {canConvert && (
        <div className="ai-conversion-box">
          <h4>Convert to task</h4>
          <div className="ai-conversion-box__controls">
            <label className="ai-field">
              <span>Assignee</span>
              <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
                <option value="">No assignee</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {[member.firstName, member.lastName].filter(Boolean).join(" ") || member.email}
                  </option>
                ))}
              </select>
            </label>
            <label className="ai-field">
              <span>Due date</span>
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>
          </div>
          <div className="ai-form-actions">
            <button
              type="button"
              className="ai-button ai-button--primary"
              onClick={handleConvert}
              disabled={pendingConvertId === suggestion.id}
            >
              {pendingConvertId === suggestion.id ? "Converting…" : "Convert to task"}
            </button>
          </div>
        </div>
      )}

      {convertedTask && (
        <div className="ai-success-box">
          <strong>Converted to task:</strong> {convertedTask.taskNumber || convertedTask.id}
        </div>
      )}
      {error && <p className="ai-error-inline" role="alert">{error}</p>}
    </article>
  );
}
