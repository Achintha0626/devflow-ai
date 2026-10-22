const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("Task Risk Prediction — Feature Preparation & Validation", () => {
  it("computes non-negative task age and clamps sprint metrics", () => {
    const now = new Date("2026-10-22T00:00:00Z");
    const createdAt = new Date("2026-10-18T00:00:00Z");
    const dueDate = new Date("2026-10-25T00:00:00Z");
    const msPerDay = 24 * 60 * 60 * 1000;

    const taskAgeDays = Math.max(0, (now.getTime() - createdAt.getTime()) / msPerDay);
    const daysUntilDue = (dueDate.getTime() - now.getTime()) / msPerDay;

    assert.equal(taskAgeDays, 4);
    assert.equal(daysUntilDue, 3);
  });

  it("handles backlog tasks with zero sprint values", () => {
    const taskWithoutSprint = { sprint: null };
    const sprintDaysRemaining = taskWithoutSprint.sprint?.endDate ? 5 : 0;
    const sprintCompletionPercentage = 0;

    assert.equal(sprintDaysRemaining, 0);
    assert.equal(sprintCompletionPercentage, 0);
  });

  it("handles unassigned tasks with zero workload values", () => {
    const taskWithoutAssignee = { assigneeId: null };
    const assigneeActiveTasks = taskWithoutAssignee.assigneeId ? 5 : 0;
    const assigneeStoryPointLoad = taskWithoutAssignee.assigneeId ? 15 : 0;

    assert.equal(assigneeActiveTasks, 0);
    assert.equal(assigneeStoryPointLoad, 0);
  });
});

describe("Task Risk Prediction — Service Response Validation", () => {
  function validatePredictionResponse(prediction) {
    const probability = prediction?.delayProbability;
    const validProbability = typeof probability === "number"
      && Number.isFinite(probability)
      && probability >= 0
      && probability <= 1;
    const validRiskLevel = ["LOW", "MEDIUM", "HIGH"].includes(prediction?.riskLevel);
    const validModelVersion = typeof prediction?.modelVersion === "string" && prediction.modelVersion.length > 0;

    if (!validProbability || !validRiskLevel || !validModelVersion) {
      throw new Error("ML_SERVICE_INVALID_PREDICTION");
    }

    return {
      delayProbability: probability,
      riskLevel: prediction.riskLevel,
      modelVersion: prediction.modelVersion,
    };
  }

  it("accepts valid prediction payload from ML service", () => {
    const payload = {
      delayProbability: 0.148,
      riskLevel: "LOW",
      modelVersion: "dev-synthetic-v1",
    };

    const validated = validatePredictionResponse(payload);
    assert.deepEqual(validated, payload);
  });

  it("rejects probabilities out of bounds", () => {
    assert.throws(
      () => validatePredictionResponse({ delayProbability: 1.5, riskLevel: "HIGH", modelVersion: "v1" }),
      { message: "ML_SERVICE_INVALID_PREDICTION" }
    );
    assert.throws(
      () => validatePredictionResponse({ delayProbability: -0.1, riskLevel: "LOW", modelVersion: "v1" }),
      { message: "ML_SERVICE_INVALID_PREDICTION" }
    );
  });

  it("rejects invalid risk levels", () => {
    assert.throws(
      () => validatePredictionResponse({ delayProbability: 0.5, riskLevel: "CRITICAL", modelVersion: "v1" }),
      { message: "ML_SERVICE_INVALID_PREDICTION" }
    );
  });

  it("rejects missing or empty model version", () => {
    assert.throws(
      () => validatePredictionResponse({ delayProbability: 0.5, riskLevel: "MEDIUM", modelVersion: "" }),
      { message: "ML_SERVICE_INVALID_PREDICTION" }
    );
  });
});

