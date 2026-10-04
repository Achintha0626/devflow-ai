import { formatSuggestionDate, formatCreatorName } from "./aiPlannerUtils";

export function GenerationHistory({ generations, selectedGenerationId, onSelect }) {
  if (generations.length === 0) {
    return <p className="ai-empty-inline">No generations yet for this requirement.</p>;
  }

  return (
    <ul className="ai-generation-list">
      {generations.map((generation) => (
        <li key={generation.id}>
          <button
            type="button"
            className={`ai-generation-item${selectedGenerationId === generation.id ? " is-selected" : ""}`}
            onClick={() => onSelect(generation.id)}
          >
            <span className="ai-generation-item__date">{formatSuggestionDate(generation.createdAt)}</span>
            <span className="ai-generation-item__status">{generation.status}</span>
            <span className="ai-generation-item__meta">{generation.model}</span>
            <span className="ai-generation-item__meta">{generation.promptVersion}</span>
            <span className="ai-generation-item__meta">{generation.suggestions.length} suggestions</span>
            <span className="ai-generation-item__meta">{formatCreatorName(generation.createdBy)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
