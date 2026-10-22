import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  createProjectRequest,
  listWorkspaceProjectsRequest,
} from "../../api/projectApi";
import { getWorkspaceRequest } from "../../api/workspaceApi";
import { ErrorState, LoadingState } from "../../components/NavigationFeedback";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CloseIcon,
  PlusIcon,
  UserIcon,
} from "../../components/icons";
import "./NavigationPages.css";

export function ProjectSelectionPage() {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const mountedRef = useRef(true);
  const nameInputRef = useRef(null);

  const [workspace, setWorkspace] = useState(null);
  const [membership, setMembership] = useState(null);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadWorkspaceProjects() {
      setIsLoading(true);
      setError(null);
      try {
        const [workspaceResponse, projectsResponse] = await Promise.all([
          getWorkspaceRequest(workspaceId),
          listWorkspaceProjectsRequest(workspaceId),
        ]);
        if (active) {
          setWorkspace(workspaceResponse.data.workspace);
          setMembership(workspaceResponse.data.membership);
          setProjects(projectsResponse.data);
        }
      } catch (requestError) {
        if (active) setError(requestError);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadWorkspaceProjects();
    return () => {
      active = false;
    };
  }, [workspaceId, reloadKey]);

  const canCreateProject =
    membership?.role === "ADMIN" || membership?.role === "PROJECT_MANAGER";

  const handleOpenModal = useCallback(() => {
    setName("");
    setKey("");
    setKeyManuallyEdited(false);
    setDescription("");
    setStartDate("");
    setDeadline("");
    setValidationErrors({});
    setSubmitError(null);
    setIsCreateOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setIsCreateOpen(false);
    setName("");
    setKey("");
    setKeyManuallyEdited(false);
    setDescription("");
    setStartDate("");
    setDeadline("");
    setValidationErrors({});
    setSubmitError(null);
  }, [isSubmitting]);

  useEffect(() => {
    if (!isCreateOpen) return;

    const timer = setTimeout(() => {
      nameInputRef.current?.focus();
    }, 50);

    function handleKeyDown(event) {
      if (event.key === "Escape" && !isSubmitting) {
        handleCloseModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreateOpen, isSubmitting, handleCloseModal]);

  const handleNameChange = (event) => {
    const newName = event.target.value;
    setName(newName);
    if (validationErrors.name) {
      setValidationErrors((prev) => ({ ...prev, name: null }));
    }
    if (!keyManuallyEdited) {
      const cleaned = newName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 10);
      if (cleaned && /^[A-Z]/.test(cleaned)) {
        setKey(cleaned);
        if (validationErrors.key) {
          setValidationErrors((prev) => ({ ...prev, key: null }));
        }
      } else if (!newName.trim()) {
        setKey("");
      }
    }
  };

  const handleKeyChange = (event) => {
    setKeyManuallyEdited(true);
    const newKey = event.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 10);
    setKey(newKey);
    if (validationErrors.key) {
      setValidationErrors((prev) => ({ ...prev, key: null }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();
    const trimmedKey = key.trim();
    const trimmedDesc = description.trim();
    const errors = {};

    if (!trimmedName) {
      errors.name = "Project name is required.";
    } else if (trimmedName.length < 2) {
      errors.name = "Project name must be at least 2 characters.";
    } else if (trimmedName.length > 150) {
      errors.name = "Project name must not exceed 150 characters.";
    }

    if (!trimmedKey) {
      errors.key = "Project key is required.";
    } else if (!/^[A-Z][A-Z0-9]{1,9}$/.test(trimmedKey)) {
      errors.key =
        "Project key must be 2 to 10 uppercase letters or numbers starting with a letter.";
    }

    if (trimmedDesc.length > 1000) {
      errors.description = "Description must not exceed 1000 characters.";
    }

    if (startDate && deadline && deadline < startDate) {
      errors.deadline = "Deadline cannot be earlier than start date.";
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name: trimmedName,
        key: trimmedKey,
      };

      if (trimmedDesc) {
        payload.description = trimmedDesc;
      }

      if (startDate) {
        payload.startDate = startDate;
      }

      if (deadline) {
        payload.deadline = deadline;
      }

      const response = await createProjectRequest(workspaceId, payload);
      if (!mountedRef.current) return;

      const createdProject = response?.data;
      const newProjectId = createdProject?.id;

      if (createdProject && newProjectId) {
        setProjects((prev) => [
          createdProject,
          ...prev.filter((p) => p.id !== newProjectId),
        ]);
        handleCloseModal();
        navigate(`/app/workspaces/${workspaceId}/projects/${newProjectId}`);
      } else {
        setReloadKey((k) => k + 1);
        handleCloseModal();
      }
    } catch (err) {
      if (!mountedRef.current) return;

      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const backendFieldErrors = {};
        err.response.data.errors.forEach((issue) => {
          if (issue.field) {
            backendFieldErrors[issue.field] = issue.message;
          }
        });
        setValidationErrors(backendFieldErrors);
        setSubmitError(err.response.data.message || "Validation failed");
      } else {
        const message =
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "Failed to create project. Please try again.";
        setSubmitError(message);
      }
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="navigation-page">
      <Link className="navigation-back" to="/app/workspaces">
        <ArrowLeftIcon size={14} />
        <span>All workspaces</span>
      </Link>
      <header className="navigation-page__heading">
        <div className="navigation-page__header-row">
          <div>
            <p className="navigation-page__eyebrow">WORKSPACE / PROJECTS</p>
            <h1>{workspace?.name || "Select a project"}</h1>
            <p>
              Choose an active project to open its planning dashboard, Kanban
              board, and tasks.
            </p>
          </div>
          {!isLoading && !error && (
            <div className="navigation-page__header-actions" style={{ display: "flex", alignItems: "center", gap: "0.65rem", flexWrap: "wrap" }}>
              <Link
                to={`/app/workspaces/${workspaceId}/members`}
                className="navigation-button navigation-button--quiet"
                id="workspace-members-btn"
              >
                <UserIcon size={15} />
                <span>Workspace Members</span>
              </Link>
              {canCreateProject && projects.length > 0 && (
                <button
                  type="button"
                  className="navigation-button"
                  onClick={handleOpenModal}
                  id="create-project-btn"
                >
                  <PlusIcon size={16} />
                  <span>Create Project</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {isLoading && <LoadingState label="Loading projects…" />}
      {!isLoading && error && (
        <ErrorState
          error={error}
          onRetry={() => setReloadKey((key) => key + 1)}
          backTo="/app/workspaces"
          backLabel="All workspaces"
        />
      )}
      {!isLoading && !error && projects.length === 0 && (
        <section className="navigation-empty">
          <h2>No projects available</h2>
          <p>This workspace does not have any active projects available to you.</p>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
            {canCreateProject && (
              <button
                type="button"
                className="navigation-button navigation-empty__action"
                onClick={handleOpenModal}
                id="create-first-project-btn"
              >
                <PlusIcon size={16} />
                <span>Create Your First Project</span>
              </button>
            )}
            <Link
              to={`/app/workspaces/${workspaceId}/members`}
              className="navigation-button navigation-button--quiet navigation-empty__action"
            >
              <UserIcon size={15} />
              <span>Workspace Members</span>
            </Link>
          </div>
        </section>
      )}
      {!isLoading && !error && projects.length > 0 && (
        <ul className="navigation-list">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                className="navigation-item"
                to={`/app/workspaces/${workspaceId}/projects/${project.id}`}
              >
                <span className="navigation-item__body">
                  <span className="navigation-item__title">{project.name}</span>
                  {project.description && (
                    <span className="navigation-item__description">
                      {project.description}
                    </span>
                  )}
                </span>
                <span className="navigation-item__meta">
                  {project.key && (
                    <span className="navigation-item__key">{project.key}</span>
                  )}
                  {project.status && (
                    <span className="project-status">
                      {project.status.replaceAll("_", " ")}
                    </span>
                  )}
                  <ArrowRightIcon size={16} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isCreateOpen && (
        <div
          className="workspace-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              handleCloseModal();
            }
          }}
          role="presentation"
        >
          <div
            className="workspace-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-project-title"
            aria-describedby="create-project-desc"
          >
            <div className="workspace-modal__header">
              <div>
                <h2 id="create-project-title">Create Project</h2>
                <p id="create-project-desc">
                  Projects group requirements, sprints, tasks, and analytics.
                </p>
              </div>
              <button
                type="button"
                className="workspace-modal__close"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                aria-label="Close dialog"
              >
                <CloseIcon size={18} />
              </button>
            </div>

            {submitError && (
              <div className="workspace-form__error" role="alert">
                <AlertCircleIcon size={16} />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="workspace-form" noValidate>
              <div className="workspace-form__field">
                <label htmlFor="project-name">
                  <span>Project Name</span>
                  <span className="workspace-form__required" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  ref={nameInputRef}
                  id="project-name"
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. Core Platform, Mobile Application"
                  disabled={isSubmitting}
                  maxLength={150}
                  aria-invalid={Boolean(validationErrors.name)}
                  aria-describedby={
                    validationErrors.name
                      ? "project-name-error"
                      : "project-name-help"
                  }
                  required
                />
                <div className="workspace-form__field-meta">
                  <span id="project-name-help" className="workspace-form__hint">
                    2 to 150 characters
                  </span>
                  <span className="workspace-form__counter">
                    {name.length}/150
                  </span>
                </div>
                {validationErrors.name && (
                  <p
                    id="project-name-error"
                    className="workspace-form__field-error"
                    role="alert"
                  >
                    {validationErrors.name}
                  </p>
                )}
              </div>

              <div className="workspace-form__field">
                <label htmlFor="project-key">
                  <span>Project Key</span>
                  <span className="workspace-form__required" aria-hidden="true">
                    *
                  </span>
                </label>
                <input
                  id="project-key"
                  type="text"
                  value={key}
                  onChange={handleKeyChange}
                  placeholder="e.g. CORE, MOB"
                  disabled={isSubmitting}
                  maxLength={10}
                  aria-invalid={Boolean(validationErrors.key)}
                  aria-describedby={
                    validationErrors.key
                      ? "project-key-error"
                      : "project-key-help"
                  }
                  required
                />
                <div className="workspace-form__field-meta">
                  <span id="project-key-help" className="workspace-form__hint">
                    2 to 10 uppercase letters or numbers (starts with a letter)
                  </span>
                  <span className="workspace-form__counter">
                    {key.length}/10
                  </span>
                </div>
                {validationErrors.key && (
                  <p
                    id="project-key-error"
                    className="workspace-form__field-error"
                    role="alert"
                  >
                    {validationErrors.key}
                  </p>
                )}
              </div>

              <div className="workspace-form__field">
                <label htmlFor="project-description">
                  <span>Description</span>
                  <span className="workspace-form__optional">(optional)</span>
                </label>
                <textarea
                  id="project-description"
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (validationErrors.description) {
                      setValidationErrors((prev) => ({
                        ...prev,
                        description: null,
                      }));
                    }
                  }}
                  placeholder="Brief description of project goals and scope"
                  disabled={isSubmitting}
                  maxLength={1000}
                  aria-invalid={Boolean(validationErrors.description)}
                  aria-describedby={
                    validationErrors.description
                      ? "project-desc-error"
                      : "project-desc-help"
                  }
                />
                <div className="workspace-form__field-meta">
                  <span id="project-desc-help" className="workspace-form__hint">
                    Maximum 1000 characters
                  </span>
                  <span
                    className={`workspace-form__counter ${
                      description.length >= 1000
                        ? "workspace-form__counter--limit"
                        : ""
                    }`}
                  >
                    {description.length}/1000
                  </span>
                </div>
                {validationErrors.description && (
                  <p
                    id="project-desc-error"
                    className="workspace-form__field-error"
                    role="alert"
                  >
                    {validationErrors.description}
                  </p>
                )}
              </div>

              <div className="workspace-form__row">
                <div className="workspace-form__field">
                  <label htmlFor="project-start-date">
                    <span>Start Date</span>
                    <span className="workspace-form__optional">(optional)</span>
                  </label>
                  <input
                    id="project-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (validationErrors.deadline) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          deadline: null,
                        }));
                      }
                    }}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="workspace-form__field">
                  <label htmlFor="project-deadline">
                    <span>Deadline</span>
                    <span className="workspace-form__optional">(optional)</span>
                  </label>
                  <input
                    id="project-deadline"
                    type="date"
                    value={deadline}
                    onChange={(e) => {
                      setDeadline(e.target.value);
                      if (validationErrors.deadline) {
                        setValidationErrors((prev) => ({
                          ...prev,
                          deadline: null,
                        }));
                      }
                    }}
                    disabled={isSubmitting}
                    aria-invalid={Boolean(validationErrors.deadline)}
                    aria-describedby={
                      validationErrors.deadline ? "project-deadline-error" : undefined
                    }
                  />
                  {validationErrors.deadline && (
                    <p
                      id="project-deadline-error"
                      className="workspace-form__field-error"
                      role="alert"
                    >
                      {validationErrors.deadline}
                    </p>
                  )}
                </div>
              </div>

              <div className="workspace-modal__actions">
                <button
                  type="button"
                  className="navigation-button navigation-button--quiet"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="navigation-button"
                  disabled={isSubmitting}
                  id="submit-create-project"
                >
                  {isSubmitting ? (
                    <>
                      <span className="workspace-spinner" aria-hidden="true" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    <>
                      <PlusIcon size={16} />
                      <span>Create Project</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}