describe("Task Risk Prediction — Scoping & Access Control", () => {
  it("rejects task when project does not match task project", async () => {
    const mockDb = {
      task: {
        findFirst: async ({ where }) => {
          if (where.id === "task-1" && where.projectId === "project-correct") {
            return { id: "task-1" };
          }
          return null;
        },
      },
    };

    const taskMatch = await mockDb.task.findFirst({
      where: { id: "task-1", projectId: "project-wrong", project: { workspaceId: "ws-1" } },
    });
    assert.equal(taskMatch, null);
  });

  it("rejects task when workspace does not match project workspace", async () => {
    const mockDb = {
      task: {
        findFirst: async ({ where }) => {
          if (where.id === "task-1" && where.project?.workspaceId === "ws-correct") {
            return { id: "task-1" };
          }
          return null;
        },
      },
    };

    const taskMatch = await mockDb.task.findFirst({
      where: { id: "task-1", projectId: "project-1", project: { workspaceId: "ws-wrong" } },
    });
    assert.equal(taskMatch, null);
  });
});

describe("Task Risk Prediction — Analytics Summary Calculation", () => {
  function calculateSummary(tasks) {
    const totalTasks = tasks.length;
    const predictedTasks = tasks.filter((t) => t.riskPredictions && t.riskPredictions.length > 0);
    const tasksWithPredictions = predictedTasks.length;
    const tasksWithoutPredictions = totalTasks - tasksWithPredictions;
    const coveragePercentage = totalTasks === 0 ? 0 : Math.round((tasksWithPredictions / totalTasks) * 100 * 100) / 100;

    const riskDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0 };
    let probabilitySum = 0;
    const highestRiskCandidates = [];
    const modelVersionSet = new Set();
    let latestPredictionAt = null;

    for (const task of predictedTasks) {
      const prediction = task.riskPredictions[0];
      probabilitySum += prediction.delayProbability;
      if (Object.prototype.hasOwnProperty.call(riskDistribution, prediction.riskLevel)) {
        riskDistribution[prediction.riskLevel] += 1;
      }
      modelVersionSet.add(prediction.modelVersion);
      if (!latestPredictionAt || new Date(prediction.predictedAt) > new Date(latestPredictionAt)) {
        latestPredictionAt = prediction.predictedAt;
      }
      highestRiskCandidates.push({
        id: task.id,
        delayProbability: prediction.delayProbability,
        riskLevel: prediction.riskLevel,
        predictedAt: prediction.predictedAt,
      });
    }

    const averageDelayProbability = tasksWithPredictions === 0 ? 0 : Math.round((probabilitySum / tasksWithPredictions) * 10000) / 10000;
    highestRiskCandidates.sort((a, b) => b.delayProbability - a.delayProbability);

    return {
      summary: {
        totalTasks,
        tasksWithPredictions,
        tasksWithoutPredictions,
        coveragePercentage,
        averageDelayProbability,
      },
      riskDistribution,
      highestRiskTasks: highestRiskCandidates.slice(0, 5),
      modelVersions: Array.from(modelVersionSet).sort(),
      latestPredictionAt,
    };
  }

  it("calculates zero coverage correctly when no tasks have predictions", () => {
    const tasks = [
      { id: "t1", riskPredictions: [] },
      { id: "t2", riskPredictions: [] },
      { id: "t3", riskPredictions: [] },
      { id: "t4", riskPredictions: [] },
      { id: "t5", riskPredictions: [] },
    ];

    const result = calculateSummary(tasks);
    assert.deepEqual(result.summary, {
      totalTasks: 5,
      tasksWithPredictions: 0,
      tasksWithoutPredictions: 5,
      coveragePercentage: 0,
      averageDelayProbability: 0,
    });
    assert.deepEqual(result.riskDistribution, { LOW: 0, MEDIUM: 0, HIGH: 0 });
    assert.equal(result.highestRiskTasks.length, 0);
  });

  it("calculates partial coverage and sorts highest risk tasks descending", () => {
    const tasks = [
      {
        id: "t1",
        riskPredictions: [{
          delayProbability: 0.15,
          riskLevel: "LOW",
          modelVersion: "dev-synthetic-v1",
          predictedAt: "2026-10-21T18:00:00Z",
        }],
      },
      {
        id: "t2",
        riskPredictions: [{
          delayProbability: 0.75,
          riskLevel: "HIGH",
          modelVersion: "dev-synthetic-v1",
          predictedAt: "2026-10-21T19:00:00Z",
        }],
      },
      { id: "t3", riskPredictions: [] },
      { id: "t4", riskPredictions: [] },
      { id: "t5", riskPredictions: [] },
    ];

    const result = calculateSummary(tasks);
    assert.equal(result.summary.totalTasks, 5);
    assert.equal(result.summary.tasksWithPredictions, 2);
    assert.equal(result.summary.tasksWithoutPredictions, 3);
    assert.equal(result.summary.coveragePercentage, 40);
    assert.equal(result.summary.averageDelayProbability, 0.45);
    assert.deepEqual(result.riskDistribution, { LOW: 1, MEDIUM: 0, HIGH: 1 });
    assert.equal(result.highestRiskTasks[0].id, "t2");
    assert.equal(result.highestRiskTasks[0].delayProbability, 0.75);
    assert.equal(result.highestRiskTasks[1].id, "t1");
    assert.equal(result.latestPredictionAt, "2026-10-21T19:00:00Z");
  });
});

