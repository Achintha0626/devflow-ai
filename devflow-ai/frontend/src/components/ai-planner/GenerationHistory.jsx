import { formatSuggestionDate, formatCreatorName } from "./aiPlannerUtils";
import { CheckIcon, CalendarIcon, UserIcon } from "../icons";

export function GenerationHistory({ generations, selectedGenerationId, onSelect }) {
  if (generations.length === 0) {
    return (
      <div className="ai-empty-history">
        <p>No previous generations recorded for this requirement. Click &quot;Generate AI suggestions&quot; to create your first iteration.</p>
      </div>
    );
  }

  return (
    <div className="ai-generation-history-container">
      <ul className="ai-generation-list">
        {generations.map((generation) => {
          const isSelected = selectedGenerationId === generation.id;
          const statusSlug = (generation.status || "completed").toLowerCase();
          const suggestionCount = generation.suggestions ? generation.suggestions.length : 0;

          return (
            <li key={generation.id}>
              <button
                type="button"
                className={`ai-generation-card${isSelected ? " is-selected" : ""}`}
                onClick={() => onSelect(generation.id)}
                aria-pressed={isSelected}
              >
                <div className="ai-generation-card__top">
                  <div className="ai-generation-card__date">
                    <CalendarIcon size={13} />
                    <span>{formatSuggestionDate(generation.createdAt)}</span>
                  </div>
                  <span className={`ai-chip ai-chip--status ai-chip--status-${statusSlug}`}>
                    {generation.status || "COMPLETED"}
                  </span>
                </div>

                <div className="ai-generation-card__body">
                  <span className="ai-badge-model">{generation.model}</span>
                  <span className="ai-generation-card__count">
                    {suggestionCount} {suggestionCount === 1 ? "task suggestion" : "task suggestions"}
                  </span>
                </div>

                <div className="ai-generation-card__footer">
                  <span className="ai-generation-card__creator">
                    <UserIcon size={12} />
                    <span>{formatCreatorName(generation.createdBy)}</span>
                  </span>
                  {isSelected && (
                    <span className="ai-generation-card__active-indicator">
                      <CheckIcon size={13} />
                      <span>Viewing</span>
                    </span>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
