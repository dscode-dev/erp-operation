CREATE TYPE "EquipmentType" AS ENUM ('SPLIT', 'CHILLER', 'CONDENSER', 'EVAPORATOR', 'AIR_HANDLER', 'SOLAR_INVERTER', 'ELECTRICAL_PANEL', 'GENERATOR', 'OTHER');
CREATE TYPE "EquipmentStatus" AS ENUM ('ACTIVE', 'MAINTENANCE', 'INACTIVE', 'RETIRED');
CREATE TYPE "EquipmentAttachmentCategory" AS ENUM ('PHOTO', 'MANUAL', 'WARRANTY', 'DOCUMENT');

CREATE TABLE "equipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "address_id" UUID,
    "parent_equipment_id" UUID,
    "type" "EquipmentType" NOT NULL,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "name" VARCHAR(180) NOT NULL,
    "tag" VARCHAR(80),
    "manufacturer" VARCHAR(120),
    "model" VARCHAR(120),
    "serial_number" VARCHAR(120),
    "capacity" VARCHAR(80),
    "voltage" VARCHAR(40),
    "installation_date" DATE,
    "warranty_expiration" DATE,
    "observations" TEXT,
    "qr_token" UUID NOT NULL DEFAULT gen_random_uuid(),
    "qr_code" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "disabled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "equipments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "equipment_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "category" "EquipmentAttachmentCategory" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "equipment_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "equipment_metrics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "equipment_id" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "recorded_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "equipment_metrics_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "equipments_qr_token_key" ON "equipments"("qr_token");
CREATE UNIQUE INDEX "equipments_qr_code_key" ON "equipments"("qr_code");
CREATE INDEX "equipments_customer_id_status_idx" ON "equipments"("customer_id", "status");
CREATE INDEX "equipments_address_id_idx" ON "equipments"("address_id");
CREATE INDEX "equipments_parent_equipment_id_idx" ON "equipments"("parent_equipment_id");
CREATE INDEX "equipments_type_is_active_idx" ON "equipments"("type", "is_active");
CREATE INDEX "equipments_name_idx" ON "equipments"("name");
CREATE INDEX "equipments_tag_idx" ON "equipments"("tag");
CREATE INDEX "equipments_serial_number_idx" ON "equipments"("serial_number");
CREATE UNIQUE INDEX "equipment_attachments_storage_key_key" ON "equipment_attachments"("storage_key");
CREATE INDEX "equipment_attachments_equipment_id_created_at_idx" ON "equipment_attachments"("equipment_id", "created_at");
CREATE INDEX "equipment_metrics_equipment_id_recorded_at_idx" ON "equipment_metrics"("equipment_id", "recorded_at");
CREATE INDEX "equipment_metrics_equipment_id_key_idx" ON "equipment_metrics"("equipment_id", "key");

ALTER TABLE "equipments" ADD CONSTRAINT "equipments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "equipments" ADD CONSTRAINT "equipments_parent_equipment_id_fkey" FOREIGN KEY ("parent_equipment_id") REFERENCES "equipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "equipment_attachments" ADD CONSTRAINT "equipment_attachments_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "equipment_metrics" ADD CONSTRAINT "equipment_metrics_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
