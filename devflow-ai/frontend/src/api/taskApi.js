import apiClient from "./apiClient";

const taskPath = (workspaceId, projectId) =>
  `/workspaces/${workspaceId}/projects/${projectId}/tasks`;

export async function listTasksRequest(workspaceId, projectId, filters = {}) {
  const response = await apiClient.get(taskPath(workspaceId, projectId), {
    params: filters,
  });
  return response.data;
}

export async function getTaskRequest(workspaceId, projectId, taskId) {
  const response = await apiClient.get(
    `${taskPath(workspaceId, projectId)}/${taskId}`
  );
  return response.data;
}

export async function createTaskRequest(workspaceId, projectId, task) {
  const response = await apiClient.post(taskPath(workspaceId, projectId), task);
  return response.data;
}

export async function updateTaskRequest(workspaceId, projectId, taskId, task) {
  const response = await apiClient.patch(
    `${taskPath(workspaceId, projectId)}/${taskId}`,
    task
  );
  return response.data;
}

export async function assignTaskRequest(workspaceId, projectId, taskId, assigneeId) {
  const response = await apiClient.patch(
    `${taskPath(workspaceId, projectId)}/${taskId}/assignee`,
    { assigneeId }
  );
  return response.data;
}

export async function updateTaskStatusRequest(workspaceId, projectId, taskId, status) {
  const response = await apiClient.patch(
    `${taskPath(workspaceId, projectId)}/${taskId}/status`,
    { status }
  );
  return response.data;
}

export async function deleteTaskRequest(workspaceId, projectId, taskId) {
  const response = await apiClient.delete(
    `${taskPath(workspaceId, projectId)}/${taskId}`
  );
  return response.data;
}

export async function listTaskActivitiesRequest(workspaceId, projectId, taskId) {
  const response = await apiClient.get(
    `${taskPath(workspaceId, projectId)}/${taskId}/activities`
  );
  return response.data;
}