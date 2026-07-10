CREATE TABLE IF NOT EXISTS "product_suppliers" (
  "id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "product_suppliers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "product_suppliers_product_id_supplier_id_key"
  ON "product_suppliers"("product_id", "supplier_id");

CREATE INDEX IF NOT EXISTS "product_suppliers_supplier_id_idx"
  ON "product_suppliers"("supplier_id");

CREATE INDEX IF NOT EXISTS "product_suppliers_product_id_is_primary_idx"
  ON "product_suppliers"("product_id", "is_primary");

ALTER TABLE "product_suppliers"
  ADD CONSTRAINT "product_suppliers_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_suppliers"
  ADD CONSTRAINT "product_suppliers_supplier_id_fkey"
  FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
