-- Checklist do Procedimento do PMOC por unidade fixa (Evaporadora/Condensadora).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PmocChecklistUnit') THEN
    CREATE TYPE "PmocChecklistUnit" AS ENUM ('EVAPORATOR', 'CONDENSER');
  END IF;
END $$;

ALTER TABLE "technical_catalogs"
  ADD COLUMN IF NOT EXISTS "pmoc_unit" "PmocChecklistUnit";

ALTER TABLE "operation_maintenance_checklist_items"
  ADD COLUMN IF NOT EXISTS "pmoc_unit" "PmocChecklistUnit";

CREATE INDEX IF NOT EXISTS "technical_catalog_pmoc_unit_idx"
  ON "technical_catalogs"("organization_id", "pmoc_unit", "active");
