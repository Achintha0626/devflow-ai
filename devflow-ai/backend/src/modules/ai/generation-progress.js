const GENERATION_PHASES = Object.freeze([
  "understanding",
  "preparing",
  "generating",
  "validating",
  "saving",
  "ready",
]);

const createGenerationProgressReporter = (onProgress) => {
  let nextPhaseIndex = 0;
  let activePhase;

  const report = ({ phase, status }) => {
    if (status === "active") {
      if (activePhase || GENERATION_PHASES[nextPhaseIndex] !== phase) {
        throw new Error("INVALID_GENERATION_PROGRESS_TRANSITION");
      }
      activePhase = phase;
    } else if (status === "completed" || status === "failed") {
      if (activePhase !== phase) {
        throw new Error("INVALID_GENERATION_PROGRESS_TRANSITION");
      }
      activePhase = undefined;
      if (status === "completed") nextPhaseIndex += 1;
    } else {
      throw new Error("INVALID_GENERATION_PROGRESS_TRANSITION");
    }

    onProgress?.({ phase, status });
  };

  return {
    report,
    failActive() {
      if (!activePhase) return undefined;
      const failedPhase = activePhase;
      report({ phase: failedPhase, status: "failed" });
      return failedPhase;
    },
  };
};

module.exports = {
  GENERATION_PHASES,
  createGenerationProgressReporter,
};
