-- CreateTable
CREATE TABLE "TaskRiskPrediction" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "delayProbability" DOUBLE PRECISION NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "featureSnapshot" JSONB NOT NULL,
    "predictedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskRiskPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskRiskPrediction_taskId_idx" ON "TaskRiskPrediction"("taskId");

-- CreateIndex
CREATE INDEX "TaskRiskPrediction_taskId_predictedAt_idx" ON "TaskRiskPrediction"("taskId", "predictedAt");

-- CreateIndex
CREATE INDEX "TaskRiskPrediction_riskLevel_idx" ON "TaskRiskPrediction"("riskLevel");

-- CreateIndex
CREATE INDEX "TaskRiskPrediction_predictedAt_idx" ON "TaskRiskPrediction"("predictedAt");

-- AddForeignKey
ALTER TABLE "TaskRiskPrediction" ADD CONSTRAINT "TaskRiskPrediction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
