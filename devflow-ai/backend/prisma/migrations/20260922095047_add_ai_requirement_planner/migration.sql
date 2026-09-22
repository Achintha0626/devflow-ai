-- CreateEnum
CREATE TYPE "AIGenerationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "AISuggestedTaskStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EDITED');

-- CreateEnum
CREATE TYPE "SuggestedTaskType" AS ENUM ('FRONTEND', 'BACKEND', 'DATABASE', 'DEVOPS', 'TESTING', 'DESIGN', 'DOCUMENTATION', 'BUG', 'OTHER');

-- CreateTable
CREATE TABLE "AIGeneration" (
    "id" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "status" "AIGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AISuggestedTask" (
    "id" TEXT NOT NULL,
    "aiGenerationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "SuggestedTaskType" NOT NULL,
    "priority" "RequirementPriority" NOT NULL,
    "complexity" TEXT NOT NULL,
    "estimatedStoryPoints" INTEGER,
    "acceptanceCriteria" JSONB NOT NULL,
    "status" "AISuggestedTaskStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AISuggestedTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIGeneration_requirementId_idx" ON "AIGeneration"("requirementId");

-- CreateIndex
CREATE INDEX "AIGeneration_requirementId_status_idx" ON "AIGeneration"("requirementId", "status");

-- CreateIndex
CREATE INDEX "AIGeneration_createdAt_idx" ON "AIGeneration"("createdAt");

-- CreateIndex
CREATE INDEX "AISuggestedTask_aiGenerationId_idx" ON "AISuggestedTask"("aiGenerationId");

-- CreateIndex
CREATE INDEX "AISuggestedTask_aiGenerationId_status_idx" ON "AISuggestedTask"("aiGenerationId", "status");

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGeneration" ADD CONSTRAINT "AIGeneration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AISuggestedTask" ADD CONSTRAINT "AISuggestedTask_aiGenerationId_fkey" FOREIGN KEY ("aiGenerationId") REFERENCES "AIGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
