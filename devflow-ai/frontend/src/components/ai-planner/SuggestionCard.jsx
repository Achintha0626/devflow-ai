import { useState } from "react";
import { convertSuggestionToTaskRequest, reviewSuggestionRequest } from "../../api/aiPlannerApi";
import { SuggestionReviewForm } from "./SuggestionReviewForm";
import { formatSuggestionStatus, getAiPlannerErrorMessage, isConvertibleStatus } from "./aiPlannerUtils";
import { formatTaskLabel } from "../tasks/taskUtils";
import {
  AIPlannerIcon,
  CheckIcon,
  CloseIcon,
  EditIcon,
  ArrowRightIcon,
  AlertCircleIcon,
  ChevronDownIcon,
} from "../icons";

function getSuggestionStatusLabel(status) {
  if (!status) return "Pending review";
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
  const [criteriaExpanded, setCriteriaExpanded] = useState(false);
  const [error, setError] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [convertedTask, setConvertedTask] = useState(null);

  const isConverted = suggestion.status === "CONVERTED";
  const canConvert = isConvertibleStatus(suggestion.status) && !isConverted;
  const statusSlug = (suggestion.status || "pending").toLowerCase();
  const criteria = suggestion.acceptanceCriteria || [];

  const setApprovalStatus = async (status) => {
    if (pendingReviewId || pendingConvertId) return;
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
    if (isConverted || pendingConvertId || pendingReviewId) return;
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
      onConverted(taskPayload, "Suggestion successfully converted to project task.");
    } catch (requestError) {
      setError(getAiPlannerErrorMessage(requestError, "Unable to convert this suggestion to a task."));
    } finally {
      setPendingConvertId("");
    }
  };

  return (
    <article className={`ai-suggestion-card ai-suggestion-card--${statusSlug}`}>
      <header className="ai-suggestion-card__header">
        <div className="ai-suggestion-card__title-area">
          <div className="ai-suggestion-card__tag">
            <AIPlannerIcon size={13} />
            <span>AI SUGGESTION</span>
          </div>
          <h3>{suggestion.title}</h3>
        </div>
        <span className={`ai-chip ai-chip--status ai-chip--status-${statusSlug}`}>
          {getSuggestionStatusLabel(suggestion.status)}
        </span>
      </header>

      <div className="ai-suggestion-card__meta">
        <span className="ai-meta-pill ai-meta-pill--type">
          {formatTaskLabel(suggestion.type)}
        </span>
        <span className="ai-meta-pill ai-meta-pill--priority">
          {formatTaskLabel(suggestion.priority)}
        </span>
        <span className="ai-meta-pill ai-meta-pill--complexity">
          Complexity: {suggestion.complexity}
        </span>
        <span className="ai-meta-pill ai-meta-pill--points">
          {suggestion.estimatedStoryPoints} pts
        </span>
      </div>

      <p className="ai-suggestion-card__description">{suggestion.description}</p>

      {criteria.length > 0 && (
        <div className="ai-suggestion-card__criteria-box">
          <button
            type="button"
            className="ai-criteria-toggle-btn"
            onClick={() => setCriteriaExpanded((prev) => !prev)}
            aria-expanded={criteriaExpanded}
          >
            <span>Acceptance criteria ({criteria.length})</span>
            <ChevronDownIcon
              size={14}
              className={`ai-criteria-arrow${criteriaExpanded ? " is-open" : ""}`}
            />
          </button>

          {criteriaExpanded && (
            <ul className="ai-criteria-expanded-list">
              {criteria.map((criterion, index) => (
                <li key={`${suggestion.id}-${index}`} className="ai-criteria-expanded-item">
                  <CheckIcon size={12} className="ai-criteria-check-icon" />
                  <span>{criterion}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="ai-suggestion-card__actions">
        {!isConverted && (
          <>
            <button
              type="button"
              className="ai-button ai-button--approve"
              onClick={() => setApprovalStatus("APPROVED")}
              disabled={Boolean(pendingReviewId || pendingConvertId || suggestion.status === "APPROVED")}
            >
              <CheckIcon size={14} />
              <span>{pendingReviewId === suggestion.id ? "Approving…" : "Approve"}</span>
            </button>
            <button
              type="button"
              className="ai-button ai-button--reject"
              onClick={() => setApprovalStatus("REJECTED")}
              disabled={Boolean(pendingReviewId || pendingConvertId || suggestion.status === "REJECTED")}
            >
              <CloseIcon size={14} />
              <span>{pendingReviewId === suggestion.id ? "Rejecting…" : "Reject"}</span>
            </button>
          </>
        )}
        <button
          type="button"
          className="ai-button ai-button--edit"
          onClick={() => setIsEditing((current) => !current)}
          disabled={Boolean(pendingReviewId || pendingConvertId)}
        >
          <EditIcon size={14} />
          <span>{isEditing ? "Hide editor" : "Edit suggestion"}</span>
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
          <div className="ai-conversion-box__header">
            <h4>Promote to Project Task</h4>
            <p>Convert this verified AI suggestion into an active backlog task.</p>
          </div>
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
              disabled={Boolean(pendingConvertId || pendingReviewId || isConverted)}
            >
              <ArrowRightIcon size={14} />
              <span>{pendingConvertId === suggestion.id ? "Converting…" : "Convert to task"}</span>
            </button>
          </div>
        </div>
      )}

      {(isConverted || convertedTask) && (
        <div className="ai-success-box">
          <CheckIcon size={15} />
          <span>
            Task created and added to backlog
            {convertedTask?.taskNumber ? ` (${convertedTask.taskNumber})` : ""}
          </span>
        </div>
      )}

      {error && (
        <p className="ai-error-inline" role="alert">
          <AlertCircleIcon size={14} />
          <span>{error}</span>
        </p>
      )}
    </article>
  );
}
