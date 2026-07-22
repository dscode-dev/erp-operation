ALTER TABLE "products"
  ADD COLUMN "is_purchasable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "is_sellable" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "products"
  ADD CONSTRAINT "products_commercial_classification_ck"
  CHECK ("is_purchasable" OR "is_sellable");

CREATE INDEX "products_purchasable_active_idx"
  ON "products"("is_purchasable", "is_active");

CREATE INDEX "products_sellable_active_idx"
  ON "products"("is_sellable", "is_active");
