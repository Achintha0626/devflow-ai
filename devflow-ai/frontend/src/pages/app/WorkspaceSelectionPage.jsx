import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listWorkspacesRequest } from "../../api/workspaceApi";
import { ErrorState, LoadingState } from "../../components/NavigationFeedback";
import "./NavigationPages.css";

export function WorkspaceSelectionPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

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

  return (
    <div className="navigation-page">
      <header className="navigation-page__heading">
        <p className="navigation-page__eyebrow">DEVFLOW AI / WORKSPACES</p>
        <h1>Select a workspace</h1>
        <p>Choose a workspace to view its projects.</p>
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
                  {workspace.role && <span>{workspace.role.replaceAll("_", " ")}</span>}
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}