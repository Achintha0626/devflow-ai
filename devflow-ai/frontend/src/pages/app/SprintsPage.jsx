import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addTaskToSprintRequest,
  cancelSprintRequest,
  completeSprintRequest,
  deleteSprintRequest,
  getSprintRequest,
  listSprintBacklogRequest,
  listSprintsRequest,
  moveTaskToSprintRequest,
  removeTaskFromSprintRequest,
  startSprintRequest,
} from "../../api/sprintApi";
import { BacklogSection } from "../../components/sprints/BacklogSection";
import { SprintDetails } from "../../components/sprints/SprintDetails";
import { SprintForm } from "../../components/sprints/SprintForm";
import { SprintList } from "../../components/sprints/SprintList";
import { SprintTaskList } from "../../components/sprints/SprintTaskList";
import { getSprintErrorMessage } from "../../components/sprints/sprintUtils";
import { LoadingState } from "../../components/NavigationFeedback";
import {
  PlusIcon,
  RefreshIcon,
  AlertCircleIcon,
  ArrowLeftIcon,
} from "../../components/icons";
import "./SprintManagement.css";

const shouldReconcileAfterFailure = (error) => {
  const status = error?.response?.status;
  return !status || status === 404 || status === 409 || status >= 500;
};

export function SprintsPage() {
  const { workspaceId, projectId } = useParams();
  const projectKey = `${workspaceId}:${projectId}`;
  const [sprints, setSprints] = useState([]);
  const [backlog, setBacklog] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);
  const [loadedProjectKey, setLoadedProjectKey] = useState(null);
  const [pageRequestError, setPageRequestError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [detailRecord, setDetailRecord] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [editingSprint, setEditingSprint] = useState(null);
  const [pendingAction, setPendingAction] = useState("");
  const [pendingTaskIds, setPendingTaskIds] = useState(() => new Set());
  const [operationError, setOperationError] = useState("");
  const [feedback, setFeedback] = useState("");
  const requestSequence = useRef(0);
  const detailSequence = useRef(0);
  const pendingActionRef = useRef("");
  const pendingTaskIdsRef = useRef(new Set());

  const hasLoadedProject = loadedProjectKey === projectKey;
  const currentPageError = pageRequestError?.projectKey === projectKey
    ? pageRequestError.error
    : null;
  const currentSelectedSprintId = selectedProjectKey === projectKey ? selectedSprintId : null;
  const selectedSprint = sprints.find((sprint) => sprint.id === currentSelectedSprintId) || null;
  const hasCurrentDetailRecord = detailRecord?.projectKey === projectKey
    && detailRecord?.sprintId === currentSelectedSprintId
    && detailRecord?.reloadKey === detailReloadKey;
  const selectedSprintDetail = hasCurrentDetailRecord ? detailRecord.data : null;
  const selectedDetailError = hasCurrentDetailRecord ? detailRecord.error : null;
  const isDetailLoading = Boolean(currentSelectedSprintId) && !hasCurrentDetailRecord;

  useEffect(() => {
    let active = true;
    const requestId = ++requestSequence.current;
    const requestProjectKey = `${workspaceId}:${projectId}`;

    async function loadPageData() {
      try {
        const [sprintResponse, backlogResponse] = await Promise.all([
          listSprintsRequest(workspaceId, projectId),
          listSprintBacklogRequest(workspaceId, projectId),
        ]);
        if (!active || requestId !== requestSequence.current) return;

        setSprints(sprintResponse.data);
        setBacklog(backlogResponse.data);
        setLoadedProjectKey(requestProjectKey);
        setPageRequestError(null);
        setSelectedSprintId((currentId) => {
          const existsForProject = sprintResponse.data.some((sprint) => sprint.id === currentId);
          return existsForProject ? currentId : sprintResponse.data[0]?.id || null;
        });
        setSelectedProjectKey(requestProjectKey);
      } catch (error) {
        if (active && requestId !== requestSequence.current) {
          setPageRequestError({ projectKey: requestProjectKey, error });
        }
      } finally {
        if (active && requestId !== requestSequence.current) setIsRefreshing(false);
      }
    }

    loadPageData();
    return () => { active = false; };
  }, [workspaceId, projectId, refreshKey]);

  useEffect(() => {
    if (!currentSelectedSprintId) return undefined;

    let active = true;
    const requestId = ++detailSequence.current;
    const requestProjectKey = `${workspaceId}:${projectId}`;
    const requestReloadKey = detailReloadKey;

    async function loadSprintDetail() {
      try {
        const response = await getSprintRequest(workspaceId, projectId, currentSelectedSprintId);
        if (!active || requestId !== detailSequence.current) return;
        setDetailRecord({
          projectKey: requestProjectKey,
          sprintId: currentSelectedSprintId,
          reloadKey: requestReloadKey,
          data: response.data,
          error: null,
        });
      } catch (error) {
        if (!active || requestId !== detailSequence.current) return;
        setDetailRecord({
          projectKey: requestProjectKey,
          sprintId: currentSelectedSprintId,
          reloadKey: requestReloadKey,
          data: null,
          error,
        });
      }
    }

    loadSprintDetail();
    return () => { active = false; };
  }, [workspaceId, projectId, currentSelectedSprintId, detailReloadKey]);

  const refreshAll = () => {
    setPageRequestError(null);
    setIsRefreshing(true);
    setRefreshKey((key) => key + 1);
    setDetailReloadKey((key) => key + 1);
  };

  const handleRetry = () => {
    setPageRequestError(null);
    setIsRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  const runSprintMutation = async ({ key, request, successMessage, onSuccess }) => {
    if (pendingActionRef.current) return;
    pendingActionRef.current = key;
    setPendingAction(key);
    setOperationError("");
    setFeedback("");

    try {
      const response = await request();
      onSuccess?.(response);
      setFeedback(successMessage);
      refreshAll();
    } catch (error) {
      setOperationError(getSprintErrorMessage(error, "The sprint operation failed."));
      if (shouldReconcileAfterFailure(error)) refreshAll();
    } finally {
      pendingActionRef.current = "";
      setPendingAction("");
    }
  };

  const runTaskMutation = async ({ task, request, successMessage }) => {
    if (pendingTaskIdsRef.current.has(task.id)) return;
    pendingTaskIdsRef.current.add(task.id);
    setPendingTaskIds(new Set(pendingTaskIdsRef.current));
    setOperationError("");
    setFeedback("");

    try {
      await request();
      setFeedback(successMessage);
      refreshAll();
    } catch (error) {
      setOperationError(getSprintErrorMessage(error, "The task could not be moved."));
      if (shouldReconcileAfterFailure(error)) refreshAll();
    } finally {
      pendingTaskIdsRef.current.delete(task.id);
      setPendingTaskIds(new Set(pendingTaskIdsRef.current));
    }
  };

  const handleSprintSaved = (sprint, message) => {
    setSelectedSprintId(sprint.id);
    setSelectedProjectKey(projectKey);
    setFormMode(null);
    setEditingSprint(null);
    setFeedback(message);
    setOperationError("");
    refreshAll();
  };

  const handleCreate = () => {
    setEditingSprint(null);
    setFormMode("create");
    setOperationError("");
    setFeedback("");
  };

  const handleEdit = (sprint) => {
    setEditingSprint(sprint);
    setFormMode("edit");
    setOperationError("");
    setFeedback("");
  };

  const handleLifecycle = (sprint, action) => {
    const requests = {
      start: startSprintRequest,
      complete: completeSprintRequest,
      cancel: cancelSprintRequest,
    };
    const messages = {
      start: "Sprint started.",
      complete: "Sprint completed. Its tasks remain assigned to this sprint.",
      cancel: "Sprint cancelled.",
    };
    runSprintMutation({
      key: action,
      request: () => requests[action](workspaceId, projectId, sprint.id),
      successMessage: messages[action],
    });
  };

  const handleDelete = (sprint) => runSprintMutation({
    key: "delete",
    request: () => deleteSprintRequest(workspaceId, projectId, sprint.id),
    successMessage: "Sprint deleted. Its tasks have returned to the backlog.",
    onSuccess: () => {
      setSelectedSprintId(null);
      setSelectedProjectKey(projectKey);
      setFormMode(null);
    },
  });

  const handleAddTask = (task) => {
    if (!selectedSprint || !["PLANNED", "ACTIVE"].includes(selectedSprint.status)) return;
    runTaskMutation({
      task,
      request: () => addTaskToSprintRequest(workspaceId, projectId, selectedSprint.id, task.id),
      successMessage: `${task.taskNumber} added to ${selectedSprint.name}.`,
    });
  };

  const handleRemoveTask = (sprintTask) => {
    if (!selectedSprintDetail) return;
    runTaskMutation({
      task: sprintTask,
      request: () => removeTaskFromSprintRequest(workspaceId, projectId, selectedSprintDetail.id, sprintTask.id),
      successMessage: `${sprintTask.taskNumber} moved to backlog.`,
    });
  };

  const handleMoveTask = (sprintTask, targetSprintId) => {
    const target = sprints.find((sprint) => sprint.id === targetSprintId);
    if (!target || !["PLANNED", "ACTIVE"].includes(target.status)) return;
    runTaskMutation({
      task: sprintTask,
      request: () => moveTaskToSprintRequest(workspaceId, projectId, sprintTask.id, targetSprintId),
      successMessage: `${sprintTask.taskNumber} moved to ${target.name}.`,
    });
  };

  if (!hasLoadedProject && !currentPageError) {
    return <div className="sprints-loading"><LoadingState label="Loading sprints and backlog…" /></div>;
  }

  if (!hasLoadedProject && currentPageError) {
    return (
      <div className="sprints-load-error">
        <section className="sprint-error-panel" role="alert">
          <AlertCircleIcon size={24} />
          <h1>Sprints could not be loaded</h1>
          <p>{getSprintErrorMessage(currentPageError, "Unable to load project sprints.")}</p>
          <div className="sprint-form__actions">
            <button className="sprint-button sprint-button--primary" type="button" onClick={handleRetry}>
              <RefreshIcon size={14} />
              <span>Retry</span>
            </button>
            <Link className="sprint-button sprint-button--quiet" to={`/app/workspaces/${workspaceId}/projects`}>
              <ArrowLeftIcon size={14} />
              <span>Back to projects</span>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="sprints-page">
      <header className="sprints-page__header">
        <div>
          <p className="navigation-page__eyebrow">PROJECT PLANNING</p>
          <h1>Sprint Management</h1>
          <p>Plan iterations, track velocity and completion, and allocate backlog items across sprint cycles.</p>
        </div>
        <div className="sprints-page__header-actions">
          <span className="sprints-count-pill">{sprints.length} {sprints.length === 1 ? "sprint" : "sprints"}</span>
          <button className="sprint-button sprint-button--quiet" type="button" onClick={refreshAll} disabled={isRefreshing}>
            <RefreshIcon size={14} />
            <span>{isRefreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
          <button className="sprint-button sprint-button--primary" type="button" onClick={handleCreate}>
            <PlusIcon size={15} />
            <span>Create sprint</span>
          </button>
        </div>
      </header>

      {(operationError || feedback || currentPageError) && (
        <div className={`sprint-message${operationError || currentPageError ? " sprint-message--error" : ""}`} role={operationError || currentPageError ? "alert" : "status"}>
          <div className="sprint-message__content">
            <AlertCircleIcon size={15} />
            <p>{operationError || feedback || getSprintErrorMessage(currentPageError, "Could not refresh sprint data. Showing the last loaded data.")}</p>
          </div>
          {(currentPageError || isRefreshing) && (
            <button className="sprint-text-button" type="button" onClick={handleRetry}>
              Refresh data
            </button>
          )}
        </div>
      )}

      <SprintList
        sprints={sprints}
        selectedSprintId={currentSelectedSprintId}
        onSelect={(sprintId) => {
          setSelectedSprintId(sprintId);
          setSelectedProjectKey(projectKey);
          setFormMode(null);
          setEditingSprint(null);
          setOperationError("");
          setFeedback("");
        }}
      />

      {formMode && (
        <SprintForm
          key={formMode === "edit" ? editingSprint.id : "new-sprint"}
          sprint={formMode === "edit" ? editingSprint : null}
          onCancel={() => { setFormMode(null); setEditingSprint(null); }}
          onSaved={handleSprintSaved}
        />
      )}

      {!formMode && isDetailLoading && (
        <div className="sprint-panel sprint-detail-loading">
          <LoadingState label="Loading sprint details…" />
        </div>
      )}

      {!formMode && selectedDetailError && (
        <section className="sprint-panel sprint-detail-error" role="alert">
          <AlertCircleIcon size={20} />
          <h2>Sprint details unavailable</h2>
          <p>{getSprintErrorMessage(selectedDetailError, "Unable to load sprint details.")}</p>
          <button className="sprint-button sprint-button--quiet" type="button" onClick={() => setDetailReloadKey((key) => key + 1)}>
            <RefreshIcon size={13} />
            <span>Retry sprint details</span>
          </button>
        </section>
      )}

      {!formMode && selectedSprintDetail && (
        <>
          <SprintDetails
            key={selectedSprintDetail.id}
            sprint={selectedSprintDetail}
            pendingAction={pendingAction}
            onEdit={handleEdit}
            onLifecycle={handleLifecycle}
            onDelete={handleDelete}
          />

          <div className="sprints-work-area">
            <section className="sprint-panel sprint-tasks-panel" aria-labelledby="sprint-tasks-heading">
              <header className="sprint-panel__header">
                <div>
                  <p className="sprint-eyebrow">SPRINT WORK</p>
                  <h2 id="sprint-tasks-heading">
                    Sprint Tasks <span className="sprint-count">{selectedSprintDetail.tasks.length}</span>
                  </h2>
                </div>
              </header>
              <SprintTaskList
                tasks={selectedSprintDetail.tasks}
                sprints={sprints}
                pendingTaskIds={pendingTaskIds}
                onMove={handleMoveTask}
                onRemove={handleRemoveTask}
              />
            </section>

            <BacklogSection
              backlog={backlog}
              selectedSprint={selectedSprint}
              pendingTaskIds={pendingTaskIds}
              onAddTask={handleAddTask}
            />
          </div>
        </>
      )}

      {!formMode && !currentSelectedSprintId && sprints.length > 0 && (
        <div className="sprints-work-area sprints-work-area--empty">
          <section className="sprint-panel sprint-select-prompt">
            <h2>Select a sprint</h2>
            <p>Choose an iteration from the selector above to inspect its details, tasks, and progress.</p>
          </section>
          <BacklogSection
            backlog={backlog}
            selectedSprint={null}
            pendingTaskIds={pendingTaskIds}
            onAddTask={handleAddTask}
          />
        </div>
      )}

      {!formMode && sprints.length === 0 && (
        <div className="sprints-work-area sprints-work-area--empty">
          <section className="sprint-panel sprint-select-prompt">
            <h2>No sprints available</h2>
            <p>Create a sprint to start organizing tasks into timeboxed iterations.</p>
          </section>
          <BacklogSection
            backlog={backlog}
            selectedSprint={null}
            pendingTaskIds={pendingTaskIds}
            onAddTask={handleAddTask}
          />
        </div>
      )}
    </div>
  );
}