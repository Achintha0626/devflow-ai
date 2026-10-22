import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useParams, useLocation } from "react-router-dom";
import { getProjectRequest } from "../api/projectApi";
import { getWorkspaceRequest } from "../api/workspaceApi";
import { ErrorState, LoadingState } from "../components/NavigationFeedback";
import {
  OverviewIcon,
  TasksIcon,
  KanbanIcon,
  SprintsIcon,
  RequirementsIcon,
  AIPlannerIcon,
  AnalyticsIcon,
  UserIcon,
  ArrowLeftIcon,
  ChevronRightIcon,
  MenuIcon,
  CloseIcon,
} from "../components/icons";
import "../pages/app/NavigationPages.css";

const futureSections = [];

export function ProjectLayout() {
  const { workspaceId, projectId } = useParams();
  const location = useLocation();
  const [workspace, setWorkspace] = useState(null);
  const [membership, setMembership] = useState(null);
  const [project, setProject] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
          setMembership(workspaceResponse.data.membership);
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

  const [prevPathname, setPrevPathname] = useState(location.pathname);
  if (prevPathname !== location.pathname) {
    setPrevPathname(location.pathname);
    if (mobileNavOpen) {
      setMobileNavOpen(false);
    }
  }

  const closeMobileNav = () => {
    if (mobileNavOpen) {
      setMobileNavOpen(false);
    }
  };

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

  const navItems = [
    {
      to: `/app/workspaces/${workspaceId}/projects/${projectId}`,
      label: "Overview",
      icon: OverviewIcon,
      end: true,
    },
    {
      to: `/app/workspaces/${workspaceId}/projects/${projectId}/tasks`,
      label: "Tasks",
      icon: TasksIcon,
    },
    {
      to: `/app/workspaces/${workspaceId}/projects/${projectId}/kanban`,
      label: "Kanban",
      icon: KanbanIcon,
    },
    {
      to: `/app/workspaces/${workspaceId}/projects/${projectId}/sprints`,
      label: "Sprints",
      icon: SprintsIcon,
    },
    {
      to: `/app/workspaces/${workspaceId}/projects/${projectId}/requirements`,
      label: "Requirements",
      icon: RequirementsIcon,
    },
    {
      to: `/app/workspaces/${workspaceId}/projects/${projectId}/ai-planner`,
      label: "AI Planner",
      icon: AIPlannerIcon,
      highlight: true,
    },
    {
      to: `/app/workspaces/${workspaceId}/projects/${projectId}/analytics`,
      label: "Analytics",
      icon: AnalyticsIcon,
    },
    {
      to: `/app/workspaces/${workspaceId}/projects/${projectId}/members`,
      label: "Members",
      icon: UserIcon,
    },
  ];

  return (
    <div className="project-layout">
      <div className="project-mobile-bar">
        <button
          type="button"
          className="project-mobile-toggle"
          onClick={() => setMobileNavOpen((open) => !open)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileNavOpen}
          aria-controls="project-sidebar"
        >
          {mobileNavOpen ? <CloseIcon size={18} /> : <MenuIcon size={18} />}
          <span className="project-mobile-title" title={project.name}>{project.name}</span>
        </button>
        {project.key && <span className="project-sidebar__key">{project.key}</span>}
      </div>

      <aside
        id="project-sidebar"
        className={`project-sidebar${mobileNavOpen ? " is-mobile-open" : ""}`}
        aria-label="Project navigation"
      >
        <div className="project-sidebar__top">
          <Link
            className="project-sidebar__back"
            to={projectsPath}
            title="Back to projects"
            onClick={closeMobileNav}
          >
            <ArrowLeftIcon size={14} />
            <span>All projects</span>
          </Link>
        </div>

        <div className="project-sidebar__context">
          <span className="project-sidebar__workspace" title={workspace.name}>{workspace.name}</span>
          <div className="project-sidebar__project-heading">
            <span className="project-sidebar__project" title={project.name}>{project.name}</span>
            {project.key && <span className="project-sidebar__key">{project.key}</span>}
          </div>
          {project.status && (
            <span className="project-status project-status--subtle">
              <span className={`project-status__dot project-status__dot--${project.status.toLowerCase()}`} aria-hidden="true" />
              <span>{project.status.replaceAll("_", " ")}</span>
            </span>
          )}
        </div>

        <nav className="project-nav">
          <div className="project-nav__group-label">WORKSPACE VIEWS</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  `project-nav__link${isActive ? " is-active" : ""}${
                    item.highlight ? " project-nav__link--ai" : ""
                  }`
                }
                end={item.end}
                to={item.to}
                onClick={closeMobileNav}
              >
                <span className="project-nav__icon-wrapper">
                  <Icon size={16} />
                </span>
                <span className="project-nav__link-text">{item.label}</span>
                {item.highlight && <span className="project-nav__pill">AI</span>}
              </NavLink>
            );
          })}
          {futureSections.map((section) => (
            <span className="project-nav__link project-nav__link--disabled" key={section}>
              <span className="project-nav__link-text">{section}</span>
              <span>Coming later</span>
            </span>
          ))}
        </nav>
      </aside>

      {mobileNavOpen && (
        <div
          className="project-sidebar-backdrop"
          onClick={closeMobileNav}
          aria-hidden="true"
        />
      )}

      <section className="project-content">
        <div className="project-content__breadcrumb">
          <Link to="/app/workspaces">Workspaces</Link>
          <ChevronRightIcon size={12} className="project-content__breadcrumb-separator" />
          <Link to={projectsPath} title={workspace.name}>{workspace.name}</Link>
          <ChevronRightIcon size={12} className="project-content__breadcrumb-separator" />
          <span className="project-content__breadcrumb-current" title={project.name}>{project.name}</span>
        </div>
        <Outlet context={{ workspace, project, membership }} />
      </section>
    </div>
  );
}