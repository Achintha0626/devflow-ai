import apiClient from "./apiClient";

export async function listWorkspaceProjectsRequest(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}/projects`);
  return response.data;
}

export async function getProjectRequest(workspaceId, projectId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/projects/${projectId}`
  );
  return response.data;
}