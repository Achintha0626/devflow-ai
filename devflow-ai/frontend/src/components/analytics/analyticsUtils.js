export function formatCount(value) {
  return new Intl.NumberFormat().format(value ?? 0);
}

export function formatPercent(value) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(safe)}%`;
}

export function formatLabel(value) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

export function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function formatActivityTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function getMemberName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return name || user?.email || "Unnamed member";
}

export function safePercent(numerator, denominator) {
  if (!denominator || denominator === 0) return 0;
  const raw = (numerator / denominator) * 100;
  return Number.isFinite(raw) ? raw : 0;
}

export function clampProgress(value) {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
}
