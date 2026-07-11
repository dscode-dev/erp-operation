ALTER TABLE "organizations"
  ADD COLUMN "website" VARCHAR(255),
  ADD COLUMN "zip_code" VARCHAR(10),
  ADD COLUMN "street" VARCHAR(180),
  ADD COLUMN "number" VARCHAR(20),
  ADD COLUMN "complement" VARCHAR(120),
  ADD COLUMN "district" VARCHAR(120);

ALTER TABLE "operations"
  ADD COLUMN "reported_issue" TEXT,
  ADD COLUMN "service_description" TEXT;
