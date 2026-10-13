import { clampProgress, formatCount, formatLabel, formatPercent, safePercent } from "./analyticsUtils";

function ProgressTrack({ value, label }) {
  const percentage = clampProgress(value);
  return (
    <div
      className="analytics-progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
    >
      <span className="analytics-progress__fill" style={{ width: `${percentage}%` }} />
    </div>
  );
}

export function DistributionCard({ title, description, distribution, total, emptyMessage }) {
  const entries = Object.entries(distribution || {});
  const safeTotal = Number.isFinite(total) ? total : 0;
  const isEmpty = safeTotal === 0 || entries.length === 0;

  return (
    <section className="analytics-panel analytics-distribution-card" aria-label={title}>
      <header className="analytics-panel__header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <span className="analytics-panel__total">{formatCount(safeTotal)}</span>
      </header>
      {isEmpty ? (
        <p className="analytics-empty-note">{emptyMessage}</p>
      ) : (
        <ul className="analytics-distribution">
          {entries.map(([name, count]) => {
            const safeCount = Number.isFinite(count) ? count : 0;
            const share = safePercent(safeCount, safeTotal);
            return (
              <li className="analytics-distribution__row" key={name}>
                <div className="analytics-distribution__labels">
                  <span className="analytics-distribution__name">{formatLabel(name)}</span>
                  <span className="analytics-distribution__count-wrap">
                    <span className="analytics-distribution__count">{formatCount(safeCount)}</span>
                    <span className="analytics-distribution__share">{formatPercent(share)}</span>
                  </span>
                </div>
                <ProgressTrack value={share} label={`${formatLabel(name)} share`} />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
