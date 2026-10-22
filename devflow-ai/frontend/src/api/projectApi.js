import apiClient from "./apiClient";

export async function listWorkspaceProjectsRequest(workspaceId) {
  const response = await apiClient.get(`/workspaces/${workspaceId}/projects`);
  return response.data;
}

export async function createProjectRequest(workspaceId, payload) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/projects`,
    payload
  );
  return response.data;
}

export async function getProjectRequest(workspaceId, projectId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/projects/${projectId}`
  );
  return response.data;
}

export async function listProjectMembersRequest(workspaceId, projectId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/projects/${projectId}/members`
  );
  return response.data;
}

export async function addProjectMemberRequest(workspaceId, projectId, payload) {
  const response = await apiClient.post(
    `/workspaces/${workspaceId}/projects/${projectId}/members`,
    payload
  );
  return response.data;
}

export async function changeProjectMemberRoleRequest(
  workspaceId,
  projectId,
  memberId,
  payload
) {
  const response = await apiClient.patch(
    `/workspaces/${workspaceId}/projects/${projectId}/members/${memberId}/role`,
    payload
  );
  return response.data;
}

export async function removeProjectMemberRequest(
  workspaceId,
  projectId,
  memberId
) {
  const response = await apiClient.delete(
    `/workspaces/${workspaceId}/projects/${projectId}/members/${memberId}`
  );
  return response.data;
}

export async function listProjectRequirementsRequest(workspaceId, projectId) {
  const response = await apiClient.get(
    `/workspaces/${workspaceId}/projects/${projectId}/requirements`
  );
  return response.data;
}