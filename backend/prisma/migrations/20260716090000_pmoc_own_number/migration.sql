ALTER TABLE "pmoc_plans"
DROP CONSTRAINT IF EXISTS "pmoc_plans_source_operation_id_fkey";

DROP INDEX IF EXISTS "pmoc_plans_source_operation_id_key";

ALTER TABLE "pmoc_plans"
DROP COLUMN IF EXISTS "source_operation_id";

CREATE SEQUENCE "pmoc_plans_number_seq";

ALTER TABLE "pmoc_plans"
ADD COLUMN "number" INTEGER;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "created_at", "id") AS value
  FROM "pmoc_plans"
)
UPDATE "pmoc_plans" AS plan
SET "number" = ranked.value
FROM ranked
WHERE plan."id" = ranked."id";

SELECT setval(
  'pmoc_plans_number_seq',
  COALESCE((SELECT MAX("number") FROM "pmoc_plans"), 0) + 1,
  false
);

ALTER SEQUENCE "pmoc_plans_number_seq" OWNED BY "pmoc_plans"."number";

ALTER TABLE "pmoc_plans"
ALTER COLUMN "number" SET DEFAULT nextval('pmoc_plans_number_seq'),
ALTER COLUMN "number" SET NOT NULL;

CREATE UNIQUE INDEX "pmoc_plans_number_key" ON "pmoc_plans"("number");
