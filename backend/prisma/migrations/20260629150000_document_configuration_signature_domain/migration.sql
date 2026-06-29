-- Sprint 7: Document Configuration & Signature Domain

CREATE TYPE "SignatureMode" AS ENUM ('NONE', 'FIXED', 'COLLECTED', 'HYBRID');

CREATE TABLE "signatures" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(120) NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "image_storage_key" VARCHAR(255),
    "mime_type" VARCHAR(100),
    "original_file_name" VARCHAR(255),
    "file_size" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "signatures_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "signatures_image_storage_key_key" ON "signatures"("image_storage_key");
CREATE INDEX "signatures_active_name_idx" ON "signatures"("active", "name");

ALTER TABLE "document_templates"
  ADD COLUMN "requires_signature" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "signature_mode" "SignatureMode" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "signature_id" UUID;

CREATE INDEX "document_templates_signature_id_idx" ON "document_templates"("signature_id");

ALTER TABLE "document_templates"
  ADD CONSTRAINT "document_templates_signature_id_fkey"
  FOREIGN KEY ("signature_id") REFERENCES "signatures"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
