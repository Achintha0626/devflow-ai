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
  const activityList = activities || [];

  return (
    <section className="analytics-panel analytics-activity-panel" aria-label="Recent activity">
      <header className="analytics-panel__header">
        <div>
          <h2>Recent activity</h2>
          <p>Latest task updates and changes in this project</p>
        </div>
        <span className="analytics-panel__total">{formatCount(activityList.length)}</span>
      </header>
      {activityList.length === 0 ? (
        <p className="analytics-empty-note">No recent activity.</p>
      ) : (
        <ol className="analytics-activity-list">
          {activityList.map((activity) => {
            const actor = getMemberName(activity.actor);
            const taskLabel = activity.task?.taskNumber ? `#${activity.task.taskNumber}` : activity.task?.title;
            const showChange = activity.field && shouldShowChange(activity.oldValue, activity.newValue);
            const oldDisplay = formatActivityValue(activity.oldValue);
            const newDisplay = formatActivityValue(activity.newValue);

            return (
              <li className="analytics-activity" key={activity.id}>
                <div className="analytics-activity__marker" aria-hidden="true" />
                <div className="analytics-activity__body">
                  <div className="analytics-activity__top-row">
                    <p className="analytics-activity__summary">
                      <strong>{actor}</strong>
                      {" "}
                      <span>{formatLabel(activity.type).toLowerCase()}</span>
                      {taskLabel && (
                        <>
                          {" · "}
                          <span className="analytics-activity__task-label">{taskLabel}</span>
                        </>
                      )}
                    </p>
                    <time className="analytics-activity__time" dateTime={activity.createdAt}>
                      {formatActivityTime(activity.createdAt)}
                    </time>
                  </div>
                  {showChange && (
                    <div className="analytics-activity__change">
                      <span className="analytics-activity__field">{activity.field.replaceAll("_", " ")}</span>
                      {(oldDisplay !== null || newDisplay !== null) && (
                        <span className="analytics-activity__values">
                          <span className="analytics-activity__val">{oldDisplay ?? "None"}</span>
                          <span className="analytics-activity__arrow" aria-hidden="true">{"\u2192"}</span>
                          <span className="analytics-activity__val">{newDisplay ?? "None"}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
