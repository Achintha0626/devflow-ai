import { getErrorMessage } from "../../utils/errorUtils";

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
export const TASK_TYPES = [
  "FRONTEND",
  "BACKEND",
  "DATABASE",
  "DEVOPS",
  "TESTING",
  "DESIGN",
  "DOCUMENTATION",
  "BUG",
  "OTHER",
];

export const STATUS_TRANSITIONS = {
  TODO: ["IN_PROGRESS"],
  IN_PROGRESS: ["TODO", "IN_REVIEW"],
  IN_REVIEW: ["IN_PROGRESS", "DONE"],
  DONE: ["IN_REVIEW"],
};

export function formatTaskLabel(value = "") {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatTaskDate(value, options = { dateStyle: "medium" }) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat(undefined, options).format(date);
}

export function getTaskErrorMessage(error, fallback = "The task request failed.") {
  const status = error?.response?.status;
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "This task or project is no longer available.";
  if (status === 409) {
    return getErrorMessage(error, "The task changed or the requested status transition is no longer valid.");
  }
  return getErrorMessage(error, fallback);
}

export function getTaskDisplayName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return name || user?.email || "Unassigned";
}

export function toDateInputValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function toTaskDate(value) {
  return value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null;
}