import apiClient from "./apiClient";

const generationPath = (workspaceId, projectId, requirementId) =>
  `/workspaces/${workspaceId}/projects/${projectId}/requirements/${requirementId}/ai`;

export async function generateSuggestionsRequest(workspaceId, projectId, requirementId) {
  const response = await apiClient.post(
    `${generationPath(workspaceId, projectId, requirementId)}/generate`
  );
  return response.data;
}

export async function listGenerationsRequest(workspaceId, projectId, requirementId) {
  const response = await apiClient.get(
    `${generationPath(workspaceId, projectId, requirementId)}/generations`
  );
  return response.data;
}

export async function getGenerationRequest(workspaceId, projectId, requirementId, generationId) {
  const response = await apiClient.get(
    `${generationPath(workspaceId, projectId, requirementId)}/generations/${generationId}`
  );
  return response.data;
}

export async function reviewSuggestionRequest(workspaceId, projectId, requirementId, suggestionId, changes) {
  const response = await apiClient.patch(
    `${generationPath(workspaceId, projectId, requirementId)}/suggestions/${suggestionId}`,
    changes
  );
  return response.data;
}

export async function convertSuggestionToTaskRequest(
  workspaceId,
  projectId,
  requirementId,
  suggestionId,
  payload = {}
) {
  const response = await apiClient.post(
    `${generationPath(workspaceId, projectId, requirementId)}/suggestions/${suggestionId}/task`,
    payload
  );
  return response.data;
}
