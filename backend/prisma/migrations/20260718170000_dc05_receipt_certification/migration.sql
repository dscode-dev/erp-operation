ALTER TABLE "operations"
  ADD COLUMN "receipt_number" VARCHAR(40),
  ADD COLUMN "receipt_issued_at" DATE,
  ADD COLUMN "receipt_amount" DECIMAL(15,2),
  ADD COLUMN "receipt_amount_in_words" VARCHAR(500),
  ADD COLUMN "receipt_service" VARCHAR(500),
  ADD COLUMN "receipt_description" TEXT,
  ADD COLUMN "receipt_warranty_days" INTEGER,
  ADD COLUMN "receipt_declaration" TEXT;

ALTER TABLE "operations"
  ADD CONSTRAINT "operations_receipt_amount_nonnegative_ck"
  CHECK ("receipt_amount" IS NULL OR "receipt_amount" >= 0),
  ADD CONSTRAINT "operations_receipt_warranty_days_ck"
  CHECK ("receipt_warranty_days" IS NULL OR "receipt_warranty_days" BETWEEN 1 AND 3650);
