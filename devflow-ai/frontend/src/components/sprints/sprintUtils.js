import { getErrorMessage } from "../../utils/errorUtils";
import { formatTaskDate, formatTaskLabel, getTaskDisplayName, toDateInputValue, toTaskDate } from "../tasks/taskUtils";

export const SPRINT_STATUSES = ["PLANNED", "ACTIVE", "COMPLETED", "CANCELLED"];

export { formatTaskDate, formatTaskLabel, getTaskDisplayName, toDateInputValue, toTaskDate };

export function getSprintErrorMessage(error, fallback = "The sprint request failed.") {
  const validationIssues = error?.response?.data?.errors;
  if (Array.isArray(validationIssues) && validationIssues.length > 0) {
    return validationIssues.map(({ field, message }) => `${field || "Request"}: ${message}`).join(" ");
  }
  return getErrorMessage(error, fallback);
}

export function getSprintDates(sprint) {
  return {
    startDate: toDateInputValue(sprint?.startDate),
    endDate: toDateInputValue(sprint?.endDate),
  };
}