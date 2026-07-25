-- Checklist do PMOC por equipamento: cada item de checklist do plano pode ser
-- vinculado a um equipamento específico da cobertura (NULL = geral/todos).
ALTER TABLE "pmoc_plan_checklists"
  ADD COLUMN IF NOT EXISTS "equipment_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pmoc_plan_checklists_equipment_id_fkey') THEN
    ALTER TABLE "pmoc_plan_checklists"
      ADD CONSTRAINT "pmoc_plan_checklists_equipment_id_fkey"
      FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Troca as unicidades por versões que incluem o equipamento (mesmo item pode
-- pertencer a vários equipamentos; posições são por (plano, equipamento)).
DROP INDEX IF EXISTS "pmoc_plan_checklist_plan_catalog_uq";
DROP INDEX IF EXISTS "pmoc_plan_checklist_plan_position_uq";

CREATE UNIQUE INDEX IF NOT EXISTS "pmoc_plan_checklist_plan_equipment_catalog_uq"
  ON "pmoc_plan_checklists"("pmoc_plan_id", "equipment_id", "technical_catalog_id");
CREATE UNIQUE INDEX IF NOT EXISTS "pmoc_plan_checklist_plan_equipment_position_uq"
  ON "pmoc_plan_checklists"("pmoc_plan_id", "equipment_id", "position");
CREATE INDEX IF NOT EXISTS "pmoc_plan_checklist_equipment_idx"
  ON "pmoc_plan_checklists"("equipment_id");
