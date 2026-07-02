CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELED');
CREATE TYPE "PurchaseHistoryAction" AS ENUM ('CREATED', 'UPDATED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELED');

ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'PURCHASE_CREATED';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'PURCHASE_RECEIVED';
ALTER TYPE "AssetLifecycleEventType" ADD VALUE IF NOT EXISTS 'PURCHASE_CANCELED';

CREATE TABLE "purchase_orders" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "number" SERIAL NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "expected_delivery" TIMESTAMPTZ(3),
  "created_by" UUID NOT NULL,
  "canceled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_order_items" (
  "id" UUID NOT NULL,
  "purchase_order_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "quantity" DECIMAL(12,3) NOT NULL,
  "unit" VARCHAR(20) NOT NULL,
  "snapshot_cost" DECIMAL(14,2) NOT NULL,
  "snapshot_description" TEXT NOT NULL,
  "received_quantity" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_receipts" (
  "id" UUID NOT NULL,
  "purchase_order_id" UUID NOT NULL,
  "received_by" UUID NOT NULL,
  "received_at" TIMESTAMPTZ(3) NOT NULL,
  "notes" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_history" (
  "id" UUID NOT NULL,
  "purchase_order_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "action" "PurchaseHistoryAction" NOT NULL,
  "previous_status" "PurchaseOrderStatus",
  "new_status" "PurchaseOrderStatus" NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "purchase_history_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_orders_number_key" ON "purchase_orders"("number");
CREATE INDEX "purchase_orders_organization_id_status_created_at_idx" ON "purchase_orders"("organization_id", "status", "created_at");
CREATE INDEX "purchase_orders_supplier_id_created_at_idx" ON "purchase_orders"("supplier_id", "created_at");
CREATE INDEX "purchase_orders_expected_delivery_idx" ON "purchase_orders"("expected_delivery");
CREATE INDEX "purchase_order_items_purchase_order_id_deleted_at_idx" ON "purchase_order_items"("purchase_order_id", "deleted_at");
CREATE INDEX "purchase_order_items_product_id_idx" ON "purchase_order_items"("product_id");
CREATE INDEX "purchase_receipts_purchase_order_id_received_at_idx" ON "purchase_receipts"("purchase_order_id", "received_at");
CREATE INDEX "purchase_receipts_received_by_received_at_idx" ON "purchase_receipts"("received_by", "received_at");
CREATE INDEX "purchase_history_purchase_order_id_created_at_idx" ON "purchase_history"("purchase_order_id", "created_at");
CREATE INDEX "purchase_history_actor_id_created_at_idx" ON "purchase_history"("actor_id", "created_at");
CREATE INDEX "purchase_history_action_created_at_idx" ON "purchase_history"("action", "created_at");

ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_history" ADD CONSTRAINT "purchase_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
