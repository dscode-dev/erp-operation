CREATE TYPE "RvtPlanStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELED');
CREATE TYPE "RvtExecutionStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');

CREATE TABLE "rvt_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "address_id" UUID NOT NULL,
  "maintenance_plan_id" UUID NOT NULL,
  "number" INTEGER NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "maintenance_type" "OperationMaintenanceType" NOT NULL,
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "responsible_technician_id" UUID NOT NULL,
  "default_operator_id" UUID,
  "status" "RvtPlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "observations" TEXT,
  "created_by" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "rvt_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rvt_plan_equipments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rvt_plan_id" UUID NOT NULL,
  "equipment_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rvt_plan_equipments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rvt_plan_checklists" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rvt_plan_id" UUID NOT NULL,
  "technical_catalog_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rvt_plan_checklists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rvt_executions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rvt_plan_id" UUID NOT NULL,
  "maintenance_execution_id" UUID NOT NULL,
  "operation_id" UUID,
  "execution_number" INTEGER NOT NULL,
  "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
  "status" "RvtExecutionStatus" NOT NULL DEFAULT 'PENDING',
  "assigned_operator_id" UUID,
  "started_at" TIMESTAMPTZ(3),
  "completed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "rvt_executions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rvt_plans_maintenance_plan_id_key" ON "rvt_plans"("maintenance_plan_id");
CREATE UNIQUE INDEX "rvt_plan_customer_number_uq" ON "rvt_plans"("customer_id", "number");
CREATE INDEX "rvt_plans_organization_id_status_active_idx" ON "rvt_plans"("organization_id", "status", "active");
CREATE INDEX "rvt_plans_customer_id_active_idx" ON "rvt_plans"("customer_id", "active");
CREATE INDEX "rvt_plans_start_date_end_date_idx" ON "rvt_plans"("start_date", "end_date");
CREATE INDEX "rvt_plans_responsible_technician_id_idx" ON "rvt_plans"("responsible_technician_id");
CREATE INDEX "rvt_plans_default_operator_id_idx" ON "rvt_plans"("default_operator_id");

CREATE UNIQUE INDEX "rvt_plan_equipments_rvt_plan_id_equipment_id_key" ON "rvt_plan_equipments"("rvt_plan_id", "equipment_id");
CREATE UNIQUE INDEX "rvt_plan_equipments_rvt_plan_id_position_key" ON "rvt_plan_equipments"("rvt_plan_id", "position");
CREATE INDEX "rvt_plan_equipments_equipment_id_idx" ON "rvt_plan_equipments"("equipment_id");

CREATE UNIQUE INDEX "rvt_plan_checklists_rvt_plan_id_technical_catalog_id_key" ON "rvt_plan_checklists"("rvt_plan_id", "technical_catalog_id");
CREATE UNIQUE INDEX "rvt_plan_checklists_rvt_plan_id_position_key" ON "rvt_plan_checklists"("rvt_plan_id", "position");
CREATE INDEX "rvt_plan_checklists_technical_catalog_id_idx" ON "rvt_plan_checklists"("technical_catalog_id");

CREATE UNIQUE INDEX "rvt_executions_maintenance_execution_id_key" ON "rvt_executions"("maintenance_execution_id");
CREATE UNIQUE INDEX "rvt_executions_operation_id_key" ON "rvt_executions"("operation_id");
CREATE UNIQUE INDEX "rvt_executions_rvt_plan_id_execution_number_key" ON "rvt_executions"("rvt_plan_id", "execution_number");
CREATE UNIQUE INDEX "rvt_executions_rvt_plan_id_scheduled_at_key" ON "rvt_executions"("rvt_plan_id", "scheduled_at");
CREATE INDEX "rvt_executions_status_scheduled_at_idx" ON "rvt_executions"("status", "scheduled_at");
CREATE INDEX "rvt_executions_assigned_operator_id_status_scheduled_at_idx" ON "rvt_executions"("assigned_operator_id", "status", "scheduled_at");

ALTER TABLE "rvt_plans" ADD CONSTRAINT "rvt_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rvt_plans" ADD CONSTRAINT "rvt_plans_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rvt_plans" ADD CONSTRAINT "rvt_plans_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "customer_addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rvt_plans" ADD CONSTRAINT "rvt_plans_maintenance_plan_id_fkey" FOREIGN KEY ("maintenance_plan_id") REFERENCES "maintenance_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rvt_plans" ADD CONSTRAINT "rvt_plans_responsible_technician_id_fkey" FOREIGN KEY ("responsible_technician_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rvt_plans" ADD CONSTRAINT "rvt_plans_default_operator_id_fkey" FOREIGN KEY ("default_operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rvt_plans" ADD CONSTRAINT "rvt_plans_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rvt_plan_equipments" ADD CONSTRAINT "rvt_plan_equipments_rvt_plan_id_fkey" FOREIGN KEY ("rvt_plan_id") REFERENCES "rvt_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rvt_plan_equipments" ADD CONSTRAINT "rvt_plan_equipments_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rvt_plan_checklists" ADD CONSTRAINT "rvt_plan_checklists_rvt_plan_id_fkey" FOREIGN KEY ("rvt_plan_id") REFERENCES "rvt_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rvt_plan_checklists" ADD CONSTRAINT "rvt_plan_checklists_technical_catalog_id_fkey" FOREIGN KEY ("technical_catalog_id") REFERENCES "technical_catalogs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "rvt_executions" ADD CONSTRAINT "rvt_executions_rvt_plan_id_fkey" FOREIGN KEY ("rvt_plan_id") REFERENCES "rvt_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rvt_executions" ADD CONSTRAINT "rvt_executions_maintenance_execution_id_fkey" FOREIGN KEY ("maintenance_execution_id") REFERENCES "maintenance_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rvt_executions" ADD CONSTRAINT "rvt_executions_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rvt_executions" ADD CONSTRAINT "rvt_executions_assigned_operator_id_fkey" FOREIGN KEY ("assigned_operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
