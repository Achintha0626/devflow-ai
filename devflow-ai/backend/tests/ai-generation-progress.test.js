const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  GENERATION_PHASES,
  createGenerationProgressReporter,
} = require("../src/modules/ai/generation-progress");

describe("AI generation progress reporting", () => {
  it("reports all phases in backend execution order", () => {
    const events = [];
    const progress = createGenerationProgressReporter((event) => events.push(event));

    GENERATION_PHASES.forEach((phase) => {
      progress.report({ phase, status: "active" });
      progress.report({ phase, status: "completed" });
    });

    assert.deepEqual(events, GENERATION_PHASES.flatMap((phase) => [
      { phase, status: "active" },
      { phase, status: "completed" },
    ]));
  });

  it("marks the actual active phase as failed and does not complete later stages", () => {
    for (const failedPhase of GENERATION_PHASES) {
      const events = [];
      const progress = createGenerationProgressReporter((event) => events.push(event));
      const failureIndex = GENERATION_PHASES.indexOf(failedPhase);

      GENERATION_PHASES.slice(0, failureIndex).forEach((phase) => {
        progress.report({ phase, status: "active" });
        progress.report({ phase, status: "completed" });
      });
      progress.report({ phase: failedPhase, status: "active" });

      assert.equal(progress.failActive(), failedPhase);
      assert.equal(events.at(-1).status, "failed");
      assert.equal(progress.failActive(), undefined);
      assert.throws(() => {
        progress.report({ phase: GENERATION_PHASES[failureIndex + 1], status: "active" });
      }, /INVALID_GENERATION_PROGRESS_TRANSITION/);
    }
  });

  it("rejects out-of-order stage updates", () => {
    const progress = createGenerationProgressReporter();
    assert.throws(() => {
      progress.report({ phase: "generating", status: "active" });
    }, /INVALID_GENERATION_PROGRESS_TRANSITION/);
  });
});
