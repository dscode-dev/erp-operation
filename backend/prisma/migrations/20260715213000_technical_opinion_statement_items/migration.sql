ALTER TABLE "operations"
ADD COLUMN "technical_opinion_objective_items" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "technical_opinion_conclusion_items" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
