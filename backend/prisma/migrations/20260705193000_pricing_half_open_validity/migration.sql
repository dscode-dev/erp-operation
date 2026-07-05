-- Sprint 19.6 correction: pricing validity ranges are half-open [valid_from, valid_until).
-- This allows adjacent periods and supports the official revision flow where the previous
-- price closes exactly when the new one starts.

ALTER TABLE "product_pricings"
  DROP CONSTRAINT IF EXISTS "product_pricings_no_active_overlap";

ALTER TABLE "product_pricings"
  ADD CONSTRAINT "product_pricings_no_active_overlap"
  EXCLUDE USING gist (
    "organization_id" WITH =,
    "product_id" WITH =,
    tstzrange("valid_from", COALESCE("valid_until", 'infinity'::timestamptz), '[)') WITH &&
  )
  WHERE ("active" = true);
