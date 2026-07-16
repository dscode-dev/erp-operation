CREATE TYPE "PmocPeriodicity" AS ENUM (
  'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'BIMONTHLY', 'QUARTERLY',
  'FOUR_MONTHLY', 'SEMIANNUAL', 'YEARLY', 'CUSTOM'
);

CREATE TYPE "PmocGenerationMode" AS ENUM ('AUTO', 'MANUAL', 'PAUSED');
CREATE TYPE "PmocOperationalStatus" AS ENUM ('ACTIVE', 'PENDING', 'OVERDUE', 'PAUSED', 'ERROR', 'EXPIRED');
CREATE TYPE "PmocExecutionRequestStatus" AS ENUM ('PENDING', 'GENERATING_OS', 'GENERATED', 'FAILED', 'CANCELLED');
CREATE TYPE "PmocExecutionOrigin" AS ENUM ('AUTO', 'MANUAL');
CREATE TYPE "PmocHistoryAction" AS ENUM (
  'CREATED', 'UPDATED', 'PERIODICITY_CHANGED', 'OPERATOR_CHANGED', 'COVERAGE_CHANGED',
  'REQUEST_CREATED', 'REQUEST_GENERATING_OS', 'OS_GENERATED_AUTO', 'OS_GENERATED_MANUAL',
  'REQUEST_FAILED', 'REQUEST_CANCELLED'
);

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PMOC_OS_GENERATED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PMOC_OS_GENERATION_FAILED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PMOC_EXECUTION_PENDING_MANUAL';

ALTER TABLE "pmoc_plans"
  ADD COLUMN "coverage" TEXT,
  ADD COLUMN "periodicity" "PmocPeriodicity" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN "generation_mode" "PmocGenerationMode" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "default_operator_id" UUID,
  ADD COLUMN "default_technician_id" UUID,
  ADD COLUMN "signature_override_id" UUID,
  ADD COLUMN "operational_status" "PmocOperationalStatus" NOT NULL DEFAULT 'ACTIVE';

UPDATE "pmoc_plans" AS pmoc
SET
  "periodicity" = CASE
    WHEN plan."recurrence_rule"->>'frequency' = 'WEEKLY' AND COALESCE((plan."recurrence_rule"->>'interval')::integer, 1) = 2 THEN 'BIWEEKLY'::"PmocPeriodicity"
    WHEN plan."recurrence_rule"->>'frequency' = 'WEEKLY' THEN 'WEEKLY'::"PmocPeriodicity"
    WHEN plan."recurrence_rule"->>'frequency' = 'MONTHLY' AND COALESCE((plan."recurrence_rule"->>'interval')::integer, 1) = 2 THEN 'BIMONTHLY'::"PmocPeriodicity"
    WHEN plan."recurrence_rule"->>'frequency' = 'MONTHLY' AND COALESCE((plan."recurrence_rule"->>'interval')::integer, 1) = 3 THEN 'QUARTERLY'::"PmocPeriodicity"
    WHEN plan."recurrence_rule"->>'frequency' = 'MONTHLY' AND COALESCE((plan."recurrence_rule"->>'interval')::integer, 1) = 4 THEN 'FOUR_MONTHLY'::"PmocPeriodicity"
    WHEN plan."recurrence_rule"->>'frequency' = 'MONTHLY' AND COALESCE((plan."recurrence_rule"->>'interval')::integer, 1) = 6 THEN 'SEMIANNUAL'::"PmocPeriodicity"
    WHEN plan."recurrence_rule"->>'frequency' = 'MONTHLY' THEN 'MONTHLY'::"PmocPeriodicity"
    WHEN plan."recurrence_rule"->>'frequency' = 'YEARLY' THEN 'YEARLY'::"PmocPeriodicity"
    ELSE 'CUSTOM'::"PmocPeriodicity"
  END,
  "operational_status" = CASE
    WHEN NOT pmoc."active" THEN 'PAUSED'::"PmocOperationalStatus"
    WHEN pmoc."end_date" < CURRENT_DATE THEN 'EXPIRED'::"PmocOperationalStatus"
    ELSE 'ACTIVE'::"PmocOperationalStatus"
  END
FROM "maintenance_plans" AS plan
WHERE plan."id" = pmoc."maintenance_plan_id";

CREATE TABLE "pmoc_execution_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pmoc_plan_id" UUID NOT NULL,
  "maintenance_execution_id" UUID,
  "operation_id" UUID,
  "status" "PmocExecutionRequestStatus" NOT NULL DEFAULT 'PENDING',
  "origin" "PmocExecutionOrigin" NOT NULL,
  "scheduled_for" TIMESTAMPTZ(3) NOT NULL,
  "requested_by" UUID,
  "attempt_count" INTEGER NOT NULL DEFAULT 0,
  "last_attempt_at" TIMESTAMPTZ(3),
  "failure_reason" VARCHAR(1000),
  "generated_at" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pmoc_execution_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pmoc_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pmoc_plan_id" UUID NOT NULL,
  "execution_request_id" UUID,
  "operation_id" UUID,
  "actor_id" UUID,
  "action" "PmocHistoryAction" NOT NULL,
  "previous_status" VARCHAR(50),
  "new_status" VARCHAR(50),
  "notes" VARCHAR(1000),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pmoc_history_pkey" PRIMARY KEY ("id")
);

