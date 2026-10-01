import { useState } from "react";
import {
  formatCreatorName,
  formatTaskDate,
  formatTaskLabel,
} from "./requirementUtils";

export function RequirementDetails({ requirement, pendingAction, onEdit, onDelete }) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  return (
    <section className="requirement-panel requirement-details" aria-labelledby="requirement-details-heading">
      <header className="requirement-details__header">
        <div>
          <p className="requirement-eyebrow">REQUIREMENT DETAILS</p>
          <h2 id="requirement-details-heading">{requirement.title}</h2>
          <div className="requirement-list-item__labels">
            <span className="requirement-label">{formatTaskLabel(requirement.status)}</span>
            <span className="requirement-label">{formatTaskLabel(requirement.priority)}</span>
          </div>
        </div>
        <div className="requirement-details__actions">
          <button className="requirement-button requirement-button--quiet" type="button" onClick={() => onEdit(requirement)} disabled={Boolean(pendingAction)}>
            Edit
          </button>
          {!isConfirmingDelete && (
            <button className="requirement-button requirement-button--danger-quiet" type="button" onClick={() => setIsConfirmingDelete(true)} disabled={Boolean(pendingAction)}>
              Delete
            </button>
          )}
        </div>
      </header>

      <section className="requirement-details__description">
        <h3>Description</h3>
        <p>{requirement.description}</p>
      </section>

      <dl className="requirement-metadata">
        <div>
          <dt>Created by</dt>
          <dd>{formatCreatorName(requirement.createdBy)}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd><time dateTime={requirement.createdAt}>{formatTaskDate(requirement.createdAt, { dateStyle: "medium", timeStyle: "short" })}</time></dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd><time dateTime={requirement.updatedAt}>{formatTaskDate(requirement.updatedAt, { dateStyle: "medium", timeStyle: "short" })}</time></dd>
        </div>
      </dl>

      {isConfirmingDelete && (
        <div className="requirement-delete-confirmation" role="alertdialog" aria-labelledby="requirement-delete-heading">
          <h3 id="requirement-delete-heading">Delete this requirement?</h3>
          <p><strong>{requirement.title}</strong> will be deleted. This action cannot be undone.</p>
          <div className="requirement-form__actions">
            <button
              className="requirement-button requirement-button--danger"
              type="button"
              onClick={() => onDelete(requirement)}
              disabled={pendingAction === "delete"}
            >
              {pendingAction === "delete" ? "Deleting…" : "Delete requirement"}
            </button>
            <button className="requirement-button requirement-button--quiet" type="button" onClick={() => setIsConfirmingDelete(false)} disabled={pendingAction === "delete"}>
              Keep requirement
            </button>
          </div>
        </div>
      )}
    </section>
  );
}