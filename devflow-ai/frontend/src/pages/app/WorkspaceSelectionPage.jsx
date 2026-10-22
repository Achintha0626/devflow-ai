import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createWorkspaceRequest, listWorkspacesRequest } from "../../api/workspaceApi";
import { ErrorState, LoadingState } from "../../components/NavigationFeedback";
import {
  AlertCircleIcon,
  ArrowRightIcon,
  CloseIcon,
  PlusIcon,
} from "../../components/icons";
import "./NavigationPages.css";

export function WorkspaceSelectionPage() {
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const nameInputRef = useRef(null);

  const [workspaces, setWorkspaces] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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

    async function loadWorkspaces() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await listWorkspacesRequest();
        if (active) setWorkspaces(response.data);
      } catch (requestError) {
        if (active) setError(requestError);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadWorkspaces();
    return () => {
      active = false;
    };
  }, [reloadKey]);

  const handleOpenModal = useCallback(() => {
    setName("");
    setDescription("");
    setValidationErrors({});
    setSubmitError(null);
    setIsCreateOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    if (isSubmitting) return;
    setIsCreateOpen(false);
    setName("");
    setDescription("");
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    const errors = {};

    if (!trimmedName) {
      errors.name = "Workspace name is required.";
    } else if (trimmedName.length < 2) {
      errors.name = "Workspace name must be at least 2 characters.";
    } else if (trimmedName.length > 100) {
      errors.name = "Workspace name must not exceed 100 characters.";
    }

    if (trimmedDesc.length > 500) {
      errors.description = "Description must not exceed 500 characters.";
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
        ...(trimmedDesc ? { description: trimmedDesc } : {}),
      };

      const response = await createWorkspaceRequest(payload);
      if (!mountedRef.current) return;

      const createdWorkspace = response?.data?.workspace || response?.data;
      const membership = response?.data?.membership;
      const workspaceId = createdWorkspace?.id;

      if (createdWorkspace && workspaceId) {
        const fullWorkspace = {
          ...createdWorkspace,
          role: membership?.role || "ADMIN",
          joinedAt: membership?.joinedAt || new Date().toISOString(),
        };

        setWorkspaces((prev) => [
          fullWorkspace,
          ...prev.filter((w) => w.id !== workspaceId),
        ]);
        handleCloseModal();
        navigate(`/app/workspaces/${workspaceId}/projects`);
      } else {
        setReloadKey((key) => key + 1);
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
          "Failed to create workspace. Please try again.";
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
      <header className="navigation-page__heading">
        <div className="navigation-page__header-row">
          <div>
            <p className="navigation-page__eyebrow">DEVFLOW AI / WORKSPACES</p>
            <h1>Select a workspace</h1>
            <p>Choose an engineering workspace to access its projects, tasks, and sprints.</p>
          </div>
          {!isLoading && !error && workspaces.length > 0 && (
            <button
              type="button"
              className="navigation-button"
              onClick={handleOpenModal}
              id="create-workspace-btn"
            >
              <PlusIcon size={16} />
              <span>Create Workspace</span>
            </button>
          )}
        </div>
      </header>

      {isLoading && <LoadingState label="Loading your workspaces…" />}
      {!isLoading && error && (
        <ErrorState
          error={error}
          onRetry={() => setReloadKey((key) => key + 1)}
          backTo="/app/workspaces"
          backLabel="Workspaces"
        />
      )}
      {!isLoading && !error && workspaces.length === 0 && (
        <section className="navigation-empty">
          <h2>No workspaces yet</h2>
          <p>You do not currently belong to any workspaces.</p>
          <button
            type="button"
            className="navigation-button navigation-empty__action"
            onClick={handleOpenModal}
            id="create-first-workspace-btn"
          >
            <PlusIcon size={16} />
            <span>Create Your First Workspace</span>
          </button>
        </section>
      )}
      {!isLoading && !error && workspaces.length > 0 && (
        <ul className="navigation-list">
          {workspaces.map((workspace) => (
            <li key={workspace.id}>
              <Link
                className="navigation-item"
                to={`/app/workspaces/${workspace.id}/projects`}
              >
                <span className="navigation-item__body">
                  <span className="navigation-item__title">{workspace.name}</span>
                  {workspace.description && (
                    <span className="navigation-item__description">
                      {workspace.description}
                    </span>
                  )}
                </span>
                <span className="navigation-item__meta">
                  {workspace.role && (
                    <span className="navigation-item__role">
                      {workspace.role.replaceAll("_", " ")}
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
            aria-labelledby="create-workspace-title"
            aria-describedby="create-workspace-desc"
          >
            <div className="workspace-modal__header">
              <div>
                <h2 id="create-workspace-title">Create Workspace</h2>
                <p id="create-workspace-desc">
                  Workspaces organize your team projects, boards, and requirements.
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
                <label htmlFor="workspace-name">
                  <span>Workspace Name</span>
                  <span className="workspace-form__required" aria-hidden="true">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="workspace-name"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (validationErrors.name) {
                      setValidationErrors((prev) => ({ ...prev, name: null }));
                    }
                  }}
                  placeholder="e.g. Core Engineering, Mobile App"
                  disabled={isSubmitting}
                  maxLength={100}
                  aria-invalid={Boolean(validationErrors.name)}
                  aria-describedby={
                    validationErrors.name
                      ? "workspace-name-error"
                      : "workspace-name-help"
                  }
                  required
                />
                <div className="workspace-form__field-meta">
                  <span id="workspace-name-help" className="workspace-form__hint">
                    2 to 100 characters
                  </span>
                  <span className="workspace-form__counter">
                    {name.length}/100
                  </span>
                </div>
                {validationErrors.name && (
                  <p
                    id="workspace-name-error"
                    className="workspace-form__field-error"
                    role="alert"
                  >
                    {validationErrors.name}
                  </p>
                )}
              </div>

              <div className="workspace-form__field">
                <label htmlFor="workspace-description">
                  <span>Description</span>
                  <span className="workspace-form__optional">(optional)</span>
                </label>
                <textarea
                  id="workspace-description"
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (validationErrors.description) {
                      setValidationErrors((prev) => ({ ...prev, description: null }));
                    }
                  }}
                  placeholder="Brief description of what this workspace is used for"
                  disabled={isSubmitting}
                  maxLength={500}
                  aria-invalid={Boolean(validationErrors.description)}
                  aria-describedby={
                    validationErrors.description
                      ? "workspace-desc-error"
                      : "workspace-desc-help"
                  }
                />
                <div className="workspace-form__field-meta">
                  <span id="workspace-desc-help" className="workspace-form__hint">
                    Maximum 500 characters
                  </span>
                  <span
                    className={`workspace-form__counter ${
                      description.length >= 500
                        ? "workspace-form__counter--limit"
                        : ""
                    }`}
                  >
                    {description.length}/500
                  </span>
                </div>
                {validationErrors.description && (
                  <p
                    id="workspace-desc-error"
                    className="workspace-form__field-error"
                    role="alert"
                  >
                    {validationErrors.description}
                  </p>
                )}
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
                  id="submit-create-workspace"
                >
                  {isSubmitting ? (
                    <>
                      <span className="workspace-spinner" aria-hidden="true" />
                      <span>Creating…</span>
                    </>
                  ) : (
                    <>
                      <PlusIcon size={16} />
                      <span>Create Workspace</span>
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