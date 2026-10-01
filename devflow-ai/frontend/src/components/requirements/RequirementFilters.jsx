import {
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_STATUSES,
  formatTaskLabel,
} from "./requirementUtils";

export function RequirementFilters({ filters, onChange, onSubmit, onReset, hasFilters }) {
  const update = (field) => (event) => onChange({ ...filters, [field]: event.target.value });

  return (
    <form className="requirement-filters" onSubmit={onSubmit}>
      <label className="requirement-field requirement-filter">
        <span>Status</span>
        <select value={filters.status} onChange={update("status")}>
          <option value="">All statuses</option>
          {REQUIREMENT_STATUSES.map((status) => (
            <option key={status} value={status}>{formatTaskLabel(status)}</option>
          ))}
        </select>
      </label>
      <label className="requirement-field requirement-filter">
        <span>Priority</span>
        <select value={filters.priority} onChange={update("priority")}>
          <option value="">All priorities</option>
          {REQUIREMENT_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>{formatTaskLabel(priority)}</option>
          ))}
        </select>
      </label>
      <div className="requirement-filters__actions">
        <button className="requirement-button requirement-button--primary" type="submit">Apply filters</button>
        <button className="requirement-button requirement-button--quiet" type="button" onClick={onReset} disabled={!hasFilters}>
          Reset filters
        </button>
      </div>
    </form>
  );
}