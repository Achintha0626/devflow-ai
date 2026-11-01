ALTER TABLE "Requirement"
ADD COLUMN "technologies" JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "AIGeneration"
ADD COLUMN "technologySnapshot" JSONB NOT NULL DEFAULT '[]'::jsonb;