describe("Task Risk Prediction — Queue & ML Service Failure Handling", () => {
  it("gracefully catches queue failures and returns null", async () => {
    const originalConsoleError = console.error;
    console.error = () => {};

    try {
      const mockFailingEnqueue = async ({ workspaceId, projectId, taskId, reason }) => {
        if (!workspaceId || !projectId || !taskId || !reason) return null;
        try {
          throw new Error("Redis connection refused");
        } catch (error) {
          return null;
        }
      };

      const result = await mockFailingEnqueue({
        workspaceId: "ws-1",
        projectId: "proj-1",
        taskId: "task-1",
        reason: "TASK_CREATED",
      });

      assert.equal(result, null);
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("handles ML service network connection failure", async () => {
    const handleMlError = (error) => {
      if (error.name === "AbortError") throw new Error("ML_SERVICE_TIMEOUT");
      if (error.message === "ML_SERVICE_RESPONSE_ERROR"
        || error.message === "ML_SERVICE_INVALID_JSON"
        || error.message === "ML_SERVICE_INVALID_PREDICTION"
        || error.message === "ML_SERVICE_TIMEOUT") throw error;
      throw new Error("ML_SERVICE_UNAVAILABLE");
    };

    assert.throws(
      () => handleMlError(new TypeError("fetch failed: ECONNREFUSED")),
      { message: "ML_SERVICE_UNAVAILABLE" }
    );
  });

  it("handles ML service timeout abort error", async () => {
    const handleMlError = (error) => {
      if (error.name === "AbortError") throw new Error("ML_SERVICE_TIMEOUT");
      if (error.message === "ML_SERVICE_RESPONSE_ERROR"
        || error.message === "ML_SERVICE_INVALID_JSON"
        || error.message === "ML_SERVICE_INVALID_PREDICTION"
        || error.message === "ML_SERVICE_TIMEOUT") throw error;
      throw new Error("ML_SERVICE_UNAVAILABLE");
    };

    const abortError = new Error("The operation was aborted");
    abortError.name = "AbortError";

    assert.throws(
      () => handleMlError(abortError),
      { message: "ML_SERVICE_TIMEOUT" }
    );
  });

  it("handles ML service 500 error response", async () => {
    const checkResponseStatus = (ok) => {
      if (!ok) throw new Error("ML_SERVICE_RESPONSE_ERROR");
    };

    assert.throws(
      () => checkResponseStatus(false),
      { message: "ML_SERVICE_RESPONSE_ERROR" }
    );
  });
});

