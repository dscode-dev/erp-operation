CREATE TYPE "DocumentEditorialStatus" AS ENUM ('DRAFT', 'PENDING', 'READY', 'STALE');
CREATE TYPE "DocumentHandoffOrigin" AS ENUM ('OPERATOR', 'PLATFORM', 'SYSTEM');
CREATE TYPE "DocumentRevisionAction" AS ENUM (
  'DRAFT_SAVED', 'SUBMITTED', 'REVIEW_STARTED', 'REVIEW_UPDATED',
  'TECHNICAL_SIGNATURE_SELECTED', 'FINALIZED', 'MARKED_STALE', 'RENDERED'
);

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DOCUMENT_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DOCUMENT_READY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DOCUMENT_STALE';
ALTER TYPE "NotificationEntityType" ADD VALUE IF NOT EXISTS 'DOCUMENT';

ALTER TABLE "signatures"
  ADD COLUMN "organization_id" UUID,
  ADD COLUMN "profession" VARCHAR(120),
  ADD COLUMN "registration_number" VARCHAR(80),
  ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

UPDATE "signatures"
SET "organization_id" = (SELECT "id" FROM "organizations" ORDER BY "created_at" ASC LIMIT 1)
WHERE "organization_id" IS NULL;

ALTER TABLE "signatures" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "signatures"
  ADD CONSTRAINT "signatures_organization_id_fkey"
  FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "signatures_organization_id_active_position_idx"
  ON "signatures"("organization_id", "active", "position");
CREATE UNIQUE INDEX "signatures_one_active_default_per_organization_uq"
  ON "signatures"("organization_id")
  WHERE "is_default" = true AND "active" = true AND "deleted_at" IS NULL;

ALTER TABLE "operation_documents"
  ADD COLUMN "editorial_status" "DocumentEditorialStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "handoff_origin" "DocumentHandoffOrigin" NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "collected_by_id" UUID,
  ADD COLUMN "submitted_at" TIMESTAMPTZ(3),
  ADD COLUMN "reviewed_by_id" UUID,
  ADD COLUMN "review_started_at" TIMESTAMPTZ(3),
  ADD COLUMN "finalized_by_id" UUID,
  ADD COLUMN "finalized_at" TIMESTAMPTZ(3),
  ADD COLUMN "technical_signature_id" UUID,
  ADD COLUMN "technical_signature_snapshot" JSONB,
  ADD COLUMN "customer_signature_snapshot" JSONB,
  ADD COLUMN "collection_snapshot" JSONB,
  ADD COLUMN "validation_issues" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;

UPDATE "operation_documents"
SET "editorial_status" = CASE
  WHEN "rendered_at" IS NOT NULL THEN 'READY'::"DocumentEditorialStatus"
  ELSE 'DRAFT'::"DocumentEditorialStatus"
END;

ALTER TABLE "operation_documents"
  ADD CONSTRAINT "operation_documents_collected_by_id_fkey"
  FOREIGN KEY ("collected_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "operation_documents_reviewed_by_id_fkey"
  FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "operation_documents_finalized_by_id_fkey"
  FOREIGN KEY ("finalized_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "operation_documents_technical_signature_id_fkey"
  FOREIGN KEY ("technical_signature_id") REFERENCES "signatures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "operation_documents_editorial_status_submitted_at_idx"
  ON "operation_documents"("editorial_status", "submitted_at");
CREATE INDEX "operation_documents_handoff_origin_editorial_status_updated_at_idx"
  ON "operation_documents"("handoff_origin", "editorial_status", "updated_at");
CREATE INDEX "operation_documents_technical_signature_id_idx"
  ON "operation_documents"("technical_signature_id");

CREATE TABLE "document_revisions" (
  "id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "revision" INTEGER NOT NULL,
  "action" "DocumentRevisionAction" NOT NULL,
  "origin" "DocumentHandoffOrigin" NOT NULL,
  "actor_id" UUID NOT NULL,
  "changed_fields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "snapshot" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "document_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "document_revisions_document_id_fkey"
    FOREIGN KEY ("document_id") REFERENCES "operation_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "document_revisions_actor_id_fkey"
    FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "document_revisions_document_id_revision_key"
  ON "document_revisions"("document_id", "revision");
CREATE INDEX "document_revisions_document_id_created_at_idx"
  ON "document_revisions"("document_id", "created_at");
CREATE INDEX "document_revisions_actor_id_created_at_idx"
  ON "document_revisions"("actor_id", "created_at");
