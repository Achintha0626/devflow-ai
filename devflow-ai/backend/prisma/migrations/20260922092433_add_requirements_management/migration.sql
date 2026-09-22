-- CreateEnum
CREATE TYPE "RequirementStatus" AS ENUM ('DRAFT', 'READY', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RequirementPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "Requirement" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RequirementStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "RequirementPriority" NOT NULL DEFAULT 'MEDIUM',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Requirement_projectId_idx" ON "Requirement"("projectId");

-- CreateIndex
CREATE INDEX "Requirement_projectId_status_idx" ON "Requirement"("projectId", "status");

-- CreateIndex
CREATE INDEX "Requirement_projectId_priority_idx" ON "Requirement"("projectId", "priority");

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
