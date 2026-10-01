import apiClient from "./apiClient";

export async function getProjectDashboardRequest(workspaceId, projectId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/projects/${projectId}/dashboard`
  );
  return response.data;
}