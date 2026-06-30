CREATE TYPE "AssetLifecycleEventType" AS ENUM (
  'INSTALLATION',
  'INSPECTION',
  'PREVENTIVE',
  'CORRECTIVE',
  'MAINTENANCE',
  'PART_REPLACEMENT',
  'WARRANTY',
  'DOCUMENT',
  'NOTE',
  'CUSTOM'
);

CREATE TABLE "asset_lifecycle_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "equipment_id" UUID NOT NULL,
  "operation_id" UUID,
  "document_id" UUID,
  "type" "AssetLifecycleEventType" NOT NULL,
  "occurred_at" TIMESTAMPTZ(3) NOT NULL,
  "performed_by" UUID,
  "description" TEXT NOT NULL,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_lifecycle_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "asset_lifecycle_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL,
  "storage_key" VARCHAR(255) NOT NULL,
  "original_file_name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "file_size" INTEGER NOT NULL,
  "category" VARCHAR(80) NOT NULL,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_lifecycle_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "asset_lifecycle_attachments_storage_key_key" ON "asset_lifecycle_attachments"("storage_key");
CREATE INDEX "asset_lifecycle_eq_at_idx" ON "asset_lifecycle_events"("equipment_id", "occurred_at");
CREATE INDEX "asset_lifecycle_events_operation_id_idx" ON "asset_lifecycle_events"("operation_id");
CREATE INDEX "asset_lifecycle_events_document_id_idx" ON "asset_lifecycle_events"("document_id");
CREATE INDEX "asset_lifecycle_events_type_occurred_at_idx" ON "asset_lifecycle_events"("type", "occurred_at");
CREATE INDEX "asset_lifecycle_events_performed_by_occurred_at_idx" ON "asset_lifecycle_events"("performed_by", "occurred_at");
CREATE INDEX "asset_lifecycle_attachments_event_id_created_at_idx" ON "asset_lifecycle_attachments"("event_id", "created_at");
CREATE INDEX "asset_lifecycle_attachments_deleted_at_idx" ON "asset_lifecycle_attachments"("deleted_at");

ALTER TABLE "asset_lifecycle_events"
  ADD CONSTRAINT "asset_lifecycle_events_equipment_id_fkey"
  FOREIGN KEY ("equipment_id") REFERENCES "equipments"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "asset_lifecycle_events"
  ADD CONSTRAINT "asset_lifecycle_events_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "operations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "asset_lifecycle_events"
  ADD CONSTRAINT "asset_lifecycle_events_document_id_fkey"
  FOREIGN KEY ("document_id") REFERENCES "operation_documents"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "asset_lifecycle_events"
  ADD CONSTRAINT "asset_lifecycle_events_performed_by_fkey"
  FOREIGN KEY ("performed_by") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "asset_lifecycle_attachments"
  ADD CONSTRAINT "asset_lifecycle_attachments_event_id_fkey"
  FOREIGN KEY ("event_id") REFERENCES "asset_lifecycle_events"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
