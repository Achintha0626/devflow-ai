import apiClient from "./apiClient";

const projectPath = (workspaceId, projectId) =>
  `/workspaces/${workspaceId}/projects/${projectId}`;

const sprintPath = (workspaceId, projectId, sprintId) =>
  `${projectPath(workspaceId, projectId)}/sprints/${sprintId}`;

export async function createSprintRequest(workspaceId, projectId, sprint) {
  const response = await apiClient.post(
    `${projectPath(workspaceId, projectId)}/sprints`,
    sprint
  );
  return response.data;
}

export async function listSprintsRequest(workspaceId, projectId, filters = {}) {
  const response = await apiClient.get(
    `${projectPath(workspaceId, projectId)}/sprints`,
    { params: filters }
  );
  return response.data;
}

export async function listSprintBacklogRequest(workspaceId, projectId, filters = {}) {
  const response = await apiClient.get(
    `${projectPath(workspaceId, projectId)}/backlog`,
    { params: filters }
  );
  return response.data;
}

export async function getSprintRequest(workspaceId, projectId, sprintId) {
  const response = await apiClient.get(sprintPath(workspaceId, projectId, sprintId));
  return response.data;
}

export async function getSprintProgressRequest(workspaceId, projectId, sprintId) {
  const response = await apiClient.get(`${sprintPath(workspaceId, projectId, sprintId)}/progress`);
  return response.data;
}

export async function updateSprintRequest(workspaceId, projectId, sprintId, sprint) {
  const response = await apiClient.patch(
    sprintPath(workspaceId, projectId, sprintId),
    sprint
  );
  return response.data;
}

export async function startSprintRequest(workspaceId, projectId, sprintId) {
  const response = await apiClient.patch(`${sprintPath(workspaceId, projectId, sprintId)}/start`);
  return response.data;
}

export async function completeSprintRequest(workspaceId, projectId, sprintId) {
  const response = await apiClient.patch(`${sprintPath(workspaceId, projectId, sprintId)}/complete`);
  return response.data;
}

export async function cancelSprintRequest(workspaceId, projectId, sprintId) {
  const response = await apiClient.patch(`${sprintPath(workspaceId, projectId, sprintId)}/cancel`);
  return response.data;
}

export async function addTaskToSprintRequest(workspaceId, projectId, sprintId, taskId) {
  const response = await apiClient.post(
    `${sprintPath(workspaceId, projectId, sprintId)}/tasks`,
    { taskId }
  );
  return response.data;
}

export async function removeTaskFromSprintRequest(workspaceId, projectId, sprintId, taskId) {
  const response = await apiClient.delete(
    `${sprintPath(workspaceId, projectId, sprintId)}/tasks/${taskId}`
  );
  return response.data;
}

export async function moveTaskToSprintRequest(workspaceId, projectId, taskId, sprintId) {
  const response = await apiClient.patch(
    `${projectPath(workspaceId, projectId)}/tasks/${taskId}/sprint`,
    { sprintId }
  );
  return response.data;
}

export async function deleteSprintRequest(workspaceId, projectId, sprintId) {
  const response = await apiClient.delete(sprintPath(workspaceId, projectId, sprintId));
  return response.data;
}