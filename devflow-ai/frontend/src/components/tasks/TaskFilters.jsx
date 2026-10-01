import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  formatTaskLabel,
} from "./taskUtils";

export function TaskFilters({
  filters,
  members,
  requirements,
  onChange,
  onSubmit,
  onClear,
  hasFilters,
}) {
  const update = (field) => (event) => onChange({ ...filters, [field]: event.target.value });

  return (
    <form className="task-filters" onSubmit={onSubmit}>
      <label className="task-filter task-filter--search">
        <span>Search tasks</span>
        <input
          type="search"
          value={filters.search}
          onChange={update("search")}
          maxLength={100}
          placeholder="Task number or title"
        />
      </label>
      <label className="task-filter">
        <span>Status</span>
        <select value={filters.status} onChange={update("status")}>
          <option value="">All statuses</option>
          {TASK_STATUSES.map((status) => <option key={status} value={status}>{formatTaskLabel(status)}</option>)}
        </select>
      </label>
      <label className="task-filter">
        <span>Priority</span>
        <select value={filters.priority} onChange={update("priority")}>
          <option value="">All priorities</option>
          {TASK_PRIORITIES.map((priority) => <option key={priority} value={priority}>{formatTaskLabel(priority)}</option>)}
        </select>
      </label>
      <label className="task-filter">
        <span>Type</span>
        <select value={filters.type} onChange={update("type")}>
          <option value="">All types</option>
          {TASK_TYPES.map((type) => <option key={type} value={type}>{formatTaskLabel(type)}</option>)}
        </select>
      </label>
      <label className="task-filter">
        <span>Assignee</span>
        <select value={filters.assigneeId} onChange={update("assigneeId")}>
          <option value="">All assignees</option>
          {members.map((member) => (
            <option key={member.userId} value={member.userId}>
              {[member.firstName, member.lastName].filter(Boolean).join(" ") || member.email}
            </option>
          ))}
        </select>
      </label>
      <label className="task-filter task-filter--requirement">
        <span>Requirement</span>
        <select value={filters.requirementId} onChange={update("requirementId")}>
          <option value="">All requirements</option>
          {requirements.map((requirement) => (
            <option key={requirement.id} value={requirement.id}>{requirement.title}</option>
          ))}
        </select>
      </label>
      <div className="task-filters__actions">
        <button className="task-button task-button--primary" type="submit">Apply filters</button>
        <button className="task-button task-button--quiet" type="button" onClick={onClear} disabled={!hasFilters}>
          Clear filters
        </button>
      </div>
    </form>
  );
}