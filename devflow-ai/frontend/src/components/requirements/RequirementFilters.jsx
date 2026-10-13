import {
  REQUIREMENT_PRIORITIES,
  REQUIREMENT_STATUSES,
  formatTaskLabel,
} from "./requirementUtils";
import { SearchIcon, CloseIcon } from "../icons";

export function RequirementFilters({
  searchQuery,
  onSearchChange,
  filters,
  onChange,
  onReset,
  hasActiveFilters,
  totalCount,
  filteredCount,
}) {
  const update = (field) => (event) => onChange({ ...filters, [field]: event.target.value });

  return (
    <div className="requirement-filter-toolbar" role="search" aria-label="Filter requirements">
      <div className="requirement-filter-search">
        <SearchIcon size={14} className="requirement-search-icon" />
        <input
          type="search"
          className="requirement-search-input"
          placeholder="Search by title or description…"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search requirements"
        />
        {searchQuery && (
          <button
            className="requirement-search-clear"
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search query"
          >
            <CloseIcon size={12} />
          </button>
        )}
      </div>

      <div className="requirement-filter-controls">
        <label className="requirement-filter-field">
          <span className="requirement-sr-only">Filter by status</span>
          <select
            className={`requirement-filter-select${filters.status ? " is-active" : ""}`}
            value={filters.status}
            onChange={update("status")}
            aria-label="Status filter"
          >
            <option value="">All statuses</option>
            {REQUIREMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatTaskLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="requirement-filter-field">
          <span className="requirement-sr-only">Filter by priority</span>
          <select
            className={`requirement-filter-select${filters.priority ? " is-active" : ""}`}
            value={filters.priority}
            onChange={update("priority")}
            aria-label="Priority filter"
          >
            <option value="">All priorities</option>
            {REQUIREMENT_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {formatTaskLabel(priority)}
              </option>
            ))}
          </select>
        </label>

        {hasActiveFilters && (
          <button
            className="requirement-button requirement-button--quiet requirement-button--sm requirement-filter-reset"
            type="button"
            onClick={onReset}
          >
            <CloseIcon size={12} />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {hasActiveFilters && totalCount !== filteredCount && (
        <span className="requirement-filter-count">
          Showing {filteredCount} of {totalCount}
        </span>
      )}
    </div>
  );
}