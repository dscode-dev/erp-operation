ALTER TABLE "pmoc_plans"
  ADD COLUMN "include_checklist_in_operations" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "pmoc_plan_checklists" (
  "id" UUID NOT NULL,
  "pmoc_plan_id" UUID NOT NULL,
  "technical_catalog_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pmoc_plan_checklists_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pmoc_plan_checklists_position_check" CHECK ("position" >= 0)
);

CREATE UNIQUE INDEX "pmoc_plan_checklist_plan_catalog_uq"
  ON "pmoc_plan_checklists"("pmoc_plan_id", "technical_catalog_id");
CREATE UNIQUE INDEX "pmoc_plan_checklist_plan_position_uq"
  ON "pmoc_plan_checklists"("pmoc_plan_id", "position");
CREATE INDEX "pmoc_plan_checklist_catalog_idx"
  ON "pmoc_plan_checklists"("technical_catalog_id");

ALTER TABLE "pmoc_plan_checklists"
  ADD CONSTRAINT "pmoc_plan_checklists_pmoc_plan_id_fkey"
  FOREIGN KEY ("pmoc_plan_id") REFERENCES "pmoc_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pmoc_plan_checklists"
  ADD CONSTRAINT "pmoc_plan_checklists_technical_catalog_id_fkey"
  FOREIGN KEY ("technical_catalog_id") REFERENCES "technical_catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
