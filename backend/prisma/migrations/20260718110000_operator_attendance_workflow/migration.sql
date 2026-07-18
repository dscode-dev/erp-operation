-- The requested document identifies the field deliverable without replacing
-- Operation (execution), Assignment (responsibility) or OperationDocument.
ALTER TABLE "operations"
  ADD COLUMN "requested_document_type" "DocumentTemplateType" NOT NULL DEFAULT 'WORK_ORDER';

-- Existing PMOC executions are unambiguous and can be safely backfilled.
UPDATE "operations" AS operation
SET "requested_document_type" = 'PMOC'::"DocumentTemplateType"
FROM "maintenance_executions" AS execution
JOIN "maintenance_plans" AS plan ON plan."id" = execution."maintenance_plan_id"
JOIN "pmoc_plans" AS pmoc ON pmoc."maintenance_plan_id" = plan."id"
WHERE execution."operation_id" = operation."id";

CREATE INDEX "operations_requested_document_status_idx"
  ON "operations"("requested_document_type", "status", "created_at");
