CREATE TYPE "PmocSchedulerStatus" AS ENUM (
  'NEVER_RUN', 'RUNNING', 'SUCCESS', 'PARTIAL_FAILURE', 'FAILED'
);

ALTER TYPE "PmocHistoryAction" ADD VALUE IF NOT EXISTS 'REQUEST_CREATED_AUTO';
ALTER TYPE "PmocHistoryAction" ADD VALUE IF NOT EXISTS 'REQUEST_CREATED_MANUAL';
ALTER TYPE "PmocHistoryAction" ADD VALUE IF NOT EXISTS 'REQUEST_RETRY';
ALTER TYPE "PmocHistoryAction" ADD VALUE IF NOT EXISTS 'TECHNICIAN_CHANGED';
ALTER TYPE "PmocHistoryAction" ADD VALUE IF NOT EXISTS 'EXECUTION_COMPLETED';

ALTER TABLE "pmoc_plans"
  ADD COLUMN "last_reserved_execution_number" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_generated_execution_number" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "last_execution_date" TIMESTAMPTZ(3),
  ADD COLUMN "next_execution_date" TIMESTAMPTZ(3),
  ADD COLUMN "next_generation_date" TIMESTAMPTZ(3),
  ADD COLUMN "last_scheduler_run" TIMESTAMPTZ(3),
  ADD COLUMN "last_scheduler_status" "PmocSchedulerStatus" NOT NULL DEFAULT 'NEVER_RUN',
  ADD COLUMN "last_scheduler_error" VARCHAR(1000),
  ADD COLUMN "last_successful_generation" TIMESTAMPTZ(3);

ALTER TABLE "pmoc_execution_requests"
  ADD COLUMN "execution_number" INTEGER,
  ADD COLUMN "execution_year" SMALLINT,
  ADD COLUMN "generated_operation_id" UUID;

WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "pmoc_plan_id"
      ORDER BY "scheduled_for", "created_at", "id"
    )::integer AS "execution_number"
  FROM "pmoc_execution_requests"
)
UPDATE "pmoc_execution_requests" AS request
SET
  "execution_number" = numbered."execution_number",
  "execution_year" = EXTRACT(YEAR FROM request."scheduled_for")::smallint,
  "generated_operation_id" = request."operation_id"
FROM numbered
WHERE numbered."id" = request."id";

ALTER TABLE "pmoc_execution_requests"
  ALTER COLUMN "execution_number" SET NOT NULL;

UPDATE "pmoc_plans" AS pmoc
SET
  "last_reserved_execution_number" = projection."last_reserved",
  "last_generated_execution_number" = projection."last_generated",
  "last_execution_date" = projection."last_executed",
  "next_execution_date" = projection."next_execution",
  "next_generation_date" = projection."next_generation",
  "last_successful_generation" = projection."last_generation"
FROM (
  SELECT
    request."pmoc_plan_id",
    MAX(request."execution_number") AS "last_reserved",
    COALESCE(MAX(request."execution_number") FILTER (
      WHERE request."status" = 'GENERATED'
    ), 0) AS "last_generated",
    MAX(execution."executed_at") AS "last_executed",
    MIN(request."scheduled_for") FILTER (
      WHERE request."status" IN ('PENDING', 'FAILED', 'GENERATING_OS')
    ) AS "next_execution",
    MIN(request."scheduled_for") FILTER (
      WHERE request."status" IN ('PENDING', 'FAILED')
    ) AS "next_generation",
    MAX(request."generated_at") AS "last_generation"
  FROM "pmoc_execution_requests" AS request
  LEFT JOIN "maintenance_executions" AS execution
    ON execution."id" = request."maintenance_execution_id"
  GROUP BY request."pmoc_plan_id"
) AS projection
WHERE projection."pmoc_plan_id" = pmoc."id";

CREATE UNIQUE INDEX "pmoc_execution_requests_generated_operation_id_key"
  ON "pmoc_execution_requests"("generated_operation_id");
CREATE UNIQUE INDEX "pmoc_execution_requests_pmoc_plan_id_execution_number_key"
  ON "pmoc_execution_requests"("pmoc_plan_id", "execution_number");
CREATE INDEX "pmoc_plans_next_generation_date_idx"
  ON "pmoc_plans"("generation_mode", "next_generation_date");
CREATE INDEX "pmoc_plans_last_scheduler_status_idx"
  ON "pmoc_plans"("last_scheduler_status", "last_scheduler_run");

ALTER TABLE "pmoc_execution_requests"
  ADD CONSTRAINT "pmoc_execution_requests_generated_operation_id_fkey"
  FOREIGN KEY ("generated_operation_id") REFERENCES "operations"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pmoc_execution_requests"
  ADD CONSTRAINT "pmoc_execution_requests_operation_alias_check"
  CHECK (
    "generated_operation_id" IS NULL
    OR "operation_id" IS NULL
    OR "generated_operation_id" = "operation_id"
  );

ALTER TABLE "pmoc_execution_requests"
  ADD CONSTRAINT "pmoc_execution_requests_execution_number_check"
  CHECK ("execution_number" > 0);
