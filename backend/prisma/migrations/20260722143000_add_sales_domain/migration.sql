CREATE TYPE "SaleStatus" AS ENUM ('DRAFT', 'COMPLETED', 'CANCELED');
CREATE TYPE "SaleHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'COMPLETED', 'CANCELED', 'RECEIPT_LINKED');

CREATE TABLE "sales" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "customer_id" UUID NOT NULL,
  "customer_address_id" UUID,
  "number" SERIAL NOT NULL,
  "status" "SaleStatus" NOT NULL DEFAULT 'DRAFT',
  "sold_at" TIMESTAMPTZ(3) NOT NULL,
  "warranty_days" INTEGER,
  "warranty_starts_at" DATE,
  "warranty_ends_at" DATE,
  "subtotal" DECIMAL(14,2) NOT NULL,
  "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(14,2) NOT NULL,
  "notes" TEXT,
  "created_by" UUID NOT NULL,
  "completed_at" TIMESTAMPTZ(3),
  "canceled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sale_items" (
  "id" UUID NOT NULL,
  "sale_id" UUID NOT NULL,
  "product_id" UUID,
  "description" VARCHAR(500) NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit" VARCHAR(20) NOT NULL,
  "snapshot_unit_price" DECIMAL(14,2) NOT NULL,
  "snapshot_cost" DECIMAL(14,2) NOT NULL,
  "total" DECIMAL(14,2) NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sale_history" (
  "id" UUID NOT NULL,
  "sale_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "action" "SaleHistoryAction" NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sale_history_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "operations" ADD COLUMN "source_sale_id" UUID;
CREATE UNIQUE INDEX "sales_number_key" ON "sales"("number");
CREATE INDEX "sales_organization_id_status_sold_at_idx" ON "sales"("organization_id", "status", "sold_at");
CREATE INDEX "sales_customer_id_sold_at_idx" ON "sales"("customer_id", "sold_at");
CREATE INDEX "sales_warranty_ends_at_idx" ON "sales"("warranty_ends_at");
CREATE INDEX "sale_items_sale_id_sort_order_idx" ON "sale_items"("sale_id", "sort_order");
CREATE INDEX "sale_items_product_id_idx" ON "sale_items"("product_id");
CREATE INDEX "sale_history_sale_id_created_at_idx" ON "sale_history"("sale_id", "created_at");
CREATE INDEX "sale_history_actor_id_created_at_idx" ON "sale_history"("actor_id", "created_at");
CREATE INDEX "operations_source_sale_id_idx" ON "operations"("source_sale_id");

ALTER TABLE "sales" ADD CONSTRAINT "sales_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_address_id_fkey" FOREIGN KEY ("customer_address_id") REFERENCES "customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sale_history" ADD CONSTRAINT "sale_history_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sale_history" ADD CONSTRAINT "sale_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operations" ADD CONSTRAINT "operations_source_sale_id_fkey" FOREIGN KEY ("source_sale_id") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
