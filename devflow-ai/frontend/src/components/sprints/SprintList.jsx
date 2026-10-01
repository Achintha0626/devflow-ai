import { formatTaskDate, formatTaskLabel } from "./sprintUtils";

function formatPercent(value) {
  if (!Number.isFinite(value)) return "Unavailable";
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
}

export function SprintList({ sprints, selectedSprintId, onSelect }) {
  if (sprints.length === 0) {
    return (
      <div className="sprint-list-empty">
        <h3>No sprints yet</h3>
        <p>Create a sprint to begin planning project work.</p>
      </div>
    );
  }

  return (
    <ul className="sprint-list">
      {sprints.map((sprint) => (
        <li key={sprint.id}>
          <button
            className={`sprint-list-item${selectedSprintId === sprint.id ? " is-selected" : ""}`}
            type="button"
            aria-pressed={selectedSprintId === sprint.id}
            onClick={() => onSelect(sprint.id)}
          >
            <span className="sprint-list-item__top">
              <span className="sprint-list-item__name">{sprint.name}</span>
              <span className="sprint-status">{formatTaskLabel(sprint.status)}</span>
            </span>
            {sprint.goal && <span className="sprint-list-item__goal">{sprint.goal}</span>}
            <span className="sprint-list-item__dates">
              {formatTaskDate(sprint.startDate)} <span aria-hidden="true">–</span> {formatTaskDate(sprint.endDate)}
            </span>
            <span className="sprint-list-item__stats">
              {sprint.stats.totalTasks} tasks · {sprint.stats.doneTasks} done · {formatPercent(sprint.stats.completionPercentage)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}