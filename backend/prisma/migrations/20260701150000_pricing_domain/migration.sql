-- CreateTable
CREATE TABLE "product_pricings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "cost_price" DECIMAL(14,2) NOT NULL,
    "replacement_cost" DECIMAL(14,2) NOT NULL,
    "average_cost" DECIMAL(14,2) NOT NULL,
    "sale_price" DECIMAL(14,2) NOT NULL,
    "minimum_sale_price" DECIMAL(14,2) NOT NULL,
    "suggested_sale_price" DECIMAL(14,2) NOT NULL,
    "margin_percentage" DECIMAL(7,2) NOT NULL,
    "valid_from" TIMESTAMPTZ(3) NOT NULL,
    "valid_until" TIMESTAMPTZ(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "product_pricings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_pricings_organization_id_active_idx" ON "product_pricings"("organization_id", "active");

-- CreateIndex
CREATE INDEX "product_pricings_product_id_active_valid_from_idx" ON "product_pricings"("product_id", "active", "valid_from");

-- CreateIndex
CREATE INDEX "product_pricings_product_id_valid_from_valid_until_idx" ON "product_pricings"("product_id", "valid_from", "valid_until");

-- CreateIndex
CREATE INDEX "product_pricings_valid_until_idx" ON "product_pricings"("valid_until");

-- AddForeignKey
ALTER TABLE "product_pricings" ADD CONSTRAINT "product_pricings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_pricings" ADD CONSTRAINT "product_pricings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
