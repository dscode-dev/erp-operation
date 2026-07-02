ALTER TYPE "BudgetHistoryAction" ADD VALUE IF NOT EXISTS 'DOCUMENT_RENDERED';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'DOCUMENT_RENDERED';

ALTER TABLE "operation_documents"
  ADD COLUMN "budget_id" UUID;

ALTER TABLE "operation_documents"
  ALTER COLUMN "operation_id" DROP NOT NULL;

CREATE UNIQUE INDEX "operation_documents_budget_id_key" ON "operation_documents"("budget_id");
CREATE INDEX "operation_documents_budget_id_idx" ON "operation_documents"("budget_id");

ALTER TABLE "operation_documents"
  ADD CONSTRAINT "operation_documents_budget_id_fkey"
  FOREIGN KEY ("budget_id") REFERENCES "budgets"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
