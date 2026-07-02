ALTER TYPE "DocumentTemplateType" ADD VALUE IF NOT EXISTS 'BUDGET';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'BUDGET_APPROVED';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'BUDGET_REJECTED';

CREATE TYPE "BudgetStatus" AS ENUM (
  'DRAFT',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'CANCELED'
);

CREATE TYPE "BudgetHistoryAction" AS ENUM (
  'CREATED',
  'UPDATED',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'CANCELED',
  'ITEM_ADDED',
  'ITEM_UPDATED',
  'ITEM_REMOVED'
);

CREATE TABLE "budgets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "operation_id" UUID,
  "customer_id" UUID NOT NULL,
  "customer_address_id" UUID,
  "equipment_id" UUID,
  "number" SERIAL NOT NULL,
  "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
  "title" VARCHAR(180) NOT NULL,
  "description" TEXT,
  "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "additional" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "expiration_date" TIMESTAMPTZ(3) NOT NULL,
  "observations" TEXT,
  "created_by" UUID NOT NULL,
  "approved_at" TIMESTAMPTZ(3),
  "rejected_at" TIMESTAMPTZ(3),
  "canceled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,

  CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "budget_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "budget_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit" VARCHAR(20) NOT NULL,
  "snapshot_cost" DECIMAL(14,2) NOT NULL,
  "snapshot_sale_price" DECIMAL(14,2) NOT NULL,
  "snapshot_margin" DECIMAL(7,2) NOT NULL,
  "total" DECIMAL(14,2) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "budget_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "budget_approvals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "budget_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "status" "BudgetStatus" NOT NULL,
  "observation" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "budget_approvals_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "budget_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "budget_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "action" "BudgetHistoryAction" NOT NULL,
  "previous_status" "BudgetStatus",
  "new_status" "BudgetStatus" NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "budget_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "budgets_number_key" ON "budgets"("number");
CREATE INDEX "budgets_organization_id_status_created_at_idx" ON "budgets"("organization_id", "status", "created_at");
CREATE INDEX "budgets_operation_id_status_idx" ON "budgets"("operation_id", "status");
CREATE INDEX "budgets_customer_id_created_at_idx" ON "budgets"("customer_id", "created_at");
CREATE INDEX "budgets_equipment_id_created_at_idx" ON "budgets"("equipment_id", "created_at");
CREATE INDEX "budgets_expiration_date_idx" ON "budgets"("expiration_date");
CREATE INDEX "budget_items_budget_id_idx" ON "budget_items"("budget_id");
CREATE INDEX "budget_items_product_id_idx" ON "budget_items"("product_id");
CREATE INDEX "budget_approvals_budget_id_created_at_idx" ON "budget_approvals"("budget_id", "created_at");
CREATE INDEX "budget_approvals_actor_id_created_at_idx" ON "budget_approvals"("actor_id", "created_at");
CREATE INDEX "budget_history_budget_id_created_at_idx" ON "budget_history"("budget_id", "created_at");
CREATE INDEX "budget_history_actor_id_created_at_idx" ON "budget_history"("actor_id", "created_at");
CREATE INDEX "budget_history_action_created_at_idx" ON "budget_history"("action", "created_at");

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "operations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_customer_address_id_fkey"
  FOREIGN KEY ("customer_address_id") REFERENCES "customer_addresses"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_equipment_id_fkey"
  FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budgets"
  ADD CONSTRAINT "budgets_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "budget_items"
  ADD CONSTRAINT "budget_items_budget_id_fkey"
  FOREIGN KEY ("budget_id") REFERENCES "budgets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_items"
  ADD CONSTRAINT "budget_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "budget_approvals"
  ADD CONSTRAINT "budget_approvals_budget_id_fkey"
  FOREIGN KEY ("budget_id") REFERENCES "budgets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_approvals"
  ADD CONSTRAINT "budget_approvals_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "budget_history"
  ADD CONSTRAINT "budget_history_budget_id_fkey"
  FOREIGN KEY ("budget_id") REFERENCES "budgets"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "budget_history"
  ADD CONSTRAINT "budget_history_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
