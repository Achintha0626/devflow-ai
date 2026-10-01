import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import { getProjectRequest } from "../api/projectApi";
import { getWorkspaceRequest } from "../api/workspaceApi";
import { ErrorState, LoadingState } from "../components/NavigationFeedback";
import "../pages/app/NavigationPages.css";

const futureSections = [
  "Sprints",
  "Requirements",
  "AI Planner",
  "Analytics",
];

export function ProjectLayout() {
  const { workspaceId, projectId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const projectsPath = `/app/workspaces/${workspaceId}/projects`;

  useEffect(() => {
    let active = true;

    async function loadProjectContext() {
      setIsLoading(true);
      setError(null);
      try {
        const [workspaceResponse, projectResponse] = await Promise.all([
          getWorkspaceRequest(workspaceId),
          getProjectRequest(workspaceId, projectId),
        ]);
        if (active) {
          setWorkspace(workspaceResponse.data.workspace);
          setProject(projectResponse.data);
        }
      } catch (requestError) {
        if (active) setError(requestError);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadProjectContext();
    return () => {
      active = false;
    };
  }, [workspaceId, projectId, reloadKey]);

  if (isLoading) return <LoadingState label="Opening project…" />;
  if (error) {
    return (
      <div className="project-layout__message">
        <ErrorState
          error={error}
          onRetry={() => setReloadKey((key) => key + 1)}
          backTo={projectsPath}
          backLabel="Back to projects"
        />
      </div>
    );
  }

  return (
    <div className="project-layout">
      <aside className="project-sidebar" aria-label="Project navigation">
        <Link className="project-sidebar__back" to={projectsPath}>
          <span aria-hidden="true">←</span> Projects
        </Link>
        <div className="project-sidebar__context">
          <span className="project-sidebar__workspace">{workspace.name}</span>
          <span className="project-sidebar__project">{project.name}</span>
          {project.key && <span className="project-sidebar__key">{project.key}</span>}
        </div>
        <nav className="project-nav">
          <NavLink
            className={({ isActive }) => `project-nav__link${isActive ? " is-active" : ""}`}
            end
            to={`/app/workspaces/${workspaceId}/projects/${projectId}`}
          >
            Overview
          </NavLink>
          <NavLink
            className={({ isActive }) => `project-nav__link${isActive ? " is-active" : ""}`}
            to={`/app/workspaces/${workspaceId}/projects/${projectId}/tasks`}
          >
            Tasks
          </NavLink>
          <NavLink
            className={({ isActive }) => `project-nav__link${isActive ? " is-active" : ""}`}
            to={`/app/workspaces/${workspaceId}/projects/${projectId}/kanban`}
          >
            Kanban
          </NavLink>
          {futureSections.map((section) => (
            <span className="project-nav__link project-nav__link--disabled" key={section}>
              {section}
              <span>Coming later</span>
            </span>
          ))}
        </nav>
      </aside>
      <section className="project-content">
        <div className="project-content__breadcrumb">
          <Link to="/app/workspaces">Workspaces</Link>
          <span aria-hidden="true">/</span>
          <Link to={projectsPath}>{workspace.name}</Link>
          <span aria-hidden="true">/</span>
          <span>{project.name}</span>
        </div>
        <Outlet context={{ workspace, project }} />
      </section>
    </div>
  );
}