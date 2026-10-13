import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { listProjectMembersRequest } from "../../api/projectApi";
import { listTasksRequest, updateTaskStatusRequest } from "../../api/taskApi";
import { KanbanColumn } from "../../components/kanban/KanbanColumn";
import { TaskDetailsPanel } from "../../components/tasks/TaskDetailsPanel";
import { LoadingState } from "../../components/NavigationFeedback";
import {
  STATUS_TRANSITIONS,
  TASK_STATUSES,
  formatTaskLabel,
  getTaskErrorMessage,
} from "../../components/tasks/taskUtils";
import {
  RefreshIcon,
  AlertCircleIcon,
  ArrowLeftIcon,
  SearchIcon,
  CloseIcon,
} from "../../components/icons";
import "./KanbanPage.css";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const TASK_TYPES = ["TASK", "BUG", "FEATURE", "IMPROVEMENT"];

function getMoveErrorMessage(error) {
  const status = error?.response?.status;
  if (status === 400) return "The server rejected the status request. Refresh the board and try again.";
  if (status === 403) return "You do not have permission to move this task.";
  if (status === 404) return "The task or project could not be found. The board is being refreshed.";
  if (status === 409) return getTaskErrorMessage(error, "The task status changed or this transition is no longer valid.");
  return getTaskErrorMessage(error, "The task could not be moved. The board is being refreshed.");
}

