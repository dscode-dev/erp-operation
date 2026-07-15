ALTER TABLE "pmoc_plans"
ADD COLUMN "source_operation_id" UUID;

CREATE UNIQUE INDEX "pmoc_plans_source_operation_id_key"
ON "pmoc_plans"("source_operation_id");

ALTER TABLE "pmoc_plans"
ADD CONSTRAINT "pmoc_plans_source_operation_id_fkey"
FOREIGN KEY ("source_operation_id") REFERENCES "operations"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
