import { formatTaskDate, formatTaskLabel } from "./sprintUtils";

function formatPercent(value) {
  if (!Number.isFinite(value)) return "0%";
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
}

export function SprintList({ sprints, selectedSprintId, onSelect }) {
  if (sprints.length === 0) {
    return (
      <div className="sprint-selector-empty">
        <p>No sprints created yet. Create a sprint to begin planning iterations.</p>
      </div>
    );
  }

  return (
    <div className="sprint-selector" role="region" aria-label="Sprint selection">
      <div className="sprint-selector-scroll">
        <div className="sprint-selector-track" role="tablist" aria-label="Project sprints">
          {sprints.map((sprint) => {
            const isSelected = selectedSprintId === sprint.id;
            const statusSlug = (sprint.status || "").toLowerCase();
            return (
              <button
                key={sprint.id}
                role="tab"
                aria-selected={isSelected}
                aria-controls="sprint-overview-panel"
                className={`sprint-selector-card${isSelected ? " is-selected" : ""}`}
                type="button"
                onClick={() => onSelect(sprint.id)}
              >
                <div className="sprint-selector-card__header">
                  <span className="sprint-selector-card__name">{sprint.name}</span>
                  <span className={`sprint-status sprint-status--${statusSlug}`}>
                    {formatTaskLabel(sprint.status)}
                  </span>
                </div>
                <div className="sprint-selector-card__dates">
                  {formatTaskDate(sprint.startDate)}
                  <span aria-hidden="true"> – </span>
                  {formatTaskDate(sprint.endDate)}
                </div>
                <div className="sprint-selector-card__stats">
                  <span>{sprint.stats.totalTasks} {sprint.stats.totalTasks === 1 ? "task" : "tasks"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatPercent(sprint.stats.completionPercentage)} done</span>
                  {sprint.stats.totalStoryPoints > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{sprint.stats.totalStoryPoints} pts</span>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}