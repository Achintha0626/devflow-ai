import apiClient from "./apiClient";

export async function listWorkspacesRequest() {
  const response = await apiClient.get("/workspaces");
  return response.data;
}

export async function getWorkspaceRequest(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}`);
  return response.data;
}

export async function createWorkspaceRequest(payload) {
  const response = await apiClient.post("/workspaces", payload);
  return response.data;
}

export async function listWorkspaceMembersRequest(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}/members`);
  return response.data;
}

export async function addWorkspaceMemberRequest(workspaceId, payload) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/members`,
    payload
  );
  return response.data;
}

export async function changeWorkspaceMemberRoleRequest(
  workspaceId,
  memberId,
  payload
) {
  const response = await apiClient.patch(
    `/workspaces/${workspaceId}/members/${memberId}/role`,
    payload
  );
  return response.data;
}

export async function removeWorkspaceMemberRequest(workspaceId, memberId) {
  const response = await apiClient.delete(
    `/workspaces/${workspaceId}/members/${memberId}`
  );
  return response.data;
}