INSERT INTO "pmoc_execution_requests" (
  "pmoc_plan_id", "maintenance_execution_id", "operation_id", "status", "origin",
  "scheduled_for", "generated_at", "created_at", "updated_at"
)
SELECT DISTINCT ON (pmoc."id", execution."scheduled_at")
  pmoc."id",
  execution."id",
  execution."operation_id",
  CASE
    WHEN execution."status" = 'CANCELED' THEN 'CANCELLED'::"PmocExecutionRequestStatus"
    WHEN execution."operation_id" IS NOT NULL THEN 'GENERATED'::"PmocExecutionRequestStatus"
    ELSE 'PENDING'::"PmocExecutionRequestStatus"
  END,
  'MANUAL'::"PmocExecutionOrigin",
  execution."scheduled_at",
  CASE WHEN execution."operation_id" IS NOT NULL THEN execution."created_at" ELSE NULL END,
  execution."created_at",
  execution."created_at"
FROM "pmoc_plans" AS pmoc
INNER JOIN "maintenance_executions" AS execution
  ON execution."maintenance_plan_id" = pmoc."maintenance_plan_id"
ORDER BY pmoc."id", execution."scheduled_at", execution."created_at", execution."id";

INSERT INTO "pmoc_history" ("pmoc_plan_id", "action", "new_status", "notes", "occurred_at", "created_at")
SELECT "id", 'CREATED'::"PmocHistoryAction", "operational_status"::text,
       'Histórico inicial migrado para PMOC Foundation.', "created_at", "created_at"
FROM "pmoc_plans";

INSERT INTO "pmoc_history" (
  "pmoc_plan_id", "execution_request_id", "operation_id", "action",
  "new_status", "notes", "occurred_at", "created_at"
)
SELECT request."pmoc_plan_id", request."id", request."operation_id",
       CASE WHEN request."status" = 'GENERATED'
         THEN 'OS_GENERATED_MANUAL'::"PmocHistoryAction"
         ELSE 'REQUEST_CREATED'::"PmocHistoryAction"
       END,
       request."status"::text, 'Histórico da execução migrado para PMOC Foundation.',
       request."created_at", request."created_at"
FROM "pmoc_execution_requests" AS request;

CREATE UNIQUE INDEX "pmoc_execution_requests_maintenance_execution_id_key" ON "pmoc_execution_requests"("maintenance_execution_id");
CREATE UNIQUE INDEX "pmoc_execution_requests_operation_id_key" ON "pmoc_execution_requests"("operation_id");
CREATE UNIQUE INDEX "pmoc_execution_requests_pmoc_plan_id_scheduled_for_key" ON "pmoc_execution_requests"("pmoc_plan_id", "scheduled_for");
CREATE INDEX "pmoc_execution_requests_status_scheduled_for_idx" ON "pmoc_execution_requests"("status", "scheduled_for");
CREATE INDEX "pmoc_execution_requests_pmoc_plan_id_created_at_idx" ON "pmoc_execution_requests"("pmoc_plan_id", "created_at");
CREATE INDEX "pmoc_history_pmoc_plan_id_occurred_at_idx" ON "pmoc_history"("pmoc_plan_id", "occurred_at");
CREATE INDEX "pmoc_history_execution_request_id_idx" ON "pmoc_history"("execution_request_id");
CREATE INDEX "pmoc_history_operation_id_idx" ON "pmoc_history"("operation_id");
CREATE INDEX "pmoc_plans_generation_mode_operational_status_idx" ON "pmoc_plans"("generation_mode", "operational_status");
CREATE INDEX "pmoc_plans_default_operator_id_idx" ON "pmoc_plans"("default_operator_id");
CREATE INDEX "pmoc_plans_default_technician_id_idx" ON "pmoc_plans"("default_technician_id");
CREATE INDEX "pmoc_plans_signature_override_id_idx" ON "pmoc_plans"("signature_override_id");

ALTER TABLE "pmoc_plans" ADD CONSTRAINT "pmoc_plans_default_operator_id_fkey" FOREIGN KEY ("default_operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pmoc_plans" ADD CONSTRAINT "pmoc_plans_default_technician_id_fkey" FOREIGN KEY ("default_technician_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pmoc_plans" ADD CONSTRAINT "pmoc_plans_signature_override_id_fkey" FOREIGN KEY ("signature_override_id") REFERENCES "signatures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pmoc_execution_requests" ADD CONSTRAINT "pmoc_execution_requests_pmoc_plan_id_fkey" FOREIGN KEY ("pmoc_plan_id") REFERENCES "pmoc_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pmoc_execution_requests" ADD CONSTRAINT "pmoc_execution_requests_maintenance_execution_id_fkey" FOREIGN KEY ("maintenance_execution_id") REFERENCES "maintenance_executions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pmoc_execution_requests" ADD CONSTRAINT "pmoc_execution_requests_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pmoc_execution_requests" ADD CONSTRAINT "pmoc_execution_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pmoc_history" ADD CONSTRAINT "pmoc_history_pmoc_plan_id_fkey" FOREIGN KEY ("pmoc_plan_id") REFERENCES "pmoc_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pmoc_history" ADD CONSTRAINT "pmoc_history_execution_request_id_fkey" FOREIGN KEY ("execution_request_id") REFERENCES "pmoc_execution_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pmoc_history" ADD CONSTRAINT "pmoc_history_operation_id_fkey" FOREIGN KEY ("operation_id") REFERENCES "operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pmoc_history" ADD CONSTRAINT "pmoc_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