export function KanbanPage() {
  const { workspaceId, projectId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [loadedProjectKey, setLoadedProjectKey] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionIsError, setActionIsError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingTaskIds, setPendingTaskIds] = useState(() => new Set());
  const [draggedTask, setDraggedTask] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterType, setFilterType] = useState("");

  const pendingTaskIdsRef = useRef(new Set());
  const requestSequence = useRef(0);
  const projectKey = `${workspaceId}:${projectId}`;
  const hasLoadedTasks = loadedProjectKey === projectKey;
  const currentRequestError = requestError?.projectKey === projectKey
    ? requestError.error
    : null;
  const refreshError = hasLoadedTasks && currentRequestError
    ? getTaskErrorMessage(currentRequestError, "Could not refresh the board. Showing the last loaded tasks.")
    : "";

  useEffect(() => {
    let active = true;
    const requestId = ++requestSequence.current;
    const requestProjectKey = `${workspaceId}:${projectId}`;

    async function loadTasks() {
      try {
        const response = await listTasksRequest(workspaceId, projectId);
        if (!active || requestId !== requestSequence.current) return;
        setTasks(response.data);
        setLoadedProjectKey(requestProjectKey);
        setRequestError(null);
      } catch (error) {
        if (!active || requestId !== requestSequence.current) return;
        setRequestError({ projectKey: requestProjectKey, error });
      } finally {
        if (active && requestId === requestSequence.current) {
          setIsRefreshing(false);
        }
      }
    }

    loadTasks();
    return () => { active = false; };
  }, [workspaceId, projectId, refreshKey]);

  useEffect(() => {
    let active = true;
    async function loadMembers() {
      try {
        const response = await listProjectMembersRequest(workspaceId, projectId);
        if (active) setMembers(response.data);
      } catch {
        if (active) setMembers([]);
      }
    }
    loadMembers();
    return () => { active = false; };
  }, [workspaceId, projectId]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && selectedTaskId) {
        setSelectedTaskId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedTaskId]);

  const refreshBoard = () => {
    setRequestError(null);
    setIsRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  const moveTask = async (task, nextStatus) => {
    if (pendingTaskIdsRef.current.has(task.id)) return;
    if (!STATUS_TRANSITIONS[task.status]?.includes(nextStatus)) return;

    pendingTaskIdsRef.current.add(task.id);
    setPendingTaskIds(new Set(pendingTaskIdsRef.current));
    setActionMessage("");
    setActionIsError(false);

    try {
      const response = await updateTaskStatusRequest(
        workspaceId,
        projectId,
        task.id,
        nextStatus
      );
      requestSequence.current += 1;
      setIsRefreshing(false);
      setRequestError(null);
      setTasks((current) => current.map((item) => item.id === task.id ? response.data : item));
      setActionMessage(`${task.taskNumber} moved to ${formatTaskLabel(response.data.status)}.`);
      setActionIsError(false);
    } catch (error) {
      setActionMessage(getMoveErrorMessage(error));
      setActionIsError(true);
      refreshBoard();
    } finally {
      pendingTaskIdsRef.current.delete(task.id);
      setPendingTaskIds(new Set(pendingTaskIdsRef.current));
    }
  };

  const handleDragStart = (task, event) => {
    if (pendingTaskIdsRef.current.has(task.id) || !(STATUS_TRANSITIONS[task.status] || []).length) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", task.id);
    setDraggedTask(task);
  };

  const handleDragEnd = () => setDraggedTask(null);

  const handleTaskChanged = (updatedTask) => {
    setTasks((current) => current.map((item) => (item.id === updatedTask.id ? updatedTask : item)));
  };

  const handleTaskDeleted = () => {
    setTasks((current) => current.filter((item) => item.id !== selectedTaskId));
    setSelectedTaskId(null);
  };

  const assigneeOptions = useMemo(() => {
    const list = [];
    const seen = new Set();
    members.forEach((member) => {
      const name = [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email;
      list.push({ id: member.userId, name });
      seen.add(member.userId);
    });
    tasks.forEach((task) => {
      if (task.assigneeId && !seen.has(task.assigneeId)) {
        const name = [task.assignee?.firstName, task.assignee?.lastName].filter(Boolean).join(" ") || task.assignee?.email || "Assigned member";
        list.push({ id: task.assigneeId, name });
        seen.add(task.assigneeId);
      }
    });
    return list;
  }, [members, tasks]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() || filterPriority || filterAssignee || filterType
  );

  const resetFilters = () => {
    setSearchQuery("");
    setFilterPriority("");
    setFilterAssignee("");
    setFilterType("");
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchNumber = (task.taskNumber || "").toLowerCase().includes(q);
        const matchTitle = (task.title || "").toLowerCase().includes(q);
        if (!matchNumber && !matchTitle) return false;
      }
      if (filterPriority && task.priority !== filterPriority) {
        return false;
      }
      if (filterAssignee) {
        if (filterAssignee === "unassigned") {
          if (task.assigneeId) return false;
        } else if (task.assigneeId !== filterAssignee) {
          return false;
        }
      }
      if (filterType && task.type !== filterType) {
        return false;
      }
      return true;
    });
  }, [tasks, searchQuery, filterPriority, filterAssignee, filterType]);

  if (!hasLoadedTasks && !currentRequestError) {
    return <div className="kanban-loading"><LoadingState label="Loading Kanban board…" /></div>;
  }

  if (!hasLoadedTasks && currentRequestError) {
    return (
      <div className="kanban-load-error">
        <section className="kanban-error-panel" role="alert">
          <AlertCircleIcon size={24} />
          <h1>Kanban could not be loaded</h1>
          <p>{getTaskErrorMessage(currentRequestError, "Unable to load project tasks.")}</p>
          <div className="kanban-error-actions">
            <button className="kanban-button" type="button" onClick={refreshBoard}>
              <RefreshIcon size={14} />
              <span>Retry</span>
            </button>
            <Link className="kanban-button kanban-button--quiet" to={`/app/workspaces/${workspaceId}/projects`}>
              <ArrowLeftIcon size={14} />
              <span>Back to projects</span>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const totalTasks = tasks.length;

  return (
    <div className="kanban-page" onDragEnd={handleDragEnd}>
      <header className="kanban-header">
        <div>
          <p className="navigation-page__eyebrow">PROJECT WORKFLOW</p>
          <h1>Kanban Board</h1>
          <p>Drag tasks between columns or use quick transition controls to advance status.</p>
        </div>
        <div className="kanban-header__actions">
          <span className="kanban-total">
            {hasActiveFilters
              ? `${filteredTasks.length} of ${totalTasks} tasks`
              : `${totalTasks} ${totalTasks === 1 ? "task" : "tasks"}`}
          </span>
          <button
            className="kanban-button kanban-button--quiet"
            type="button"
            onClick={refreshBoard}
            disabled={isRefreshing}
          >
            <RefreshIcon size={14} className={isRefreshing ? "kanban-spinning" : ""} />
            <span>{isRefreshing ? "Refreshing…" : "Refresh board"}</span>
          </button>
        </div>
      </header>

      <section className="kanban-filters" aria-label="Kanban board filters">
        <div className="kanban-search-wrapper">
          <SearchIcon size={14} className="kanban-search-icon" />
          <input
            type="search"
            className="kanban-search-input"
            placeholder="Search by task ID or title…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search tasks"
          />
        </div>

        <div className="kanban-filter-selects">
          <select
            className="kanban-select"
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            aria-label="Filter by priority"
          >
            <option value="">All Priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {formatTaskLabel(priority)}
              </option>
            ))}
          </select>

          <select
            className="kanban-select"
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            aria-label="Filter by assignee"
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {assigneeOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <select
            className="kanban-select"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            aria-label="Filter by task type"
          >
            <option value="">All Types</option>
            {TASK_TYPES.map((type) => (
              <option key={type} value={type}>
                {formatTaskLabel(type)}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              className="kanban-reset-button"
              onClick={resetFilters}
            >
              <CloseIcon size={12} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </section>

      {(refreshError || actionMessage) && (
        <div
          className={`kanban-message${refreshError || actionIsError ? " kanban-message--error" : ""}`}
          role={refreshError || actionIsError ? "alert" : "status"}
        >
          <div className="kanban-message__content">
            <AlertCircleIcon size={15} />
            <p>{actionMessage || refreshError}</p>
          </div>
          {refreshError && (
            <button className="kanban-text-button" type="button" onClick={refreshBoard}>
              Retry refresh
            </button>
          )}
        </div>
      )}

      <div className="kanban-board-scroll">
        <div className="kanban-board" aria-label="Kanban board">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={filteredTasks.filter((task) => task.status === status)}
              draggedTask={draggedTask}
              pendingTaskIds={pendingTaskIds}
              onMove={moveTask}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onSelectTask={(task) => setSelectedTaskId(task.id)}
            />
          ))}
        </div>
      </div>

      {totalTasks === 0 && !refreshError && (
        <p className="kanban-board-empty" role="status">
          No project tasks yet. When tasks are created, they will automatically appear in their corresponding status column.
        </p>
      )}

      {totalTasks > 0 && filteredTasks.length === 0 && (
        <div className="kanban-no-matches" role="status">
          <p>No tasks match the active filters.</p>
          <button type="button" className="kanban-text-button" onClick={resetFilters}>
            Clear all filters
          </button>
        </div>
      )}

      {selectedTaskId && (
        <div
          className="kanban-drawer-backdrop"
          onClick={() => setSelectedTaskId(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Task Details"
        >
          <div
            className="kanban-drawer-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <TaskDetailsPanel
              key={selectedTaskId}
              workspaceId={workspaceId}
              projectId={projectId}
              taskId={selectedTaskId}
              members={members}
              onClose={() => setSelectedTaskId(null)}
              onEdit={() => navigate(`/app/workspaces/${workspaceId}/projects/${projectId}/tasks`)}
              onChanged={handleTaskChanged}
              onDeleted={handleTaskDeleted}
            />
          </div>
        </div>
      )}
    </div>
  );
}