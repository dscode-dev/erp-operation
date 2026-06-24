CREATE TYPE "CustomerType" AS ENUM ('PERSON', 'COMPANY');

CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "CustomerType" NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "trade_name" VARCHAR(180),
    "cpf" VARCHAR(14),
    "cnpj" VARCHAR(18),
    "email" VARCHAR(254),
    "phone" VARCHAR(30),
    "secondary_phone" VARCHAR(30),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "disabled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_addresses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "zip_code" VARCHAR(9) NOT NULL,
    "street" VARCHAR(180) NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "complement" VARCHAR(120),
    "district" VARCHAR(100) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(2) NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_contacts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "role" VARCHAR(100),
    "phone" VARCHAR(30),
    "email" VARCHAR(254),
    "notes" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "customer_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customers_cpf_key" ON "customers"("cpf");
CREATE UNIQUE INDEX "customers_cnpj_key" ON "customers"("cnpj");
CREATE INDEX "customers_name_idx" ON "customers"("name");
CREATE INDEX "customers_email_idx" ON "customers"("email");
CREATE INDEX "customers_phone_idx" ON "customers"("phone");
CREATE INDEX "customers_is_active_type_idx" ON "customers"("is_active", "type");
CREATE INDEX "customer_addresses_customer_id_is_primary_idx" ON "customer_addresses"("customer_id", "is_primary");
CREATE INDEX "customer_contacts_customer_id_is_primary_idx" ON "customer_contacts"("customer_id", "is_primary");
CREATE UNIQUE INDEX "customer_attachments_storage_key_key" ON "customer_attachments"("storage_key");
CREATE INDEX "customer_attachments_customer_id_created_at_idx" ON "customer_attachments"("customer_id", "created_at");

ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_attachments" ADD CONSTRAINT "customer_attachments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
