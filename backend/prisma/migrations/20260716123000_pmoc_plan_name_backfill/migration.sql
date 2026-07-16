WITH pmoc_names AS (
  SELECT
    plan."maintenance_plan_id",
    COALESCE(NULLIF(BTRIM(customer."trade_name"), ''), BTRIM(customer."name")) AS customer_name,
    ' · PMOC-' || LPAD(plan."number"::text, 6, '0') AS number_suffix
  FROM "pmoc_plans" AS plan
  INNER JOIN "customers" AS customer ON customer."id" = plan."customer_id"
)
UPDATE "maintenance_plans" AS maintenance
SET "name" =
  'PMOC · ' ||
  LEFT(
    names.customer_name,
    GREATEST(1, 140 - CHAR_LENGTH('PMOC · ') - CHAR_LENGTH(names.number_suffix))
  ) ||
  names.number_suffix
FROM pmoc_names AS names
WHERE maintenance."id" = names."maintenance_plan_id";
