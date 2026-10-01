import { Link } from "react-router-dom";
import { getErrorMessage } from "../utils/errorUtils";

export function LoadingState({ label }) {
  return (
    <div className="navigation-state" role="status" aria-live="polite">
      <span className="navigation-state__spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry, backTo, backLabel }) {
  const status = error?.response?.status;
  const message = status === 403
    ? "You do not have permission to view this page."
    : status === 404
      ? "This workspace or project is unavailable, or you do not have access."
      : getErrorMessage(error, "We could not load this page.");

  return (
    <section className="navigation-state navigation-state--error" role="alert">
      <h2>Unable to load</h2>
      <p>{message}</p>
      <div className="navigation-state__actions">
        {onRetry && (
          <button className="navigation-button" onClick={onRetry} type="button">
            Try again
          </button>
        )}
        <Link className="navigation-button navigation-button--quiet" to={backTo}>
          {backLabel}
        </Link>
      </div>
    </section>
  );
}