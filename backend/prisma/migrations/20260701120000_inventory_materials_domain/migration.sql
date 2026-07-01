-- Inventory & Materials Domain

CREATE TYPE "StockMovementType" AS ENUM (
  'IN',
  'OUT',
  'ADJUSTMENT',
  'TRANSFER',
  'CONSUMPTION',
  'RETURN'
);

CREATE TABLE "products" (
  "id" UUID NOT NULL,
  "sku" VARCHAR(80) NOT NULL,
  "internal_code" VARCHAR(80),
  "manufacturer_code" VARCHAR(120),
  "name" VARCHAR(180) NOT NULL,
  "unit" VARCHAR(20) NOT NULL,
  "brand" VARCHAR(120),
  "model" VARCHAR(120),
  "category" VARCHAR(120),
  "technical_description" TEXT,
  "weight" DECIMAL(12,3),
  "dimensions" VARCHAR(120),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "disabled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "suppliers" (
  "id" UUID NOT NULL,
  "legal_name" VARCHAR(180) NOT NULL,
  "trade_name" VARCHAR(180),
  "document" VARCHAR(30),
  "contacts" JSONB NOT NULL DEFAULT '[]',
  "address" JSONB NOT NULL DEFAULT '{}',
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "disabled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory_items" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "current_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "minimum_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "ideal_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "reserved_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "available_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "location" VARCHAR(160),
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "disabled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stock_movements" (
  "id" UUID NOT NULL,
  "inventory_item_id" UUID NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "type" "StockMovementType" NOT NULL,
  "reason" VARCHAR(255) NOT NULL,
  "operation_id" UUID,
  "user_id" UUID NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "operation_parts" (
  "id" UUID NOT NULL,
  "operation_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "inventory_item_id" UUID NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "notes" TEXT,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "operation_parts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE UNIQUE INDEX "products_internal_code_key" ON "products"("internal_code");
CREATE UNIQUE INDEX "suppliers_document_key" ON "suppliers"("document");

CREATE INDEX "products_name_idx" ON "products"("name");
CREATE INDEX "products_category_is_active_idx" ON "products"("category", "is_active");
CREATE INDEX "products_brand_idx" ON "products"("brand");

CREATE INDEX "suppliers_legal_name_idx" ON "suppliers"("legal_name");
CREATE INDEX "suppliers_trade_name_idx" ON "suppliers"("trade_name");
CREATE INDEX "suppliers_is_active_idx" ON "suppliers"("is_active");

CREATE INDEX "inventory_items_organization_id_is_active_idx" ON "inventory_items"("organization_id", "is_active");
CREATE INDEX "inventory_items_product_id_idx" ON "inventory_items"("product_id");
CREATE INDEX "inventory_items_available_quantity_idx" ON "inventory_items"("available_quantity");
CREATE INDEX "inventory_items_minimum_quantity_idx" ON "inventory_items"("minimum_quantity");

CREATE INDEX "stock_movements_inventory_item_id_occurred_at_idx" ON "stock_movements"("inventory_item_id", "occurred_at");
CREATE INDEX "stock_movements_type_occurred_at_idx" ON "stock_movements"("type", "occurred_at");
CREATE INDEX "stock_movements_operation_id_idx" ON "stock_movements"("operation_id");
CREATE INDEX "stock_movements_user_id_occurred_at_idx" ON "stock_movements"("user_id", "occurred_at");

CREATE INDEX "operation_parts_operation_id_deleted_at_idx" ON "operation_parts"("operation_id", "deleted_at");
CREATE INDEX "operation_parts_product_id_idx" ON "operation_parts"("product_id");
CREATE INDEX "operation_parts_inventory_item_id_idx" ON "operation_parts"("inventory_item_id");

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inventory_items"
  ADD CONSTRAINT "inventory_items_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_movements"
  ADD CONSTRAINT "stock_movements_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "operation_parts"
  ADD CONSTRAINT "operation_parts_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "operation_parts"
  ADD CONSTRAINT "operation_parts_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "operation_parts"
  ADD CONSTRAINT "operation_parts_inventory_item_id_fkey"
  FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
