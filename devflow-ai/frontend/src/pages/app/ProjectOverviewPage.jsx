import { useOutletContext } from "react-router-dom";
import "./NavigationPages.css";

export function ProjectOverviewPage() {
  const { project } = useOutletContext();

  return (
    <div className="project-overview">
      <header className="project-overview__heading">
        <p className="navigation-page__eyebrow">PROJECT OVERVIEW</p>
        <h1>{project.name}</h1>
        <p>Project information</p>
      </header>
      <dl className="project-details">
        {project.key && (
          <div className="project-details__row">
            <dt>Project key</dt>
            <dd>{project.key}</dd>
          </div>
        )}
        {project.status && (
          <div className="project-details__row">
            <dt>Status</dt>
            <dd><span className="project-status">{project.status.replaceAll("_", " ")}</span></dd>
          </div>
        )}
        {project.description && (
          <div className="project-details__row project-details__row--description">
            <dt>Description</dt>
            <dd>{project.description}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}