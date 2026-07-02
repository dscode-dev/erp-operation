CREATE TYPE "FinancialAccountType" AS ENUM ('CASH', 'BANK', 'CREDIT_CARD', 'DIGITAL_WALLET', 'OTHER');
CREATE TYPE "FinancialCategoryType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');
CREATE TYPE "FinancialEntryType" AS ENUM ('RECEIVABLE', 'PAYABLE', 'TRANSFER');
CREATE TYPE "FinancialEntryStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED', 'OVERDUE');
CREATE TYPE "FinancialEntryOrigin" AS ENUM ('MANUAL', 'BUDGET', 'PURCHASE', 'OPERATION', 'PMOC', 'OTHER');
CREATE TYPE "FinancialHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'PAID', 'CANCELED', 'RESTORED');

ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'FINANCIAL_ENTRY_CREATED';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'FINANCIAL_ENTRY_PAID';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'FINANCIAL_ENTRY_CANCELED';

CREATE TABLE "financial_accounts" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "name" VARCHAR(140) NOT NULL,
  "type" "FinancialAccountType" NOT NULL,
  "description" TEXT,
  "opening_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "current_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "financial_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_categories" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "name" VARCHAR(140) NOT NULL,
  "type" "FinancialCategoryType" NOT NULL,
  "color" VARCHAR(20),
  "icon" VARCHAR(80),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_entries" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "type" "FinancialEntryType" NOT NULL,
  "origin" "FinancialEntryOrigin" NOT NULL DEFAULT 'MANUAL',
  "origin_id" UUID,
  "amount" DECIMAL(14,2) NOT NULL,
  "due_date" TIMESTAMPTZ(3) NOT NULL,
  "paid_at" TIMESTAMPTZ(3),
  "description" VARCHAR(180) NOT NULL,
  "notes" TEXT,
  "status" "FinancialEntryStatus" NOT NULL DEFAULT 'PENDING',
  "created_by" UUID NOT NULL,
  "canceled_at" TIMESTAMPTZ(3),
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "financial_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_entry_allocations" (
  "id" UUID NOT NULL,
  "entry_id" UUID NOT NULL,
  "category_id" UUID NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "notes" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_entry_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_history" (
  "id" UUID NOT NULL,
  "entry_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "action" "FinancialHistoryAction" NOT NULL,
  "previous_status" "FinancialEntryStatus",
  "new_status" "FinancialEntryStatus" NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "financial_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "financial_accounts_organization_id_active_idx" ON "financial_accounts"("organization_id", "active");
CREATE INDEX "financial_accounts_type_active_idx" ON "financial_accounts"("type", "active");

CREATE INDEX "financial_categories_organization_id_type_active_idx" ON "financial_categories"("organization_id", "type", "active");
CREATE INDEX "financial_categories_name_idx" ON "financial_categories"("name");

CREATE INDEX "financial_entries_organization_id_status_due_date_idx" ON "financial_entries"("organization_id", "status", "due_date");
CREATE INDEX "financial_entries_account_id_status_due_date_idx" ON "financial_entries"("account_id", "status", "due_date");
CREATE INDEX "financial_entries_category_id_due_date_idx" ON "financial_entries"("category_id", "due_date");
CREATE INDEX "financial_entries_type_status_due_date_idx" ON "financial_entries"("type", "status", "due_date");
CREATE INDEX "financial_entries_origin_origin_id_idx" ON "financial_entries"("origin", "origin_id");
CREATE INDEX "financial_entries_created_by_created_at_idx" ON "financial_entries"("created_by", "created_at");

CREATE INDEX "financial_entry_allocations_entry_id_idx" ON "financial_entry_allocations"("entry_id");
CREATE INDEX "financial_entry_allocations_category_id_idx" ON "financial_entry_allocations"("category_id");

CREATE INDEX "financial_history_entry_id_created_at_idx" ON "financial_history"("entry_id", "created_at");
CREATE INDEX "financial_history_actor_id_created_at_idx" ON "financial_history"("actor_id", "created_at");
CREATE INDEX "financial_history_action_created_at_idx" ON "financial_history"("action", "created_at");

ALTER TABLE "financial_accounts" ADD CONSTRAINT "financial_accounts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_categories" ADD CONSTRAINT "financial_categories_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "financial_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "financial_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_entries" ADD CONSTRAINT "financial_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_entry_allocations" ADD CONSTRAINT "financial_entry_allocations_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "financial_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_entry_allocations" ADD CONSTRAINT "financial_entry_allocations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "financial_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_history" ADD CONSTRAINT "financial_history_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "financial_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "financial_history" ADD CONSTRAINT "financial_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
