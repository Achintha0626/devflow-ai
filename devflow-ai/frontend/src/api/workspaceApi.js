import apiClient from "./apiClient";

export async function listWorkspacesRequest() {
  const response = await apiClient.get("/workspaces");
  return response.data;
}

export async function getWorkspaceRequest(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}`);
  return response.data;
}