-- Sprint 6: Document Engine Foundation
-- Adds production render metadata to documents produced from operations.

ALTER TABLE "operation_documents"
  ADD COLUMN "storage_key" VARCHAR(255),
  ADD COLUMN "mime_type" VARCHAR(100),
  ADD COLUMN "file_size" INTEGER,
  ADD COLUMN "rendered_at" TIMESTAMPTZ(3),
  ADD COLUMN "render_metadata" JSONB;

CREATE UNIQUE INDEX "operation_documents_storage_key_key" ON "operation_documents"("storage_key");
CREATE INDEX "operation_documents_rendered_at_idx" ON "operation_documents"("rendered_at");
