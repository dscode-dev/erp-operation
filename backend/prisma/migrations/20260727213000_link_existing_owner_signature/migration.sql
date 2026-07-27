-- Existing installations may have created the institutional signature before
-- Signature.userId existed. When there is exactly one active OWNER, associate
-- that user's default (or first) active image-bearing signature. Installations
-- with multiple OWNER users are intentionally left for explicit assignment in
-- Settings > Signatures.
WITH active_owners AS (
  SELECT "id"
  FROM "users"
  WHERE "role" = 'OWNER'
    AND "is_active" = TRUE
    AND "disabled_at" IS NULL
),
sole_owner AS (
  SELECT "id"
  FROM active_owners
  WHERE (SELECT COUNT(*) FROM active_owners) = 1
),
candidate AS (
  SELECT signature_candidate."id" AS "signature_id", sole_owner."id" AS "owner_id"
  FROM sole_owner
  JOIN LATERAL (
    SELECT "id"
    FROM "signatures"
    WHERE "user_id" IS NULL
      AND "active" = TRUE
      AND "deleted_at" IS NULL
      AND "image_storage_key" IS NOT NULL
    ORDER BY "is_default" DESC, "position" ASC, "created_at" ASC
    LIMIT 1
  ) AS signature_candidate ON TRUE
  WHERE NOT EXISTS (
    SELECT 1
    FROM "signatures"
    WHERE "user_id" = sole_owner."id"
  )
)
UPDATE "signatures" AS signature
SET "user_id" = candidate."owner_id",
    "updated_at" = CURRENT_TIMESTAMP
FROM candidate
WHERE signature."id" = candidate."signature_id";
