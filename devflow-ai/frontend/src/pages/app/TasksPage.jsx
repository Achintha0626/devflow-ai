import { useEffect, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import {
  listProjectMembersRequest,
  listProjectRequirementsRequest,
} from "../../api/projectApi";
import { listTasksRequest } from "../../api/taskApi";
import { TaskDetailsPanel } from "../../components/tasks/TaskDetailsPanel";
import { TaskFilters } from "../../components/tasks/TaskFilters";
import { TaskForm } from "../../components/tasks/TaskForm";
import {
  EMPTY_FILTERS,
  formatTaskDate,
  formatTaskLabel,
  getApiFilters,
  getTaskDisplayName,
  getTaskErrorMessage,
  hasActiveFilters,
} from "../../components/tasks/taskUtils";
import {
  PlusIcon,
  ChevronRightIcon,
  AlertCircleIcon,
  RefreshIcon,
  UserIcon,
} from "../../components/icons";
import "./TaskManagement.css";

function TaskRow({ task, selected, onSelect }) {
  const statusSlug = (task.status || "").toLowerCase();
  const prioritySlug = (task.priority || "").toLowerCase();

  return (
    <button
      className={`task-list-row${selected ? " is-selected" : ""}`}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="task-list-row__main">
        <span className="task-list-row__identity">
          <span className="task-number">{task.taskNumber}</span>
          <span className="task-list-row__title">{task.title}</span>
        </span>
        <span className="task-list-row__meta">
          <span className={`task-badge task-badge--${statusSlug}`}>
            {formatTaskLabel(task.status)}
          </span>
          <span className={`task-priority-badge task-priority--${prioritySlug}`}>
            {formatTaskLabel(task.priority)}
          </span>
          <span className="task-type-badge">{formatTaskLabel(task.type)}</span>
          <span className="task-points-badge">
            {task.storyPoints == null ? "—" : `${task.storyPoints} pts`}
          </span>
          <span className="task-assignee-preview">
            <UserIcon size={12} />
            <span>{getTaskDisplayName(task.assignee)}</span>
          </span>
          {task.dueDate && (
            <span className="task-due-date">
              Due {formatTaskDate(task.dueDate)}
            </span>
          )}
        </span>
      </span>
      <span className="task-list-row__arrow" aria-hidden="true">
        <ChevronRightIcon size={16} />
      </span>
    </button>
  );
}

function TaskList({ tasks, selectedTaskId, onSelect }) {
  return (
    <div className="task-list" aria-label="Project tasks">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          selected={selectedTaskId === task.id}
          onSelect={() => onSelect(task.id)}
        />
      ))}
    </div>
  );
}

