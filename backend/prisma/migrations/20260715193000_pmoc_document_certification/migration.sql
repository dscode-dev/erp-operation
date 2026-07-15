CREATE TYPE "MaintenanceChecklistResult" AS ENUM ('YES', 'NO', 'NOT_APPLICABLE');

ALTER TABLE "operations"
  ADD COLUMN "customer_signer_name" VARCHAR(180),
  ADD COLUMN "customer_signer_role" VARCHAR(120);

ALTER TABLE "operation_maintenance_checklist_items"
  ADD COLUMN "equipment_id" UUID,
  ADD COLUMN "result" "MaintenanceChecklistResult" NOT NULL DEFAULT 'NO';

UPDATE "operation_maintenance_checklist_items"
SET "result" = CASE WHEN "executed" THEN 'YES'::"MaintenanceChecklistResult" ELSE 'NO'::"MaintenanceChecklistResult" END;

CREATE INDEX "op_maintenance_checklist_equipment_idx"
  ON "operation_maintenance_checklist_items"("operation_id", "equipment_id");

ALTER TABLE "operation_maintenance_checklist_items"
  ADD CONSTRAINT "operation_maintenance_checklist_items_equipment_id_fkey"
  FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
