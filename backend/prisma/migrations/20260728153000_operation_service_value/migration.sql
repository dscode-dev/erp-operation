ALTER TABLE "operations"
ADD COLUMN "service_value" DECIMAL(15,2);

ALTER TABLE "operations"
ADD CONSTRAINT "operations_service_value_non_negative_ck"
CHECK ("service_value" IS NULL OR "service_value" >= 0);
