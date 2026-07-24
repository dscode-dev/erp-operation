-- Lembretes de manutenção preventiva/instalação gerados a partir de OS.
DO $$ BEGIN
  CREATE TYPE "MaintenanceReminderStatus" AS ENUM ('PENDING', 'DONE', 'DISMISSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "maintenance_reminders" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "equipment_id" UUID,
  "operation_id" UUID,
  "operation_type" "OperationType" NOT NULL,
  "base_date" TIMESTAMPTZ(3) NOT NULL,
  "due_date" TIMESTAMPTZ(3) NOT NULL,
  "interval_months" INTEGER NOT NULL DEFAULT 6,
  "status" "MaintenanceReminderStatus" NOT NULL DEFAULT 'PENDING',
  "date_overridden" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "maintenance_reminders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "maintenance_reminders_operation_id_key"
  ON "maintenance_reminders"("operation_id");
CREATE INDEX IF NOT EXISTS "maintenance_reminders_organization_id_status_due_date_idx"
  ON "maintenance_reminders"("organization_id", "status", "due_date");
CREATE INDEX IF NOT EXISTS "maintenance_reminders_customer_id_status_due_date_idx"
  ON "maintenance_reminders"("customer_id", "status", "due_date");

DO $$ BEGIN
  ALTER TABLE "maintenance_reminders"
    ADD CONSTRAINT "maintenance_reminders_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "maintenance_reminders"
    ADD CONSTRAINT "maintenance_reminders_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "maintenance_reminders"
    ADD CONSTRAINT "maintenance_reminders_equipment_id_fkey"
    FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "maintenance_reminders"
    ADD CONSTRAINT "maintenance_reminders_operation_id_fkey"
    FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;
