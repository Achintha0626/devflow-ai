import { getErrorMessage } from "../../utils/errorUtils";
import { formatTaskDate } from "../tasks/taskUtils";

export const AI_SUGGESTION_TYPES = [
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

export const AI_SUGGESTION_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const AI_SUGGESTION_STATUSES = ["APPROVED", "REJECTED", "EDITED"];

export function formatCreatorName(user) {
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  return name || user?.email || "Unknown user";
}

export function formatSuggestionStatus(value) {
  return value ? value.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()) : "Pending review";
}

export function getAiPlannerErrorMessage(error, fallback = "The AI planner request failed.") {
  const status = error?.response?.status;
  if (status === 403) return "Project management permission is required to generate or review AI suggestions.";
  if (status === 404) return "This requirement, generation, or suggestion is no longer available.";
  if (status === 502) return "AI suggestion generation failed. Please try again later.";
  return getErrorMessage(error, fallback);
}

export function parseSuggestionFormValues(suggestion) {
  return {
    title: suggestion?.title || "",
    description: suggestion?.description || "",
    type: suggestion?.type || "FRONTEND",
    priority: suggestion?.priority || "MEDIUM",
    complexity: suggestion?.complexity || "",
    estimatedStoryPoints: suggestion?.estimatedStoryPoints ?? 3,
    acceptanceCriteria: Array.isArray(suggestion?.acceptanceCriteria) && suggestion.acceptanceCriteria.length
      ? suggestion.acceptanceCriteria.slice()
      : [""],
  };
}

export function sortSuggestionCriteria(list) {
  return Array.isArray(list) ? list.map((item) => String(item).trim()).filter(Boolean) : [];
}

export function formatSuggestionDate(value) {
  return formatTaskDate(value, { dateStyle: "medium", timeStyle: "short" });
}

export function isConvertibleStatus(status) {
  return status === "APPROVED" || status === "EDITED";
}
