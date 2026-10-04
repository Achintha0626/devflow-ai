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

  return (
    <section className="analytics-panel" aria-label={title}>
      <header className="analytics-panel__header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <span className="analytics-panel__total">{formatCount(safeTotal)}</span>
      </header>
      {safeTotal === 0 && <p className="analytics-empty-note">{emptyMessage}</p>}
      <ul className="analytics-distribution">
        {entries.map(([name, count]) => {
          const share = safePercent(count, safeTotal);
          return (
            <li className="analytics-distribution__row" key={name}>
              <div className="analytics-distribution__labels">
                <span>{formatLabel(name)}</span>
                <span>
                  {formatCount(count)}
                  <span className="analytics-distribution__share">{formatPercent(share)}</span>
                </span>
              </div>
              <ProgressTrack value={share} label={`${formatLabel(name)} share`} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
