-- Equipamentos do orçamento: permite listar um ou vários equipamentos por
-- orçamento (espelha operation_inspected_equipments da OS), para a seção
-- "Equipamentos" do documento em formato de tabela.
CREATE TABLE IF NOT EXISTS "budget_equipments" (
  "id"                 UUID         NOT NULL DEFAULT gen_random_uuid(),
  "budget_id"          UUID         NOT NULL,
  "equipment_id"       UUID         NOT NULL,
  "position"           INTEGER      NOT NULL,
  "sector"             VARCHAR(160) NOT NULL,
  "brand_snapshot"     VARCHAR(120),
  "model_snapshot"     VARCHAR(120),
  "capacity_snapshot"  VARCHAR(80),
  "tag_snapshot"       VARCHAR(80),
  "serial_snapshot"    VARCHAR(120),
  "created_at"         TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  CONSTRAINT "budget_equipments_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_equipments_budget_id_fkey') THEN
    ALTER TABLE "budget_equipments"
      ADD CONSTRAINT "budget_equipments_budget_id_fkey"
      FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'budget_equipments_equipment_id_fkey') THEN
    ALTER TABLE "budget_equipments"
      ADD CONSTRAINT "budget_equipments_equipment_id_fkey"
      FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "budget_equipment_budget_equipment_uq"
  ON "budget_equipments"("budget_id", "equipment_id");
CREATE UNIQUE INDEX IF NOT EXISTS "budget_equipment_budget_position_uq"
  ON "budget_equipments"("budget_id", "position");
CREATE INDEX IF NOT EXISTS "budget_equipment_equipment_idx"
  ON "budget_equipments"("equipment_id");
