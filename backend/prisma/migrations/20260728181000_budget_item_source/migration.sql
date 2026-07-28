CREATE TYPE "BudgetItemSource" AS ENUM ('MANUAL', 'CATALOG');

ALTER TABLE "budget_items"
ADD COLUMN "source" "BudgetItemSource" NOT NULL DEFAULT 'MANUAL';

-- Preserve the origin of catalog descriptions created before this discriminator
-- existed. Exact organization/type/title matching avoids reclassifying unrelated
-- manual material rows.
UPDATE "budget_items" AS "item"
SET "source" = 'CATALOG'
FROM "budgets" AS "budget"
WHERE "budget"."id" = "item"."budget_id"
  AND "item"."type" = 'MATERIAL'
  -- A origem anterior não é demonstrável apenas pelo texto. Para preservar
  -- integralmente valores comerciais existentes, somente snapshots que já
  -- eram totalmente informativos (todos os valores zerados) são classificados
  -- como catálogo. Qualquer item com valor permanece MANUAL.
  AND "item"."unit_price" = 0
  AND "item"."snapshot_cost" = 0
  AND "item"."snapshot_sale_price" = 0
  AND "item"."snapshot_margin" = 0
  AND "item"."total" = 0
  AND EXISTS (
    SELECT 1
    FROM "technical_catalogs" AS "catalog"
    WHERE "catalog"."organization_id" = "budget"."organization_id"
      AND "catalog"."type" = 'BUDGET_MATERIAL_DESCRIPTION'
      AND "catalog"."title" = "item"."description"
  );

CREATE INDEX "budget_items_budget_source_sort_order_idx"
ON "budget_items"("budget_id", "source", "sort_order");
