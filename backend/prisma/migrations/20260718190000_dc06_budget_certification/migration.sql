CREATE TYPE "BudgetItemType" AS ENUM ('SERVICE', 'MATERIAL');
CREATE TYPE "BudgetPaymentMethod" AS ENUM ('CASH', 'PIX', 'CREDIT_CARD');

ALTER TABLE "budgets"
  ADD COLUMN "issued_at" TIMESTAMPTZ(3),
  ADD COLUMN "introduction" TEXT,
  ADD COLUMN "service_subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "material_subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
  ADD COLUMN "amount_in_words" VARCHAR(500),
  ADD COLUMN "validity_days" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "payment_methods" "BudgetPaymentMethod"[] NOT NULL DEFAULT ARRAY[]::"BudgetPaymentMethod"[],
  ADD COLUMN "commercial_notes" TEXT;

UPDATE "budgets"
SET
  "issued_at" = "created_at",
  "introduction" = 'Atendendo à honrosa solicitação de V.Sa., apresentamos nosso orçamento conforme solicitado.',
  "material_subtotal" = "subtotal",
  "amount_in_words" = 'Valor registrado: R$ ' || REPLACE(TO_CHAR("total", 'FM999999999990D00'), '.', ',');

ALTER TABLE "budgets"
  ALTER COLUMN "issued_at" SET NOT NULL,
  ALTER COLUMN "issued_at" SET DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "introduction" SET NOT NULL,
  ALTER COLUMN "amount_in_words" SET NOT NULL;

ALTER TABLE "budget_items"
  ADD COLUMN "type" "BudgetItemType" NOT NULL DEFAULT 'MATERIAL',
  ADD COLUMN "unit_price" DECIMAL(14,2),
  ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

UPDATE "budget_items"
SET "unit_price" = "snapshot_sale_price";

WITH ordered AS (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "budget_id" ORDER BY "created_at", "id") - 1 AS position
  FROM "budget_items"
)
UPDATE "budget_items" item
SET "sort_order" = ordered.position
FROM ordered
WHERE item."id" = ordered."id";

ALTER TABLE "budget_items"
  ALTER COLUMN "unit_price" SET NOT NULL,
  ALTER COLUMN "product_id" DROP NOT NULL;

ALTER TABLE "budget_items" DROP CONSTRAINT "budget_items_product_id_fkey";
ALTER TABLE "budget_items"
  ADD CONSTRAINT "budget_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "budget_items_budget_id_type_sort_order_idx"
  ON "budget_items"("budget_id", "type", "sort_order");
