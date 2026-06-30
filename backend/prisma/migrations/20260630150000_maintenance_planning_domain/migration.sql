CREATE TYPE "MaintenancePlanType" AS ENUM (
  'PREVENTIVE',
  'INSPECTION',
  'WARRANTY',
  'CUSTOM'
);

CREATE TYPE "MaintenancePriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'CRITICAL'
);

CREATE TYPE "MaintenanceExecutionStatus" AS ENUM (
  'PLANNED',
  'LINKED',
  'COMPLETED',
  'CANCELED'
);

CREATE TABLE "maintenance_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "equipment_id" UUID NOT NULL,
  "name" VARCHAR(140) NOT NULL,
  "description" TEXT,
  "type" "MaintenancePlanType" NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "priority" "MaintenancePriority" NOT NULL DEFAULT 'MEDIUM',
  "recurrence_rule" JSONB NOT NULL,
  "first_execution" TIMESTAMPTZ(3) NOT NULL,
  "next_execution" TIMESTAMPTZ(3) NOT NULL,
  "last_execution" TIMESTAMPTZ(3),
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "maintenance_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "maintenance_executions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "maintenance_plan_id" UUID NOT NULL,
  "operation_id" UUID,
  "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
  "executed_at" TIMESTAMPTZ(3),
  "status" "MaintenanceExecutionStatus" NOT NULL DEFAULT 'PLANNED',
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "maintenance_executions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "maintenance_executions_operation_id_key"
  ON "maintenance_executions"("operation_id");

CREATE INDEX "maintenance_plans_equipment_id_active_idx"
  ON "maintenance_plans"("equipment_id", "active");

CREATE INDEX "maintenance_plans_active_next_execution_idx"
  ON "maintenance_plans"("active", "next_execution");

CREATE INDEX "maintenance_plans_type_active_idx"
  ON "maintenance_plans"("type", "active");

CREATE INDEX "maintenance_plans_priority_next_execution_idx"
  ON "maintenance_plans"("priority", "next_execution");

CREATE INDEX "maintenance_executions_maintenance_plan_id_scheduled_at_idx"
  ON "maintenance_executions"("maintenance_plan_id", "scheduled_at");

CREATE INDEX "maintenance_executions_status_scheduled_at_idx"
  ON "maintenance_executions"("status", "scheduled_at");

CREATE INDEX "maintenance_executions_executed_at_idx"
  ON "maintenance_executions"("executed_at");

ALTER TABLE "maintenance_plans"
  ADD CONSTRAINT "maintenance_plans_equipment_id_fkey"
  FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "maintenance_plans"
  ADD CONSTRAINT "maintenance_plans_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "maintenance_executions"
  ADD CONSTRAINT "maintenance_executions_maintenance_plan_id_fkey"
  FOREIGN KEY ("maintenance_plan_id") REFERENCES "maintenance_plans"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "maintenance_executions"
  ADD CONSTRAINT "maintenance_executions_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "operations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
