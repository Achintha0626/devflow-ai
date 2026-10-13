import { formatTaskLabel } from "../tasks/taskUtils";
import { RequirementsIcon, CheckIcon } from "../icons";

export function RequirementSelector({
  requirements,
  selectedRequirementId,
  onSelect,
}) {
  if (requirements.length === 0) {
    return (
      <div className="ai-panel ai-requirement-selector-empty">
        <p>No requirements available in this project.</p>
      </div>
    );
  }

  return (
    <section className="ai-panel ai-requirement-selector-panel" aria-labelledby="ai-requirement-selector-heading">
      <header className="ai-panel__header">
        <div>
          <p className="ai-eyebrow">STEP 1: SELECT REQUIREMENT</p>
          <h2 id="ai-requirement-selector-heading">Choose requirement to plan</h2>
        </div>
        <span className="ai-count-pill">
          {requirements.length} {requirements.length === 1 ? "requirement" : "requirements"}
        </span>
      </header>

      <div className="ai-requirement-select-field">
        <label htmlFor="ai-requirement-dropdown" className="ai-field-label">
          Switch requirement:
        </label>
        <div className="ai-select-control">
          <select
            id="ai-requirement-dropdown"
            className="ai-dropdown-select"
            value={selectedRequirementId || ""}
            onChange={(event) => onSelect(event.target.value)}
          >
            {requirements.map((req) => (
              <option key={req.id} value={req.id}>
                {req.title} · {formatTaskLabel(req.status)} · {formatTaskLabel(req.priority)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="ai-requirement-cards" role="radiogroup" aria-label="Available requirements">
        {requirements.map((req) => {
          const isSelected = selectedRequirementId === req.id;
          const statusSlug = (req.status || "").toLowerCase();
          const prioritySlug = (req.priority || "").toLowerCase();

          return (
            <button
              key={req.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              className={`ai-requirement-card${isSelected ? " is-selected" : ""}`}
              onClick={() => onSelect(req.id)}
            >
              <div className="ai-requirement-card__header">
                <span className="ai-requirement-card__icon">
                  {isSelected ? <CheckIcon size={14} /> : <RequirementsIcon size={14} />}
                </span>
                <span className="ai-requirement-card__title" title={req.title}>
                  {req.title}
                </span>
              </div>
              <div className="ai-requirement-card__meta">
                <span className={`ai-chip ai-chip--${statusSlug}`}>
                  {formatTaskLabel(req.status)}
                </span>
                <span className={`ai-chip ai-chip--priority-${prioritySlug}`}>
                  {formatTaskLabel(req.priority)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