export function TasksPage() {
  const { workspaceId, projectId } = useParams();
  const { project } = useOutletContext();
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [memberError, setMemberError] = useState("");
  const [requirementError, setRequirementError] = useState("");
  const [listError, setListError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [panelMode, setPanelMode] = useState("empty");
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let active = true;
    async function loadTasks() {
      setIsLoading(true);
      setListError(null);
      try {
        const response = await listTasksRequest(
          workspaceId,
          projectId,
          getApiFilters(appliedFilters)
        );
        if (active) setTasks(response.data);
      } catch (error) {
        if (active) setListError(error);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    loadTasks();
    return () => { active = false; };
  }, [workspaceId, projectId, appliedFilters, reloadKey]);

  useEffect(() => {
    let active = true;
    async function loadOptions() {
      try {
        const response = await listProjectMembersRequest(workspaceId, projectId);
        if (active) setMembers(response.data);
      } catch (error) {
        if (active) setMemberError(getTaskErrorMessage(error, "Project members could not be loaded."));
      }
      try {
        const response = await listProjectRequirementsRequest(workspaceId, projectId);
        if (active) setRequirements(response.data);
      } catch (error) {
        if (active) setRequirementError(getTaskErrorMessage(error, "Requirements could not be loaded."));
      }
    }
    loadOptions();
    return () => { active = false; };
  }, [workspaceId, projectId]);

  const hasFilters = hasActiveFilters(draftFilters);
  const filtersApplied = hasActiveFilters(appliedFilters);

  const submitFilters = (event) => {
    event.preventDefault();
    setFeedback("");
    setSelectedTaskId(null);
    setPanelMode("empty");
    setAppliedFilters(getApiFilters(draftFilters));
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setSelectedTaskId(null);
    setPanelMode("empty");
    setFeedback("");
  };

  const refreshTaskList = (updatedTask) => {
    if (updatedTask) {
      setTasks((current) => current.map((task) => task.id === updatedTask.id ? updatedTask : task));
    }
    setReloadKey((value) => value + 1);
  };

  const handleSaved = (task, message) => {
    setSelectedTaskId(task.id);
    setEditingTask(null);
    setPanelMode("details");
    setFeedback(message);
    refreshTaskList(task);
  };

  const handleDeleted = () => {
    setTasks((current) => current.filter((task) => task.id !== selectedTaskId));
    setSelectedTaskId(null);
    setEditingTask(null);
    setPanelMode("empty");
    setFeedback("Task permanently deleted.");
    setReloadKey((value) => value + 1);
  };

  return (
    <div className="tasks-page">
      <header className="tasks-page__header">
        <div>
          <p className="navigation-page__eyebrow">{project.name.toUpperCase()} / TASKS</p>
          <h1>Tasks</h1>
          <p>Search, filter, and manage tasks across your development workflow.</p>
        </div>
        <button
          className="task-button task-button--primary"
          type="button"
          onClick={() => {
            setEditingTask(null);
            setSelectedTaskId(null);
            setPanelMode("create");
            setFeedback("");
          }}
        >
          <PlusIcon size={15} />
          <span>Create task</span>
        </button>
      </header>

      {feedback && <p className="task-success tasks-page__feedback" role="status">{feedback}</p>}

      <TaskFilters
        filters={draftFilters}
        members={members}
        requirements={requirements}
        hasFilters={hasFilters}
        onChange={setDraftFilters}
        onSubmit={submitFilters}
        onClear={clearFilters}
      />

      {listError && (
        <div className="task-inline-error tasks-page__error" role="alert">
          <AlertCircleIcon size={16} />
          <p>{getTaskErrorMessage(listError, "Unable to load project tasks.")}</p>
          <button className="task-button task-button--quiet" type="button" onClick={() => setReloadKey((value) => value + 1)}>
            <RefreshIcon size={13} />
            <span>Retry</span>
          </button>
          {listError?.response?.status === 404 && (
            <Link className="task-text-button" to={`/app/workspaces/${workspaceId}/projects`}>Back to projects</Link>
          )}
        </div>
      )}

      {memberError && <p className="task-option-warning" role="status">{memberError} Assignment filters and selectors may be unavailable.</p>}
      {requirementError && <p className="task-option-warning" role="status">{requirementError} Requirement filters and selectors may be unavailable.</p>}

      <div className="tasks-workspace">
        <section className="tasks-list-panel" aria-labelledby="tasks-list-title">
          <header className="tasks-list-panel__header">
            <h2 id="tasks-list-title">Project tasks</h2>
            {!isLoading && (
              <span className="tasks-count-pill">
                {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
              </span>
            )}
          </header>
          {isLoading && (
            <div className="task-loading" role="status">
              <span className="navigation-state__spinner" aria-hidden="true" />
              <span>Loading tasks…</span>
            </div>
          )}
          {!isLoading && tasks.length > 0 && (
            <TaskList
              tasks={tasks}
              selectedTaskId={selectedTaskId}
              onSelect={(taskId) => {
                setSelectedTaskId(taskId);
                setEditingTask(null);
                setPanelMode("details");
                setFeedback("");
              }}
            />
          )}
          {!isLoading && !listError && tasks.length === 0 && filtersApplied && (
            <div className="task-empty-state">
              <h3>No matching tasks</h3>
              <p>Try changing or clearing the current filters to see more tasks.</p>
              <button className="task-button task-button--quiet" type="button" onClick={clearFilters}>Clear filters</button>
            </div>
          )}
          {!isLoading && !listError && tasks.length === 0 && !filtersApplied && (
            <div className="task-empty-state">
              <h3>No tasks yet</h3>
              <p>Create the first engineering task for {project.name}.</p>
              <button className="task-button task-button--primary" type="button" onClick={() => setPanelMode("create")}>
                <PlusIcon size={14} />
                <span>Create task</span>
              </button>
            </div>
          )}
          {!isLoading && listError && tasks.length === 0 && (
            <div className="task-empty-state">
              <h3>Tasks could not be loaded</h3>
              <p>Retry the request to load tasks again.</p>
            </div>
          )}
        </section>

        <div className="tasks-inspector">
          {panelMode === "details" && selectedTaskId && (
            <TaskDetailsPanel
              key={selectedTaskId}
              workspaceId={workspaceId}
              projectId={projectId}
              taskId={selectedTaskId}
              members={members}
              onClose={() => { setSelectedTaskId(null); setPanelMode("empty"); }}
              onEdit={(task) => { setEditingTask(task); setPanelMode("edit"); }}
              onChanged={refreshTaskList}
              onDeleted={handleDeleted}
            />
          )}
          {(panelMode === "create" || panelMode === "edit") && (
            <TaskForm
              key={panelMode === "edit" ? editingTask.id : "new-task"}
              task={panelMode === "edit" ? editingTask : null}
              members={members}
              requirements={requirements}
              memberError={memberError}
              requirementError={requirementError}
              onCancel={() => {
                if (panelMode === "edit" && editingTask) {
                  setSelectedTaskId(editingTask.id);
                  setPanelMode("details");
                } else {
                  setPanelMode("empty");
                }
                setEditingTask(null);
              }}
              onSaved={handleSaved}
            />
          )}
          {panelMode === "empty" && (
            <aside className="task-panel task-inspector-empty">
              <h2>Task Inspector</h2>
              <p>Select a task from the list to view its details, history, and status transitions, or create a new task.</p>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}