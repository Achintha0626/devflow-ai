import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listTasksRequest, updateTaskStatusRequest } from "../../api/taskApi";
import { KanbanColumn } from "../../components/kanban/KanbanColumn";
import { LoadingState } from "../../components/NavigationFeedback";
import {
  STATUS_TRANSITIONS,
  TASK_STATUSES,
  formatTaskLabel,
  getTaskErrorMessage,
} from "../../components/tasks/taskUtils";
import "./KanbanPage.css";

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
  const [tasks, setTasks] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [requestError, setRequestError] = useState(null);
  const [loadedProjectKey, setLoadedProjectKey] = useState(null);
  const [actionMessage, setActionMessage] = useState("");
  const [actionIsError, setActionIsError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingTaskIds, setPendingTaskIds] = useState(() => new Set());
  const [draggedTask, setDraggedTask] = useState(null);
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

  if (!hasLoadedTasks && !currentRequestError) {
    return <div className="kanban-loading"><LoadingState label="Loading Kanban board…" /></div>;
  }

  if (!hasLoadedTasks && currentRequestError) {
    return (
      <div className="kanban-load-error">
        <section className="kanban-error-panel" role="alert">
          <h1>Kanban could not be loaded</h1>
          <p>{getTaskErrorMessage(currentRequestError, "Unable to load project tasks.")}</p>
          <div className="kanban-error-actions">
            <button className="kanban-button" type="button" onClick={refreshBoard}>Retry</button>
            <Link className="kanban-button kanban-button--quiet" to={`/app/workspaces/${workspaceId}/projects`}>Back to projects</Link>
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
          <h1>Kanban</h1>
          <p>Move tasks through the project's status workflow.</p>
        </div>
        <div className="kanban-header__actions">
          <span className="kanban-total">{totalTasks} {totalTasks === 1 ? "task" : "tasks"}</span>
          <button className="kanban-button kanban-button--quiet" type="button" onClick={refreshBoard} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing…" : "Refresh board"}
          </button>
        </div>
      </header>

      {(refreshError || actionMessage) && (
        <div className={`kanban-message${refreshError || actionIsError ? " kanban-message--error" : ""}`} role={refreshError || actionIsError ? "alert" : "status"}>
          <p>{actionMessage || refreshError}</p>
          {refreshError && <button className="kanban-text-button" type="button" onClick={refreshBoard}>Retry refresh</button>}
        </div>
      )}

      <div className="kanban-board-scroll">
        <div className="kanban-board" aria-label="Kanban board">
          {TASK_STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasks.filter((task) => task.status === status)}
              draggedTask={draggedTask}
              pendingTaskIds={pendingTaskIds}
              onMove={moveTask}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      </div>
      {totalTasks === 0 && !refreshError && (
        <p className="kanban-board-empty" role="status">No project tasks yet. The status columns are ready when tasks are added.</p>
      )}
    </div>
  );
}