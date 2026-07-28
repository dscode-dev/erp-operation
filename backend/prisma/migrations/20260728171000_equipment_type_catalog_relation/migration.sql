ALTER TABLE "equipments"
ADD COLUMN IF NOT EXISTS "equipment_type_catalog_id" UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'equipments_equipment_type_catalog_id_fkey'
  ) THEN
    ALTER TABLE "equipments"
    ADD CONSTRAINT "equipments_equipment_type_catalog_id_fkey"
    FOREIGN KEY ("equipment_type_catalog_id")
    REFERENCES "technical_catalogs"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "equipments_equipment_type_catalog_id_idx"
ON "equipments"("equipment_type_catalog_id");

WITH defaults("legacy_type", "title", "sort_order") AS (
  VALUES
    ('SPLIT', 'Split', 0),
    ('CHILLER', 'Chiller', 1),
    ('CONDENSER', 'Condensadora', 2),
    ('EVAPORATOR', 'Evaporadora', 3),
    ('AIR_HANDLER', 'Fan Coil / AHU', 4),
    ('SOLAR_INVERTER', 'Inversor Solar', 5),
    ('ELECTRICAL_PANEL', 'Quadro Elétrico', 6),
    ('GENERATOR', 'Gerador', 7),
    ('OTHER', 'Outro', 8)
)
INSERT INTO "technical_catalogs" (
  "organization_id",
  "type",
  "title",
  "description",
  "tags",
  "areas",
  "workflows",
  "sort_order",
  "active",
  "created_at",
  "updated_at"
)
SELECT
  organization."id",
  'EQUIPMENT_TYPE'::"TechnicalCatalogType",
  defaults."title",
  'Tipo de equipamento preservado da classificação oficial V1.',
  ARRAY['equipment-type', 'legacy-' || LOWER(REPLACE(defaults."legacy_type", '_', '-'))],
  ARRAY['GENERAL']::"TechnicalCatalogArea"[],
  ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[],
  defaults."sort_order",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "organizations" organization
CROSS JOIN defaults
WHERE NOT EXISTS (
  SELECT 1
  FROM "technical_catalogs" catalog
  WHERE catalog."organization_id" = organization."id"
    AND catalog."type" = 'EQUIPMENT_TYPE'::"TechnicalCatalogType"
    AND catalog."tags" @> ARRAY[
      'legacy-' || LOWER(REPLACE(defaults."legacy_type", '_', '-'))
    ]::TEXT[]
);

UPDATE "equipments" equipment
SET "equipment_type_catalog_id" = catalog."id"
FROM "technical_catalogs" catalog
WHERE catalog."organization_id" = (
    SELECT organization."id"
    FROM "organizations" organization
    ORDER BY organization."created_at" ASC
    LIMIT 1
  )
  AND catalog."type" = 'EQUIPMENT_TYPE'::"TechnicalCatalogType"
  AND catalog."tags" @> ARRAY[
    'legacy-' || LOWER(REPLACE(equipment."type"::TEXT, '_', '-'))
  ]::TEXT[]
  AND equipment."equipment_type_catalog_id" IS NULL;
