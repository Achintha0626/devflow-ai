import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  PlusIcon,
  RefreshIcon,
  AlertCircleIcon,
  ArrowLeftIcon,
  RequirementsIcon,
} from "../../components/icons";
import "./RequirementsManagement.css";

const EMPTY_FILTERS = { status: "", priority: "" };

function getApiFilters(filters) {
  const result = {};
  if (filters.status) result.status = filters.status;
  if (filters.priority) result.priority = filters.priority;
  return result;
}

function hasActiveFilters(filters, searchQuery) {
  return Boolean(filters.status || filters.priority || searchQuery.trim());
}

export function RequirementsPage() {
  const { workspaceId, projectId } = useParams();
  const projectKey = `${workspaceId}:${projectId}`;
  const [requirements, setRequirements] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
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

  useEffect(() => {
    let active = true;
    const requestId = ++listRequestSequence.current;
    const requestProjectKey = `${workspaceId}:${projectId}`;

    async function loadRequirements() {
      try {
        const response = await listRequirementsRequest(
          workspaceId,
          projectId,
          getApiFilters(filters)
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
        if (active && requestId !== listRequestSequence.current) {
          setListRequestError({ projectKey: requestProjectKey, error });
        }
      } finally {
        if (active && requestId !== listRequestSequence.current) setIsRefreshing(false);
      }
    }

    loadRequirements();
    return () => { active = false; };
  }, [workspaceId, projectId, filters, refreshKey]);

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

  const displayedRequirements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return requirements;
    return requirements.filter((item) => {
      const matchTitle = item.title?.toLowerCase().includes(query);
      const matchDescription = item.description?.toLowerCase().includes(query);
      return matchTitle || matchDescription;
    });
  }, [requirements, searchQuery]);

  const isFilteringActive = hasActiveFilters(filters, searchQuery);

  const refreshRequirements = () => {
    setListRequestError(null);
    setIsRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setFilters(EMPTY_FILTERS);
    setPageError("");
    setFeedback("");
    setListRequestError(null);
    setIsRefreshing(true);
    setRefreshKey((key) => key + 1);
  };

  const selectRequirement = (requirementId) => {
    setSelectedRequirementId(requirementId);
    setSelectedProjectKey(projectKey);
    setPageError("");
    setFeedback("");
  };

  const handleCreate = () => {
    setEditingRequirement(null);
    setFormMode("create");
    setPageError("");
    setFeedback("");
  };

  const handleEdit = (requirement) => {
    setEditingRequirement(requirement);
    setFormMode("edit");
    setPageError("");
    setFeedback("");
  };

  const handleCancelForm = () => {
    setFormMode(null);
    setEditingRequirement(null);
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
      setSearchQuery("");
      setFilters(EMPTY_FILTERS);
    }
    setRequirements((current) => {
      const exists = current.some((item) => item.id === requirement.id);
      return exists
        ? current.map((item) => (item.id === requirement.id ? requirement : item))
        : [requirement, ...current];
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
          <AlertCircleIcon size={24} />
          <h1>Requirements could not be loaded</h1>
          <p>{getRequirementErrorMessage(currentInitialError, "Unable to load project requirements.")}</p>
          <div className="requirement-form__actions">
            <button className="requirement-button requirement-button--primary" type="button" onClick={refreshRequirements}>
              <RefreshIcon size={14} />
              <span>Retry</span>
            </button>
            <Link className="requirement-button requirement-button--quiet" to={`/app/workspaces/${workspaceId}/projects`}>
              <ArrowLeftIcon size={14} />
              <span>Back to projects</span>
            </Link>
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
          <p>Define product specifications, capture acceptance criteria, and plan engineering scopes.</p>
        </div>
        <div className="requirements-page__header-actions">
          <span className="requirements-count-pill">
            {requirements.length} {requirements.length === 1 ? "requirement" : "requirements"}
          </span>
          <button
            className="requirement-button requirement-button--quiet"
            type="button"
            onClick={refreshRequirements}
            disabled={isRefreshing}
          >
            <RefreshIcon size={14} />
            <span>{isRefreshing ? "Refreshing…" : "Refresh"}</span>
          </button>
          <button className="requirement-button requirement-button--primary" type="button" onClick={handleCreate}>
            <PlusIcon size={15} />
            <span>Create requirement</span>
          </button>
        </div>
      </header>

      {(pageError || feedback || currentListError) && (
        <div
          className={`requirement-message${pageError || currentListError ? " requirement-message--error" : ""}`}
          role={pageError || currentListError ? "alert" : "status"}
        >
          <div className="requirement-message__content">
            <AlertCircleIcon size={15} />
            <p>
              {pageError ||
                feedback ||
                getRequirementErrorMessage(currentListError, "Could not refresh requirements. Showing the last loaded list.")}
            </p>
          </div>
          {currentListError && (
            <button className="requirement-text-button" type="button" onClick={refreshRequirements}>
              Retry
            </button>
          )}
        </div>
      )}

      <RequirementFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        hasActiveFilters={isFilteringActive}
        totalCount={requirements.length}
        filteredCount={displayedRequirements.length}
      />

      <div className="requirements-layout">
        <section className="requirement-panel requirement-list-panel" aria-labelledby="requirements-list-heading">
          <header className="requirement-panel__header">
            <div>
              <p className="requirement-eyebrow">PROJECT REQUIREMENTS</p>
              <h2 id="requirements-list-heading">
                All requirements <span className="requirement-count">{displayedRequirements.length}</span>
              </h2>
            </div>
            {isFilteringActive && (
              <button
                className="requirement-text-button"
                type="button"
                onClick={handleResetFilters}
              >
                Clear filters
              </button>
            )}
          </header>

          {isRefreshing && <p className="requirement-list-loading" role="status">Updating requirements…</p>}

          {displayedRequirements.length > 0 && (
            <div className="requirement-list-scroll">
              <RequirementList
                requirements={displayedRequirements}
                selectedRequirementId={currentSelectionId}
                onSelect={selectRequirement}
              />
            </div>
          )}

          {!isRefreshing && !currentListError && displayedRequirements.length === 0 && isFilteringActive && (
            <div className="requirement-empty-state">
              <h3>No matching requirements</h3>
              <p>No requirements match your current search and filter settings.</p>
              <button className="requirement-button requirement-button--quiet" type="button" onClick={handleResetFilters}>
                Reset filters
              </button>
            </div>
          )}

          {!isRefreshing && !currentListError && requirements.length === 0 && !isFilteringActive && (
            <div className="requirement-empty-state">
              <div className="requirement-empty-icon">
                <RequirementsIcon size={32} />
              </div>
              <h3>No requirements yet</h3>
              <p>Draft the first product requirement to begin engineering planning.</p>
              <button className="requirement-button requirement-button--primary" type="button" onClick={handleCreate}>
                <PlusIcon size={14} />
                <span>Create requirement</span>
              </button>
            </div>
          )}

          {currentListError && displayedRequirements.length === 0 && (
            <div className="requirement-empty-state">
              <h3>Requirements could not be refreshed</h3>
              <p>Your previous list is unavailable. Retry to load it again.</p>
              <button className="requirement-button requirement-button--quiet" type="button" onClick={refreshRequirements}>
                Retry
              </button>
            </div>
          )}
        </section>

        <div className="requirements-detail-area">
          {isDetailLoading && (
            <section className="requirement-panel requirement-detail-loading">
              <LoadingState label="Loading requirement details…" />
            </section>
          )}

          {!isDetailLoading && selectedDetailError && (
            <section className="requirement-panel requirement-detail-error" role="alert">
              <AlertCircleIcon size={20} />
              <h2>Requirement details unavailable</h2>
              <p>{getRequirementErrorMessage(selectedDetailError, "Unable to load requirement details.")}</p>
              <button
                className="requirement-button requirement-button--quiet"
                type="button"
                onClick={() => setRefreshKey((key) => key + 1)}
              >
                <RefreshIcon size={13} />
                <span>Retry</span>
              </button>
            </section>
          )}

          {!isDetailLoading && selectedDetail && (
            <RequirementDetails
              key={selectedDetail.id}
              requirement={selectedDetail}
              workspaceId={workspaceId}
              projectId={projectId}
              pendingAction={pendingAction}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {!isDetailLoading && !selectedDetail && !selectedDetailError && requirements.length > 0 && (
            <section className="requirement-panel requirement-select-prompt">
              <div className="requirement-prompt-icon">
                <RequirementsIcon size={28} />
              </div>
              <h2>Select a requirement</h2>
              <p>Choose a requirement from the list to review its specification, status, and metadata.</p>
            </section>
          )}

          {!isDetailLoading && !selectedDetail && !selectedDetailError && requirements.length === 0 && (
            <section className="requirement-panel requirement-select-prompt">
              <div className="requirement-prompt-icon">
                <RequirementsIcon size={28} />
              </div>
              <h2>No requirement selected</h2>
              <p>Create a requirement to begin planning specifications and decomposing work into tasks.</p>
            </section>
          )}
        </div>
      </div>

      {formMode && (
        <div
          className="requirement-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) handleCancelForm();
          }}
          role="presentation"
        >
          <div
            className="requirement-modal-container"
            role="dialog"
            aria-modal="true"
            aria-labelledby="requirement-form-heading"
          >
            <RequirementForm
              key={formMode === "edit" ? editingRequirement.id : "new-requirement"}
              requirement={formMode === "edit" ? editingRequirement : null}
              onCancel={handleCancelForm}
              onSaved={handleSaved}
            />
          </div>
        </div>
      )}
    </div>
  );
}