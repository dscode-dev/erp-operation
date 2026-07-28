CREATE TYPE "BudgetItemSource" AS ENUM ('MANUAL', 'CATALOG');

ALTER TABLE "budget_items"
ADD COLUMN "source" "BudgetItemSource" NOT NULL DEFAULT 'MANUAL';

-- Preserve the origin of catalog descriptions created before this discriminator
-- existed. Exact organization/type/title matching avoids reclassifying unrelated
-- manual material rows.
UPDATE "budget_items" AS "item"
SET
  "source" = 'CATALOG',
  "unit_price" = 0,
  "snapshot_cost" = 0,
  "snapshot_sale_price" = 0,
  "snapshot_margin" = 0,
  "total" = 0
FROM "budgets" AS "budget"
WHERE "budget"."id" = "item"."budget_id"
  AND "item"."type" = 'MATERIAL'
  AND EXISTS (
    SELECT 1
    FROM "technical_catalogs" AS "catalog"
    WHERE "catalog"."organization_id" = "budget"."organization_id"
      AND "catalog"."type" = 'BUDGET_MATERIAL_DESCRIPTION'
      AND "catalog"."title" = "item"."description"
  );

CREATE INDEX "budget_items_budget_source_sort_order_idx"
ON "budget_items"("budget_id", "source", "sort_order");
