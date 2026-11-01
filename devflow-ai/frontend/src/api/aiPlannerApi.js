import apiClient, { fetchWithAuth } from "./apiClient";

const generationPath = (workspaceId, projectId, requirementId) =>
  `/workspaces/${workspaceId}/projects/${projectId}/requirements/${requirementId}/ai`;

const GENERATION_TIMEOUT_MS = 180000;

export async function generateSuggestionsRequest(workspaceId, projectId, requirementId, onProgress) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GENERATION_TIMEOUT_MS);
  const path = `${generationPath(workspaceId, projectId, requirementId)}/generate`;

  try {
    const response = await fetchWithAuth(path, {
      method: "POST",
      headers: { Accept: "text/event-stream" },
      body: JSON.stringify({}),
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw Object.assign(new Error(body.message || "AI suggestion generation failed"), {
        response: { status: response.status },
      });
    }

    if (!response.body) {
      throw new Error("The generation progress stream is unavailable.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result;

    const consumeEvent = (block) => {
      let event = "message";
      const data = [];
      block.replace(/\r/g, "").split("\n").forEach((line) => {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) data.push(line.slice(5).trim());
      });
      if (data.length === 0) return;

      const payload = JSON.parse(data.join("\n"));
      if (event === "progress") onProgress?.(payload);
      if (event === "complete") result = payload;
      if (event === "failure") {
        throw Object.assign(new Error(payload.message || "AI suggestion generation failed"), {
          response: { status: payload.status },
          generationPhase: payload.phase,
        });
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      buffer = (buffer + decoder.decode(value || new Uint8Array(), { stream: !done }))
        .replace(/\r\n/g, "\n");
      let separatorIndex = buffer.indexOf("\n\n");
      while (separatorIndex !== -1) {
        const block = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        consumeEvent(block);
        separatorIndex = buffer.indexOf("\n\n");
      }
      if (done) break;
    }

    if (buffer.trim()) consumeEvent(buffer);
    if (!result) throw new Error("The generation stream ended before completion.");
    return result;
  } catch (error) {
    if (controller.signal.aborted) {
      throw Object.assign(new Error("The generation request timed out."), { code: "ETIMEDOUT" });
    }
    if (error instanceof TypeError && !error.response) error.request = true;
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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
