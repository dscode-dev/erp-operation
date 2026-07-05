-- Sprint 19 integrity hardening constraints.
-- These constraints move critical concurrency invariants to PostgreSQL where
-- application-level read-before-write checks are not sufficient.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE UNIQUE INDEX IF NOT EXISTS "budgets_one_approved_per_operation"
  ON "budgets" ("operation_id")
  WHERE "operation_id" IS NOT NULL
    AND "status" = 'APPROVED';

CREATE UNIQUE INDEX IF NOT EXISTS "inventory_items_one_active_per_location"
  ON "inventory_items" (
    "organization_id",
    "product_id",
    COALESCE("location", '')
  )
  WHERE "is_active" = true;

ALTER TABLE "product_pricings"
  ADD CONSTRAINT "product_pricings_no_active_overlap"
  EXCLUDE USING gist (
    "organization_id" WITH =,
    "product_id" WITH =,
    tstzrange("valid_from", COALESCE("valid_until", 'infinity'::timestamptz), '[]') WITH &&
  )
  WHERE ("active" = true);
