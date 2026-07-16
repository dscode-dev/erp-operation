-- PMOC Foundation Bloco 2: additive operational defaults and per-execution responsibility snapshots.
ALTER TYPE "PmocHistoryAction" ADD VALUE IF NOT EXISTS 'REQUEST_RESCHEDULED';
ALTER TYPE "PmocHistoryAction" ADD VALUE IF NOT EXISTS 'DEFAULTS_PROPAGATED';

ALTER TABLE "pmoc_plans"
  ADD COLUMN "default_address_id" UUID,
  ADD COLUMN "default_operation_type" "OperationType" NOT NULL DEFAULT 'PREVENTIVA',
  ADD COLUMN "default_estimated_duration_minutes" INTEGER,
  ADD COLUMN "default_operation_observations" TEXT;

ALTER TABLE "pmoc_execution_requests"
  ADD COLUMN "planned_operator_id" UUID,
  ADD COLUMN "planned_technician_id" UUID;

UPDATE "pmoc_execution_requests" request
SET
  "planned_operator_id" = plan."default_operator_id",
  "planned_technician_id" = plan."default_technician_id"
FROM "pmoc_plans" plan
WHERE request."pmoc_plan_id" = plan."id";

ALTER TABLE "pmoc_plans"
  ADD CONSTRAINT "pmoc_plans_default_address_id_fkey"
  FOREIGN KEY ("default_address_id") REFERENCES "customer_addresses"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pmoc_execution_requests"
  ADD CONSTRAINT "pmoc_execution_requests_planned_operator_id_fkey"
  FOREIGN KEY ("planned_operator_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "pmoc_execution_requests_planned_technician_id_fkey"
  FOREIGN KEY ("planned_technician_id") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pmoc_plans"
  ADD CONSTRAINT "pmoc_plans_default_estimated_duration_minutes_check"
  CHECK ("default_estimated_duration_minutes" IS NULL OR
         "default_estimated_duration_minutes" BETWEEN 15 AND 10080);

CREATE INDEX "pmoc_plans_default_address_id_idx" ON "pmoc_plans"("default_address_id");
CREATE INDEX "pmoc_execution_requests_planned_operator_id_idx"
  ON "pmoc_execution_requests"("planned_operator_id");
CREATE INDEX "pmoc_execution_requests_planned_technician_id_idx"
  ON "pmoc_execution_requests"("planned_technician_id");
