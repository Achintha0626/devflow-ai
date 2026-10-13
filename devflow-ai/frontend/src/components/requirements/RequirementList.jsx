import {
  formatCreatorName,
  formatTaskDate,
  formatTaskLabel,
} from "./requirementUtils";
import { UserIcon } from "../icons";

export function RequirementList({ requirements, selectedRequirementId, onSelect }) {
  return (
    <ul className="requirement-list">
      {requirements.map((requirement) => {
        const isSelected = selectedRequirementId === requirement.id;
        const statusSlug = (requirement.status || "").toLowerCase();
        const prioritySlug = (requirement.priority || "").toLowerCase();

        return (
          <li key={requirement.id}>
            <button
              className={`requirement-list-card${isSelected ? " is-selected" : ""}`}
              type="button"
              aria-selected={isSelected}
              aria-controls="requirement-details-panel"
              onClick={() => onSelect(requirement.id)}
            >
              <div className="requirement-list-card__header">
                <span className="requirement-list-card__title">{requirement.title}</span>
                <span className={`requirement-badge requirement-badge--${statusSlug}`}>
                  {formatTaskLabel(requirement.status)}
                </span>
              </div>

              {requirement.description && (
                <p className="requirement-list-card__description">
                  {requirement.description}
                </p>
              )}

              <div className="requirement-list-card__footer">
                <span className={`requirement-priority requirement-priority--${prioritySlug}`}>
                  {formatTaskLabel(requirement.priority)}
                </span>
                <div className="requirement-list-card__meta">
                  <span
                    className="requirement-list-card__creator"
                    title={formatCreatorName(requirement.createdBy)}
                  >
                    <UserIcon size={11} />
                    <span>{formatCreatorName(requirement.createdBy)}</span>
                  </span>
                  <span aria-hidden="true" className="requirement-meta-dot">·</span>
                  <time dateTime={requirement.createdAt}>
                    {formatTaskDate(requirement.createdAt)}
                  </time>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}