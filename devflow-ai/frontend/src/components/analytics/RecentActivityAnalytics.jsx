import { formatActivityTime, formatCount, formatLabel, getMemberName } from "./analyticsUtils";

function formatActivityValue(value) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function shouldShowChange(oldValue, newValue) {
  const old = formatActivityValue(oldValue);
  const next = formatActivityValue(newValue);
  return old !== null || next !== null;
}

export function RecentActivityAnalytics({ activities }) {
  return (
    <section className="analytics-panel" aria-label="Recent activity">
      <header className="analytics-panel__header">
        <div>
          <h2>Recent activity</h2>
          <p>Latest task activity in this project</p>
        </div>
        <span className="analytics-panel__total">{formatCount(activities.length)}</span>
      </header>
      {activities.length === 0 ? (
        <p className="analytics-empty-note">No recent activity.</p>
      ) : (
        <ol className="analytics-activity-list">
          {activities.map((activity) => {
            const actor = getMemberName(activity.actor);
            const taskLabel = activity.task?.taskNumber || activity.task?.title;
            const showChange = activity.field && shouldShowChange(activity.oldValue, activity.newValue);
            const oldDisplay = formatActivityValue(activity.oldValue);
            const newDisplay = formatActivityValue(activity.newValue);

            return (
              <li className="analytics-activity" key={activity.id}>
                <div className="analytics-activity__marker" aria-hidden="true" />
                <div>
                  <p className="analytics-activity__summary">
                    <strong>{actor}</strong>
                    {" "}
                    {formatLabel(activity.type).toLowerCase()}
                    {taskLabel && (
                      <>
                        {" · "}
                        <strong>{taskLabel}</strong>
                      </>
                    )}
                  </p>
                  {showChange && (
                    <p className="analytics-activity__change">
                      {activity.field.replaceAll("_", " ")}
                      {(oldDisplay !== null || newDisplay !== null) && (
                        <>
                          {": "}
                          {oldDisplay ?? "None"}
                          {" \u2192 "}
                          {newDisplay ?? "None"}
                        </>
                      )}
                    </p>
                  )}
                  <time className="analytics-activity__time" dateTime={activity.createdAt}>
                    {formatActivityTime(activity.createdAt)}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
