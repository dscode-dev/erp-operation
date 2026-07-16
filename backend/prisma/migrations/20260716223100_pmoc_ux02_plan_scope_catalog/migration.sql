-- PMOC UX-02: structured scope reuses the official Technical Catalog and keeps
-- the legacy coverage text as a readable compatibility snapshot.
CREATE TABLE "pmoc_plan_scopes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "pmoc_plan_id" UUID NOT NULL,
  "technical_catalog_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pmoc_plan_scopes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pmoc_plan_scopes_pmoc_plan_id_fkey"
    FOREIGN KEY ("pmoc_plan_id") REFERENCES "pmoc_plans"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pmoc_plan_scopes_technical_catalog_id_fkey"
    FOREIGN KEY ("technical_catalog_id") REFERENCES "technical_catalogs"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "pmoc_plan_scope_plan_catalog_uq"
  ON "pmoc_plan_scopes"("pmoc_plan_id", "technical_catalog_id");
CREATE INDEX "pmoc_plan_scope_catalog_idx"
  ON "pmoc_plan_scopes"("technical_catalog_id");

WITH defaults("title", "sort_order") AS (
  VALUES
    ('Área administrativa', 0), ('Recepção', 1), ('Escritórios', 2),
    ('Sala técnica', 3), ('Laboratório', 4), ('Almoxarifado', 5),
    ('Produção', 6), ('Centro cirúrgico', 7), ('Sala limpa', 8),
    ('Auditório', 9), ('Refeitório', 10), ('Área externa', 11),
    ('Cobertura', 12), ('Galpão', 13), ('Outros', 14)
)
INSERT INTO "technical_catalogs" (
  "organization_id", "type", "title", "tags", "areas", "workflows",
  "sort_order", "active", "created_at", "updated_at"
)
SELECT
  organization."id", 'PLAN_SCOPE'::"TechnicalCatalogType", defaults."title",
  ARRAY['pmoc', 'escopo']::TEXT[],
  ARRAY['GENERAL']::"TechnicalCatalogArea"[],
  ARRAY['PMOC']::"TechnicalCatalogWorkflow"[],
  defaults."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" organization
CROSS JOIN defaults
WHERE NOT EXISTS (
  SELECT 1 FROM "technical_catalogs" catalog
  WHERE catalog."organization_id" = organization."id"
    AND catalog."type" = 'PLAN_SCOPE'::"TechnicalCatalogType"
    AND LOWER(catalog."title") = LOWER(defaults."title")
    AND catalog."deleted_at" IS NULL
);
