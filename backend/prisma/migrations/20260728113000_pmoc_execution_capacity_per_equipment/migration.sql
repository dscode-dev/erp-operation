ALTER TYPE "PmocOperationalStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

ALTER TABLE "pmoc_plans"
  ADD COLUMN "planned_execution_count" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "pmoc_plan_equipments"
  ADD COLUMN "last_reserved_execution_number" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "pmoc_execution_requests"
  ADD COLUMN "equipment_execution_number" INTEGER;

WITH numbered AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "pmoc_plan_id", "equipment_id"
      ORDER BY "scheduled_for", "created_at", "id"
    )::INTEGER AS "equipment_execution_number"
  FROM "pmoc_execution_requests"
)
UPDATE "pmoc_execution_requests" AS request
SET "equipment_execution_number" = numbered."equipment_execution_number"
FROM numbered
WHERE numbered."id" = request."id";

ALTER TABLE "pmoc_execution_requests"
  ALTER COLUMN "equipment_execution_number" SET NOT NULL;

UPDATE "pmoc_plan_equipments" AS covered
SET "last_reserved_execution_number" = projection."last_reserved"
FROM (
  SELECT
    "pmoc_plan_id",
    "equipment_id",
    MAX("equipment_execution_number") AS "last_reserved"
  FROM "pmoc_execution_requests"
  GROUP BY "pmoc_plan_id", "equipment_id"
) AS projection
WHERE projection."pmoc_plan_id" = covered."pmoc_plan_id"
  AND projection."equipment_id" = covered."equipment_id";

UPDATE "pmoc_plans"
SET "planned_execution_count" = GREATEST(
  1,
  CASE "periodicity"
    WHEN 'WEEKLY' THEN CEIL(("end_date" - "start_date")::NUMERIC / 7)::INTEGER
    WHEN 'BIWEEKLY' THEN CEIL(("end_date" - "start_date")::NUMERIC / 14)::INTEGER
    WHEN 'MONTHLY' THEN GREATEST(
      1,
      (EXTRACT(YEAR FROM AGE("end_date", "start_date"))::INTEGER * 12)
      + EXTRACT(MONTH FROM AGE("end_date", "start_date"))::INTEGER
    )
    WHEN 'BIMONTHLY' THEN GREATEST(
      1,
      CEIL((
        (EXTRACT(YEAR FROM AGE("end_date", "start_date"))::INTEGER * 12)
        + EXTRACT(MONTH FROM AGE("end_date", "start_date"))::INTEGER
      )::NUMERIC / 2)::INTEGER
    )
    WHEN 'QUARTERLY' THEN GREATEST(
      1,
      CEIL((
        (EXTRACT(YEAR FROM AGE("end_date", "start_date"))::INTEGER * 12)
        + EXTRACT(MONTH FROM AGE("end_date", "start_date"))::INTEGER
      )::NUMERIC / 3)::INTEGER
    )
    WHEN 'FOUR_MONTHLY' THEN GREATEST(
      1,
      CEIL((
        (EXTRACT(YEAR FROM AGE("end_date", "start_date"))::INTEGER * 12)
        + EXTRACT(MONTH FROM AGE("end_date", "start_date"))::INTEGER
      )::NUMERIC / 4)::INTEGER
    )
    WHEN 'SEMIANNUAL' THEN GREATEST(
      1,
      CEIL((
        (EXTRACT(YEAR FROM AGE("end_date", "start_date"))::INTEGER * 12)
        + EXTRACT(MONTH FROM AGE("end_date", "start_date"))::INTEGER
      )::NUMERIC / 6)::INTEGER
    )
    WHEN 'YEARLY' THEN GREATEST(
      1,
      EXTRACT(YEAR FROM AGE("end_date", "start_date"))::INTEGER
    )
    ELSE GREATEST("last_reserved_execution_number", 1)
  END,
  "last_reserved_execution_number"
);

CREATE UNIQUE INDEX "pmoc_execution_equipment_number_uq"
  ON "pmoc_execution_requests"(
    "pmoc_plan_id",
    "equipment_id",
    "equipment_execution_number"
  );

ALTER TABLE "pmoc_plans"
  ADD CONSTRAINT "pmoc_plans_planned_execution_count_check"
  CHECK ("planned_execution_count" > 0);

ALTER TABLE "pmoc_plan_equipments"
  ADD CONSTRAINT "pmoc_plan_equipment_reserved_execution_check"
  CHECK ("last_reserved_execution_number" >= 0);

ALTER TABLE "pmoc_execution_requests"
  ADD CONSTRAINT "pmoc_execution_equipment_number_check"
  CHECK ("equipment_execution_number" > 0);
