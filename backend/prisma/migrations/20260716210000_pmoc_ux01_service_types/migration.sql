-- PMOC UX-01: preserve the official primary Operation type while allowing
-- each PMOC and generated Operation to carry all selected official types.
ALTER TABLE "pmoc_plans"
  ADD COLUMN "service_types" "OperationType"[] NOT NULL DEFAULT ARRAY[]::"OperationType"[];

ALTER TABLE "operations"
  ADD COLUMN "service_types" "OperationType"[] NOT NULL DEFAULT ARRAY[]::"OperationType"[];

UPDATE "pmoc_plans"
SET "service_types" = ARRAY["default_operation_type"]::"OperationType"[]
WHERE cardinality("service_types") = 0;

UPDATE "operations"
SET "service_types" = ARRAY["type"]::"OperationType"[]
WHERE cardinality("service_types") = 0;
