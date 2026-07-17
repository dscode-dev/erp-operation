ALTER TABLE "operation_photos"
ADD COLUMN "created_by_id" UUID;

UPDATE "operation_photos" AS photo
SET "created_by_id" = operation."operator_id"
FROM "operations" AS operation
WHERE operation."id" = photo."operation_id";

ALTER TABLE "operation_photos"
ADD CONSTRAINT "operation_photos_created_by_id_fkey"
FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "operation_photos_created_by_id_created_at_idx"
ON "operation_photos"("created_by_id", "created_at");
