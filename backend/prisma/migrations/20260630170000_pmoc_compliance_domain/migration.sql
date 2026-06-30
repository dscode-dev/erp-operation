ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'PMOC_CREATED';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'PMOC_UPDATED';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'PMOC_COMPLETED';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'PMOC_EXPIRED';

CREATE TYPE "PmocComplianceStatus" AS ENUM (
  'COMPLIANT',
  'WARNING',
  'OVERDUE',
  'NON_COMPLIANT',
  'IN_PROGRESS'
);

CREATE TABLE "pmoc_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "equipment_id" UUID NOT NULL,
  "maintenance_plan_id" UUID NOT NULL,
  "responsible_technician" VARCHAR(150) NOT NULL,
  "art_number" VARCHAR(80),
  "contract_number" VARCHAR(80),
  "start_date" DATE NOT NULL,
  "end_date" DATE NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "observations" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pmoc_plans_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pmoc_environments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pmoc_plan_id" UUID NOT NULL,
  "name" VARCHAR(140) NOT NULL,
  "area" VARCHAR(80),
  "occupancy" INTEGER,
  "observations" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pmoc_environments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pmoc_plan_equipments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pmoc_plan_id" UUID NOT NULL,
  "equipment_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pmoc_plan_equipments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pmoc_environment_equipments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "environment_id" UUID NOT NULL,
  "equipment_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pmoc_environment_equipments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pmoc_plans_maintenance_plan_id_key"
  ON "pmoc_plans"("maintenance_plan_id");

CREATE INDEX "pmoc_plans_customer_id_active_idx"
  ON "pmoc_plans"("customer_id", "active");

CREATE INDEX "pmoc_plans_equipment_id_active_idx"
  ON "pmoc_plans"("equipment_id", "active");

CREATE INDEX "pmoc_plans_organization_id_active_idx"
  ON "pmoc_plans"("organization_id", "active");

CREATE INDEX "pmoc_plans_active_end_date_idx"
  ON "pmoc_plans"("active", "end_date");

CREATE INDEX "pmoc_environments_pmoc_plan_id_name_idx"
  ON "pmoc_environments"("pmoc_plan_id", "name");

CREATE UNIQUE INDEX "pmoc_plan_equipments_pmoc_plan_id_equipment_id_key"
  ON "pmoc_plan_equipments"("pmoc_plan_id", "equipment_id");

CREATE INDEX "pmoc_plan_equipments_equipment_id_idx"
  ON "pmoc_plan_equipments"("equipment_id");

CREATE UNIQUE INDEX "pmoc_environment_equipments_environment_id_equipment_id_key"
  ON "pmoc_environment_equipments"("environment_id", "equipment_id");

CREATE INDEX "pmoc_environment_equipments_equipment_id_idx"
  ON "pmoc_environment_equipments"("equipment_id");

ALTER TABLE "pmoc_plans"
  ADD CONSTRAINT "pmoc_plans_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "pmoc_plans"
  ADD CONSTRAINT "pmoc_plans_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pmoc_plans"
  ADD CONSTRAINT "pmoc_plans_equipment_id_fkey"
  FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pmoc_plans"
  ADD CONSTRAINT "pmoc_plans_maintenance_plan_id_fkey"
  FOREIGN KEY ("maintenance_plan_id") REFERENCES "maintenance_plans"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pmoc_environments"
  ADD CONSTRAINT "pmoc_environments_pmoc_plan_id_fkey"
  FOREIGN KEY ("pmoc_plan_id") REFERENCES "pmoc_plans"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pmoc_plan_equipments"
  ADD CONSTRAINT "pmoc_plan_equipments_pmoc_plan_id_fkey"
  FOREIGN KEY ("pmoc_plan_id") REFERENCES "pmoc_plans"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pmoc_plan_equipments"
  ADD CONSTRAINT "pmoc_plan_equipments_equipment_id_fkey"
  FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pmoc_environment_equipments"
  ADD CONSTRAINT "pmoc_environment_equipments_environment_id_fkey"
  FOREIGN KEY ("environment_id") REFERENCES "pmoc_environments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "pmoc_environment_equipments"
  ADD CONSTRAINT "pmoc_environment_equipments_equipment_id_fkey"
  FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
