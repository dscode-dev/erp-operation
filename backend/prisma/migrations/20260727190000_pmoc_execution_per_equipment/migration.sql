-- Cada execução PMOC passa a possuir um equipamento coberto como origem oficial.
-- Registros históricos são vinculados ao equipamento primário legado do plano.
ALTER TABLE "pmoc_execution_requests"
ADD COLUMN "equipment_id" UUID;

UPDATE "pmoc_execution_requests" AS request
SET "equipment_id" = plan."equipment_id"
FROM "pmoc_plans" AS plan
WHERE request."pmoc_plan_id" = plan."id"
  AND request."equipment_id" IS NULL;

ALTER TABLE "pmoc_execution_requests"
ALTER COLUMN "equipment_id" SET NOT NULL;

DROP INDEX IF EXISTS "pmoc_execution_requests_pmoc_plan_id_scheduled_for_key";

CREATE UNIQUE INDEX "pmoc_execution_requests_pmoc_plan_id_equipment_id_scheduled_for_key"
ON "pmoc_execution_requests"("pmoc_plan_id", "equipment_id", "scheduled_for");

CREATE INDEX "pmoc_execution_requests_equipment_id_scheduled_for_idx"
ON "pmoc_execution_requests"("equipment_id", "scheduled_for");

ALTER TABLE "pmoc_execution_requests"
ADD CONSTRAINT "pmoc_execution_requests_equipment_id_fkey"
FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
