-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE');

-- CreateTable
CREATE TABLE "ProjectTaskSequence" (
    "projectId" TEXT NOT NULL,
    "nextNumber" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ProjectTaskSequence_pkey" PRIMARY KEY ("projectId")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requirementId" TEXT,
    "aiSuggestedTaskId" TEXT,
    "sequenceNumber" INTEGER NOT NULL,
    "taskNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "SuggestedTaskType" NOT NULL,
    "priority" "RequirementPriority" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "storyPoints" INTEGER,
    "assigneeId" TEXT,
    "createdById" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_aiSuggestedTaskId_key" ON "Task"("aiSuggestedTaskId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_projectId_status_idx" ON "Task"("projectId", "status");

-- CreateIndex
CREATE INDEX "Task_projectId_assigneeId_idx" ON "Task"("projectId", "assigneeId");

-- CreateIndex
CREATE INDEX "Task_requirementId_idx" ON "Task"("requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "Task_projectId_sequenceNumber_key" ON "Task"("projectId", "sequenceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Task_projectId_taskNumber_key" ON "Task"("projectId", "taskNumber");

-- AddForeignKey
ALTER TABLE "ProjectTaskSequence" ADD CONSTRAINT "ProjectTaskSequence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_aiSuggestedTaskId_fkey" FOREIGN KEY ("aiSuggestedTaskId") REFERENCES "AISuggestedTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
