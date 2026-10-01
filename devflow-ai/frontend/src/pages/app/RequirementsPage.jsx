import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  deleteRequirementRequest,
  getRequirementRequest,
  listRequirementsRequest,
} from "../../api/requirementApi";
import { RequirementDetails } from "../../components/requirements/RequirementDetails";
import { RequirementFilters } from "../../components/requirements/RequirementFilters";
import { RequirementForm } from "../../components/requirements/RequirementForm";
import { RequirementList } from "../../components/requirements/RequirementList";
import { getRequirementErrorMessage } from "../../components/requirements/requirementUtils";
import { LoadingState } from "../../components/NavigationFeedback";
import "./RequirementsManagement.css";

const EMPTY_FILTERS = { status: "", priority: "" };

function getApiFilters(filters) {
  const result = {};
  if (filters.status) result.status = filters.status;
  if (filters.priority) result.priority = filters.priority;
  return result;
}

function hasActiveFilters(filters) {
  return Boolean(filters.status || filters.priority);
}

export function RequirementsPage() {
  const { workspaceId, projectId } = useParams();
  const projectKey = `${workspaceId}:${projectId}`;
  const [requirements, setRequirements] = useState([]);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [selectedRequirementId, setSelectedRequirementId] = useState(null);
  const [selectedProjectKey, setSelectedProjectKey] = useState(null);
  const [loadedProjectKey, setLoadedProjectKey] = useState(null);
  const [listRequestError, setListRequestError] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formMode, setFormMode] = useState(null);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [pendingAction, setPendingAction] = useState("");
  const [pageError, setPageError] = useState("");
  const [feedback, setFeedback] = useState("");
  const listRequestSequence = useRef(0);
  const detailRequestSequence = useRef(0);
  const pendingActionRef = useRef("");

  const hasLoadedProject = loadedProjectKey === projectKey;
  const currentListError = listRequestError?.projectKey === projectKey
    ? listRequestError.error
    : null;
  const currentSelectionId = selectedProjectKey === projectKey
    ? selectedRequirementId
    : null;
  const hasCurrentDetail = detailRecord?.projectKey === projectKey
    && detailRecord?.requirementId === currentSelectionId;
  const selectedDetail = hasCurrentDetail ? detailRecord.data : null;
  const selectedDetailError = hasCurrentDetail ? detailRecord.error : null;
  const isDetailLoading = Boolean(currentSelectionId) && !hasCurrentDetail;
  const filtered = hasActiveFilters(appliedFilters);

  useEffect(() => {
    let active = true;
    const requestId = ++listRequestSequence.current;
    const requestProjectKey = `${workspaceId}:${projectId}`;

    async function loadRequirements() {
      try {
        const response = await listRequirementsRequest(
          workspaceId,
          projectId,
          getApiFilters(appliedFilters)
        );
        if (!active || requestId !== listRequestSequence.current) return;
        setRequirements(response.data);
        setLoadedProjectKey(requestProjectKey);
        setListRequestError(null);
        setSelectedRequirementId((currentId) => {
          const selectionStillExists = response.data.some((requirement) => requirement.id === currentId);
          return selectionStillExists ? currentId : response.data[0]?.id || null;
        });
        setSelectedProjectKey(requestProjectKey);
      } catch (error) {
        if (active && requestId === listRequestSequence.current) {
          setListRequestError({ projectKey: requestProjectKey, error });
        }
      } finally {
        if (active && requestId === listRequestSequence.current) setIsRefreshing(false);
      }
    }

    loadRequirements();
    return () => { active = false; };
  }, [workspaceId, projectId, appliedFilters, refreshKey]);

  useEffect(() => {
    if (!currentSelectionId) return undefined;
    let active = true;
    const requestId = ++detailRequestSequence.current;
    const requestProjectKey = `${workspaceId}:${projectId}`;
    const requirementId = currentSelectionId;

    async function loadRequirementDetail() {
      try {
        const response = await getRequirementRequest(workspaceId, projectId, requirementId);
        if (!active || requestId !== detailRequestSequence.current) return;
        setDetailRecord({
          projectKey: requestProjectKey,
          requirementId,
          data: response.data,
          error: null,
        });
      } catch (error) {
        if (!active || requestId !== detailRequestSequence.current) return;
        setDetailRecord({ projectKey: requestProjectKey, requirementId, data: null, error });
      }
    }

    loadRequirementDetail();
    return () => { active = false; };
  }, [workspaceId, projectId, currentSelectionId]);

  const refreshRequirements = () => {
    setListRequestError(null);
    setIsRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setPageError("");
    setFeedback("");
    setListRequestError(null);
    setIsRefreshing(true);
    setAppliedFilters(getApiFilters(draftFilters));
  };

  const resetFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    setPageError("");
    setFeedback("");
    setListRequestError(null);
    setIsRefreshing(true);
  };

  const selectRequirement = (requirementId) => {
    setSelectedRequirementId(requirementId);
    setSelectedProjectKey(projectKey);
    setFormMode(null);
    setEditingRequirement(null);
    setPageError("");
    setFeedback("");
  };

  const handleCreate = () => {
    setFormMode("create");
    setEditingRequirement(null);
    setPageError("");
    setFeedback("");
  };

  const handleEdit = (requirement) => {
    setEditingRequirement(requirement);
    setFormMode("edit");
    setPageError("");
    setFeedback("");
  };

  const handleSaved = (requirement, message) => {
    setPageError("");
    setFeedback(message);
    setFormMode(null);
    setEditingRequirement(null);
    setSelectedRequirementId(requirement.id);
    setSelectedProjectKey(projectKey);
    setDetailRecord({ projectKey, requirementId: requirement.id, data: requirement, error: null });
    if (message === "Requirement created.") {
      setDraftFilters(EMPTY_FILTERS);
      setAppliedFilters(EMPTY_FILTERS);
    }
    setRequirements((current) => {
      const exists = current.some((item) => item.id === requirement.id);
      const updated = exists
        ? current.map((item) => item.id === requirement.id ? requirement : item)
        : [requirement, ...current];
      return updated;
    });
    setListRequestError(null);
    setIsRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  const handleDelete = async (requirement) => {
    if (pendingActionRef.current) return;
    pendingActionRef.current = "delete";
    setPendingAction("delete");
    setPageError("");
    setFeedback("");

    try {
      await deleteRequirementRequest(workspaceId, projectId, requirement.id);
      const remaining = requirements.filter((item) => item.id !== requirement.id);
      const nextRequirement = remaining[0] || null;
      setRequirements(remaining);
      setSelectedRequirementId(nextRequirement?.id || null);
      setSelectedProjectKey(projectKey);
      setDetailRecord(null);
      setFeedback("Requirement deleted.");
      setListRequestError(null);
      setIsRefreshing(true);
      setRefreshKey((key) => key + 1);
    } catch (error) {
      setPageError(getRequirementErrorMessage(error, "Unable to delete this requirement."));
    } finally {
      pendingActionRef.current = "";
      setPendingAction("");
    }
  };

  const currentInitialError = !hasLoadedProject && currentListError;
  if (!hasLoadedProject && !currentInitialError) {
    return <div className="requirements-loading"><LoadingState label="Loading requirements…" /></div>;
  }

  if (currentInitialError) {
    return (
      <div className="requirements-load-error">
        <section className="requirement-error-panel" role="alert">
          <h1>Requirements could not be loaded</h1>
          <p>{getRequirementErrorMessage(currentInitialError, "Unable to load project requirements.")}</p>
          <div className="requirement-form__actions">
            <button className="requirement-button requirement-button--primary" type="button" onClick={refreshRequirements}>Retry</button>
            <Link className="requirement-button requirement-button--quiet" to={`/app/workspaces/${workspaceId}/projects`}>Back to projects</Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="requirements-page">
      <header className="requirements-page__header">
        <div>
          <p className="navigation-page__eyebrow">PROJECT PLANNING</p>
          <h1>Requirements</h1>
          <p>Capture and review the needs behind this project.</p>
        </div>
        <button className="requirement-button requirement-button--primary" type="button" onClick={handleCreate}>
          <span aria-hidden="true">+</span> Create requirement
        </button>
      </header>

      {(pageError || feedback || currentListError) && (
        <div className={`requirement-message${pageError || currentListError ? " requirement-message--error" : ""}`} role={pageError || currentListError ? "alert" : "status"}>
          <p>{pageError || feedback || getRequirementErrorMessage(currentListError, "Could not refresh requirements. Showing the last loaded list.")}</p>
          {currentListError && <button className="requirement-text-button" type="button" onClick={refreshRequirements}>Retry</button>}
        </div>
      )}

      <RequirementFilters
        filters={draftFilters}
        onChange={setDraftFilters}
        onSubmit={applyFilters}
        onReset={resetFilters}
        hasFilters={hasActiveFilters(draftFilters)}
      />

      <div className="requirements-layout">
        <section className="requirement-panel requirement-list-panel" aria-labelledby="requirements-list-heading">
          <header className="requirement-panel__header">
            <div>
              <p className="requirement-eyebrow">PROJECT REQUIREMENTS</p>
              <h2 id="requirements-list-heading">All requirements <span className="requirement-count">{requirements.length}</span></h2>
            </div>
            <button className="requirement-text-button" type="button" onClick={refreshRequirements} disabled={isRefreshing}>
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </header>
          {isRefreshing && <p className="requirement-list-loading" role="status">Updating requirements…</p>}
          {requirements.length > 0 && (
            <RequirementList
              requirements={requirements}
              selectedRequirementId={currentSelectionId}
              onSelect={selectRequirement}
            />
          )}
          {!isRefreshing && !currentListError && requirements.length === 0 && filtered && (
            <div className="requirement-empty-state">
              <h3>No requirements match these filters</h3>
              <p>Try another status or priority, or reset the filters.</p>
              <button className="requirement-button requirement-button--quiet" type="button" onClick={resetFilters}>Reset filters</button>
            </div>
          )}
          {!isRefreshing && !currentListError && requirements.length === 0 && !filtered && (
            <div className="requirement-empty-state">
              <h3>No requirements yet</h3>
              <p>Add the first requirement for this project.</p>
              <button className="requirement-button requirement-button--quiet" type="button" onClick={handleCreate}>Create requirement</button>
            </div>
          )}
          {currentListError && requirements.length === 0 && (
            <div className="requirement-empty-state">
              <h3>Requirements could not be refreshed</h3>
              <p>Your previous list is unavailable. Retry to load it again.</p>
            </div>
          )}
        </section>

        <div className="requirements-detail-area">
          {formMode && (
            <RequirementForm
              key={formMode === "edit" ? editingRequirement.id : "new-requirement"}
              requirement={formMode === "edit" ? editingRequirement : null}
              onCancel={() => { setFormMode(null); setEditingRequirement(null); }}
              onSaved={handleSaved}
            />
          )}
          {!formMode && isDetailLoading && (
            <section className="requirement-panel requirement-detail-loading"><LoadingState label="Loading requirement details…" /></section>
          )}
          {!formMode && selectedDetailError && (
            <section className="requirement-panel requirement-detail-error" role="alert">
              <h2>Requirement details unavailable</h2>
              <p>{getRequirementErrorMessage(selectedDetailError, "Unable to load requirement details.")}</p>
              <button className="requirement-button requirement-button--quiet" type="button" onClick={() => setRefreshKey((key) => key + 1)}>Retry</button>
            </section>
          )}
          {!formMode && selectedDetail && (
            <RequirementDetails
              key={selectedDetail.id}
              requirement={selectedDetail}
              pendingAction={pendingAction}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          {!formMode && !currentSelectionId && requirements.length > 0 && (
            <section className="requirement-panel requirement-select-prompt">
              <h2>Select a requirement</h2>
              <p>Choose an item from the list to review its details.</p>
            </section>
          )}
          {!formMode && requirements.length === 0 && !isRefreshing && (
            <section className="requirement-panel requirement-select-prompt">
              <h2>Requirement details</h2>
              <p>Select a requirement to view its full description and metadata.</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}