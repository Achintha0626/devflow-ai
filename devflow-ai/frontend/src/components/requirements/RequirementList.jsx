import {
  formatCreatorName,
  formatTaskDate,
  formatTaskLabel,
} from "./requirementUtils";

export function RequirementList({ requirements, selectedRequirementId, onSelect }) {
  return (
    <ul className="requirement-list">
      {requirements.map((requirement) => (
        <li key={requirement.id}>
          <button
            className={`requirement-list-item${selectedRequirementId === requirement.id ? " is-selected" : ""}`}
            type="button"
            aria-pressed={selectedRequirementId === requirement.id}
            onClick={() => onSelect(requirement.id)}
          >
            <span className="requirement-list-item__title">{requirement.title}</span>
            <span className="requirement-list-item__labels">
              <span className="requirement-label">{formatTaskLabel(requirement.status)}</span>
              <span className="requirement-label">{formatTaskLabel(requirement.priority)}</span>
            </span>
            <span className="requirement-list-item__description">{requirement.description}</span>
            <span className="requirement-list-item__meta">
              <span>{formatCreatorName(requirement.createdBy)}</span>
              <time dateTime={requirement.createdAt}>{formatTaskDate(requirement.createdAt)}</time>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}