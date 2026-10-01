import { getErrorMessage } from "../../utils/errorUtils";
import { formatTaskDate, formatTaskLabel } from "../tasks/taskUtils";

export const REQUIREMENT_STATUSES = [
  "DRAFT",
  "READY",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export const REQUIREMENT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export { formatTaskDate, formatTaskLabel };

export function formatCreatorName(creator) {
  const name = [creator?.firstName, creator?.lastName].filter(Boolean).join(" ");
  return name || creator?.email || "Unknown creator";
}

export function getRequirementErrorMessage(error, fallback = "The requirement request failed.") {
  const status = error?.response?.status;
  if (status === 403) return "You do not have permission to manage requirements in this project.";
  if (status === 404) return "This requirement or project is no longer available.";

  const validationErrors = error?.response?.data?.errors;
  if (status === 400 && Array.isArray(validationErrors) && validationErrors.length > 0) {
    return validationErrors
      .map(({ field, message }) => `${field ? `${field}: ` : ""}${message}`)
      .join(" ");
  }

  return getErrorMessage(error, fallback);
}