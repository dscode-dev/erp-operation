-- Additive workflow for operator-requested Operation cancellations.
CREATE TYPE "OperationCancellationStatus" AS ENUM ('REQUESTED', 'RESCHEDULED', 'APPROVED');

CREATE TABLE "operation_cancellations" (
    "id" UUID NOT NULL,
    "operation_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "technical_signature_id" UUID NOT NULL,
    "status" "OperationCancellationStatus" NOT NULL DEFAULT 'REQUESTED',
    "reason" TEXT NOT NULL,
    "customer_signature_data" TEXT,
    "customer_signer_name" VARCHAR(180),
    "customer_signer_role" VARCHAR(120),
    "customer_signed_at" TIMESTAMPTZ(3),
    "requested_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "rescheduled_for" TIMESTAMPTZ(3),
    "resolution_notes" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "operation_cancellations_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "operation_cancellations_reason_not_blank" CHECK (length(btrim("reason")) > 0),
    CONSTRAINT "operation_cancellations_customer_signature_consistent" CHECK (
      ("customer_signature_data" IS NULL AND "customer_signed_at" IS NULL)
      OR
      ("customer_signature_data" IS NOT NULL AND "customer_signer_name" IS NOT NULL AND "customer_signed_at" IS NOT NULL)
    )
);

ALTER TABLE "operation_photos" ADD COLUMN "cancellation_id" UUID;

CREATE INDEX "operation_cancellations_operation_id_requested_at_idx"
  ON "operation_cancellations"("operation_id", "requested_at");
CREATE INDEX "operation_cancellations_assignment_id_requested_at_idx"
  ON "operation_cancellations"("assignment_id", "requested_at");
CREATE INDEX "operation_cancellations_status_requested_at_idx"
  ON "operation_cancellations"("status", "requested_at");
CREATE UNIQUE INDEX "operation_cancellations_one_requested_per_operation_uq"
  ON "operation_cancellations"("operation_id") WHERE "status" = 'REQUESTED';
CREATE INDEX "operation_cancellations_requested_by_id_requested_at_idx"
  ON "operation_cancellations"("requested_by_id", "requested_at");
CREATE INDEX "operation_photos_cancellation_id_created_at_idx"
  ON "operation_photos"("cancellation_id", "created_at");

ALTER TABLE "operation_cancellations"
  ADD CONSTRAINT "operation_cancellations_operation_id_fkey"
  FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "operation_cancellations"
  ADD CONSTRAINT "operation_cancellations_assignment_id_fkey"
  FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operation_cancellations"
  ADD CONSTRAINT "operation_cancellations_requested_by_id_fkey"
  FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operation_cancellations"
  ADD CONSTRAINT "operation_cancellations_resolved_by_id_fkey"
  FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "operation_cancellations"
  ADD CONSTRAINT "operation_cancellations_technical_signature_id_fkey"
  FOREIGN KEY ("technical_signature_id") REFERENCES "signatures"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "operation_photos"
  ADD CONSTRAINT "operation_photos_cancellation_id_fkey"
  FOREIGN KEY ("cancellation_id") REFERENCES "operation_cancellations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
