import apiClient from "./apiClient";

const requirementPath = (workspaceId, projectId) =>
  `/workspaces/${workspaceId}/projects/${projectId}/requirements`;

export async function listRequirementsRequest(workspaceId, projectId, filters = {}) {
  const response = await apiClient.get(requirementPath(workspaceId, projectId), {
    params: filters,
  });
  return response.data;
}

export async function getRequirementRequest(workspaceId, projectId, requirementId) {
  const response = await apiClient.get(
    `${requirementPath(workspaceId, projectId)}/${requirementId}`
  );
  return response.data;
}

export async function createRequirementRequest(workspaceId, projectId, requirement) {
  const response = await apiClient.post(
    requirementPath(workspaceId, projectId),
    requirement
  );
  return response.data;
}

export async function updateRequirementRequest(workspaceId, projectId, requirementId, requirement) {
  const response = await apiClient.patch(
    `${requirementPath(workspaceId, projectId)}/${requirementId}`,
    requirement
  );
  return response.data;
}

export async function deleteRequirementRequest(workspaceId, projectId, requirementId) {
  const response = await apiClient.delete(
    `${requirementPath(workspaceId, projectId)}/${requirementId}`
  );
  return response.data;
}