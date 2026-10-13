import { useState } from "react";
import { Link } from "react-router-dom";
import {
  formatCreatorName,
  formatTaskDate,
  formatTaskLabel,
} from "./requirementUtils";
import { EditIcon, TrashIcon, AIPlannerIcon, UserIcon } from "../icons";

export function RequirementDetails({
  requirement,
  workspaceId,
  projectId,
  pendingAction,
  onEdit,
  onDelete,
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const statusSlug = (requirement.status || "").toLowerCase();
  const prioritySlug = (requirement.priority || "").toLowerCase();

  return (
    <section
      id="requirement-details-panel"
      className="requirement-panel requirement-details"
      aria-labelledby="requirement-details-heading"
    >
      <header className="requirement-details__header">
        <div className="requirement-details__title-group">
          <p className="requirement-eyebrow">REQUIREMENT SPECIFICATION</p>
          <h2 id="requirement-details-heading">{requirement.title}</h2>
          <div className="requirement-details__badges">
            <span className={`requirement-badge requirement-badge--${statusSlug}`}>
              {formatTaskLabel(requirement.status)}
            </span>
            <span className={`requirement-priority requirement-priority--${prioritySlug}`}>
              {formatTaskLabel(requirement.priority)}
            </span>
          </div>
        </div>

        <div className="requirement-details__actions">
          {workspaceId && projectId && (
            <Link
              className="requirement-button requirement-button--ai"
              to={`/app/workspaces/${workspaceId}/projects/${projectId}/ai-planner`}
              title="Open AI Planner to decompose requirement into engineering tasks"
            >
              <AIPlannerIcon size={14} />
              <span>Plan with AI</span>
            </Link>
          )}

          <button
            className="requirement-button requirement-button--quiet"
            type="button"
            onClick={() => onEdit(requirement)}
            disabled={Boolean(pendingAction)}
          >
            <EditIcon size={14} />
            <span>Edit</span>
          </button>

          {!isConfirmingDelete && (
            <button
              className="requirement-button requirement-button--danger-quiet"
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              disabled={Boolean(pendingAction)}
            >
              <TrashIcon size={14} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </header>

      <section className="requirement-details__description">
        <h3>Description & Acceptance Scope</h3>
        <div className="requirement-details__description-body">
          <p>{requirement.description}</p>
        </div>
      </section>

      <dl className="requirement-metadata">
        <div>
          <dt>Status</dt>
          <dd>{formatTaskLabel(requirement.status)}</dd>
        </div>
        <div>
          <dt>Priority</dt>
          <dd>{formatTaskLabel(requirement.priority)}</dd>
        </div>
        <div>
          <dt>Created by</dt>
          <dd className="requirement-metadata__creator">
            <UserIcon size={12} />
            <span>{formatCreatorName(requirement.createdBy)}</span>
          </dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>
            <time dateTime={requirement.createdAt}>
              {formatTaskDate(requirement.createdAt, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd>
            <time dateTime={requirement.updatedAt}>
              {formatTaskDate(requirement.updatedAt, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
          </dd>
        </div>
      </dl>

      {isConfirmingDelete && (
        <div
          className="requirement-delete-confirmation"
          role="alertdialog"
          aria-labelledby="requirement-delete-heading"
        >
          <h3 id="requirement-delete-heading">Delete {requirement.title}?</h3>
          <p>
            This requirement will be permanently deleted. This action cannot be undone.
          </p>
          <div className="requirement-form__actions">
            <button
              className="requirement-button requirement-button--danger"
              type="button"
              onClick={() => onDelete(requirement)}
              disabled={pendingAction === "delete"}
            >
              {pendingAction === "delete" ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              className="requirement-button requirement-button--quiet"
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              disabled={pendingAction === "delete"}
            >
              Keep requirement
            </button>
          </div>
        </div>
      )}
    </section>
  );
}