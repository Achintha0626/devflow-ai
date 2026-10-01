import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { listWorkspaceProjectsRequest } from "../../api/projectApi";
import { getWorkspaceRequest } from "../../api/workspaceApi";
import { ErrorState, LoadingState } from "../../components/NavigationFeedback";
import "./NavigationPages.css";

export function ProjectSelectionPage() {
  const { workspaceId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

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

  return (
    <div className="navigation-page">
      <Link className="navigation-back" to="/app/workspaces">
        <span aria-hidden="true">←</span> All workspaces
      </Link>
      <header className="navigation-page__heading">
        <p className="navigation-page__eyebrow">WORKSPACE / PROJECTS</p>
        <h1>{workspace?.name || "Select a project"}</h1>
        <p>Choose a project to open its workspace.</p>
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
          <p>This workspace does not have any projects available to you.</p>
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
                  {project.key && <span className="navigation-item__key">{project.key}</span>}
                  {project.status && <span>{project.status.replaceAll("_", " ")}</span>}
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