import { formatTaskLabel } from "../tasks/taskUtils";

export function RequirementSelector({ requirements, selectedRequirementId, onSelect }) {
  return (
    <section className="ai-panel">
      <header className="ai-panel__header">
        <div>
          <p className="ai-eyebrow">REQUIREMENT</p>
          <h2>Selected requirement</h2>
        </div>
      </header>
      {requirements.length === 0 ? (
        <p className="ai-empty-inline">No requirements available for AI planning.</p>
      ) : (
        <div className="ai-requirement-selector">
          {requirements.map((requirement) => (
            <button
              key={requirement.id}
              type="button"
              className={`ai-requirement-option${selectedRequirementId === requirement.id ? " is-selected" : ""}`}
              onClick={() => onSelect(requirement.id)}
            >
              <span className="ai-requirement-option__title">{requirement.title}</span>
              <span className="ai-requirement-option__meta">
                <span className="ai-chip">{formatTaskLabel(requirement.status)}</span>
                <span className="ai-chip">{formatTaskLabel(requirement.priority)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
