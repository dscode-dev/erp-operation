-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('PREVENTIVA', 'CORRETIVA', 'INSTALACAO', 'PROJETO');
CREATE TYPE "OperationStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'COMPLETED', 'CANCELED');
CREATE TYPE "OperationDocumentStatus" AS ENUM ('DRAFT', 'READY', 'VALIDATED', 'SENT');

-- CreateTable
CREATE TABLE "operations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "number" SERIAL NOT NULL,
    "customer_id" UUID NOT NULL,
    "address_id" UUID,
    "equipment_id" UUID,
    "operator_id" UUID NOT NULL,
    "type" "OperationType" NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduled_for" TIMESTAMPTZ(3),
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "observations" TEXT,
    "signature_data" TEXT,
    "signed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation_id" UUID NOT NULL,
    "storage_key" VARCHAR(255) NOT NULL,
    "caption" VARCHAR(255),
    "mime_type" VARCHAR(100) NOT NULL,
    "file_size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "operation_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "operation_id" UUID NOT NULL,
    "type" "DocumentTemplateType" NOT NULL,
    "number" VARCHAR(40) NOT NULL,
    "status" "OperationDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "operation_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "operations_number_key" ON "operations"("number");
CREATE INDEX "operations_customer_id_created_at_idx" ON "operations"("customer_id", "created_at");
CREATE INDEX "operations_equipment_id_created_at_idx" ON "operations"("equipment_id", "created_at");
CREATE INDEX "operations_operator_id_created_at_idx" ON "operations"("operator_id", "created_at");
CREATE INDEX "operations_status_created_at_idx" ON "operations"("status", "created_at");

CREATE UNIQUE INDEX "operation_photos_storage_key_key" ON "operation_photos"("storage_key");
CREATE INDEX "operation_photos_operation_id_created_at_idx" ON "operation_photos"("operation_id", "created_at");

CREATE UNIQUE INDEX "operation_documents_operation_id_type_key" ON "operation_documents"("operation_id", "type");
CREATE INDEX "operation_documents_type_status_idx" ON "operation_documents"("type", "status");

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operations" ADD CONSTRAINT "operations_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "customer_addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operations" ADD CONSTRAINT "operations_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operations" ADD CONSTRAINT "operations_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operation_photos" ADD CONSTRAINT "operation_photos_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operation_documents" ADD CONSTRAINT "operation_documents_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
