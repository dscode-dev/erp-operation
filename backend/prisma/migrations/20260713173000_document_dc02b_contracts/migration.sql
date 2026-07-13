CREATE TYPE "OperationMaintenanceType" AS ENUM (
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'SEMIANNUAL',
  'ANNUAL',
  'CORRECTIVE'
);

ALTER TABLE "organizations"
  ADD COLUMN "state_registration" VARCHAR(30),
  ADD COLUMN "phone_numbers" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "operations"
  ADD COLUMN "reference_month" SMALLINT,
  ADD COLUMN "reference_year" SMALLINT,
  ADD COLUMN "maintenance_type" "OperationMaintenanceType";

ALTER TABLE "operations"
  ADD CONSTRAINT "operations_reference_month_check"
    CHECK ("reference_month" IS NULL OR "reference_month" BETWEEN 1 AND 12),
  ADD CONSTRAINT "operations_reference_year_check"
    CHECK ("reference_year" IS NULL OR "reference_year" BETWEEN 2000 AND 2200),
  ADD CONSTRAINT "operations_reference_period_complete_check"
    CHECK (("reference_month" IS NULL) = ("reference_year" IS NULL));

CREATE TABLE "operation_maintenance_checklist_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "operation_id" UUID NOT NULL,
  "maintenance_type" "OperationMaintenanceType" NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "executed" BOOLEAN NOT NULL DEFAULT false,
  "observations" TEXT,
  "position" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operation_maintenance_checklist_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "operation_maintenance_checklist_items_position_check" CHECK ("position" >= 0)
);

CREATE TABLE "operation_inspected_equipments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "operation_id" UUID NOT NULL,
  "equipment_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "sector" VARCHAR(160) NOT NULL,
  "brand_snapshot" VARCHAR(120),
  "model_snapshot" VARCHAR(120),
  "capacity_snapshot" VARCHAR(80),
  "tag_snapshot" VARCHAR(80),
  "serial_snapshot" VARCHAR(120),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operation_inspected_equipments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "operation_inspected_equipments_position_check" CHECK ("position" >= 0)
);

CREATE UNIQUE INDEX "op_maintenance_checklist_type_position_uq"
  ON "operation_maintenance_checklist_items"("operation_id", "maintenance_type", "position");
CREATE INDEX "op_maintenance_checklist_type_idx"
  ON "operation_maintenance_checklist_items"("operation_id", "maintenance_type");
CREATE UNIQUE INDEX "op_inspected_equipment_operation_equipment_uq"
  ON "operation_inspected_equipments"("operation_id", "equipment_id");
CREATE UNIQUE INDEX "op_inspected_equipment_operation_position_uq"
  ON "operation_inspected_equipments"("operation_id", "position");
CREATE INDEX "op_inspected_equipment_equipment_idx"
  ON "operation_inspected_equipments"("equipment_id");

ALTER TABLE "operation_maintenance_checklist_items"
  ADD CONSTRAINT "operation_maintenance_checklist_items_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operation_inspected_equipments"
  ADD CONSTRAINT "operation_inspected_equipments_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operation_inspected_equipments"
  ADD CONSTRAINT "operation_inspected_equipments_equipment_id_fkey"
  FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
