CREATE TYPE "TechnicalCatalogType" AS ENUM (
  'CHECKLIST',
  'OBJECTIVE',
  'SITE_CONDITION',
  'CONCLUSION',
  'RECOMMENDATION'
);

ALTER TABLE "operations"
  ADD COLUMN "technical_opinion_recommendations" TEXT;

CREATE TABLE "technical_catalogs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL,
  "type" "TechnicalCatalogType" NOT NULL,
  "title" VARCHAR(500) NOT NULL,
  "description" TEXT,
  "maintenance_type" "OperationMaintenanceType",
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "deleted_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "technical_catalogs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "technical_catalogs_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "technical_catalogs" (
  "id", "organization_id", "type", "title", "maintenance_type",
  "sort_order", "active", "created_at", "updated_at"
)
SELECT
  "id", "organization_id", 'CHECKLIST'::"TechnicalCatalogType", "description",
  "maintenance_type",
  (ROW_NUMBER() OVER (
    PARTITION BY "organization_id", "maintenance_type" ORDER BY "description", "id"
  ) - 1)::INTEGER,
  "active", "created_at", "updated_at"
FROM "maintenance_checklist_templates";

DROP TABLE "maintenance_checklist_templates";

CREATE INDEX "technical_catalog_lookup_idx"
  ON "technical_catalogs"("organization_id", "type", "active", "sort_order");
CREATE INDEX "technical_catalog_maintenance_idx"
  ON "technical_catalogs"("organization_id", "maintenance_type", "active");
CREATE INDEX "technical_catalog_deleted_idx"
  ON "technical_catalogs"("organization_id", "deleted_at");
CREATE UNIQUE INDEX "technical_catalog_active_title_uq"
  ON "technical_catalogs"("organization_id", "type", LOWER("title"))
  WHERE "deleted_at" IS NULL AND "maintenance_type" IS NULL;
CREATE UNIQUE INDEX "technical_catalog_checklist_title_uq"
  ON "technical_catalogs"("organization_id", "type", "maintenance_type", LOWER("title"))
  WHERE "deleted_at" IS NULL AND "maintenance_type" IS NOT NULL;

WITH defaults("type", "title", "sort_order") AS (
  VALUES
    ('OBJECTIVE'::"TechnicalCatalogType", 'Inspeção Preventiva', 0),
    ('OBJECTIVE'::"TechnicalCatalogType", 'Inspeção Corretiva', 1),
    ('OBJECTIVE'::"TechnicalCatalogType", 'Avaliação Técnica', 2),
    ('OBJECTIVE'::"TechnicalCatalogType", 'Emissão de Laudo', 3),
    ('OBJECTIVE'::"TechnicalCatalogType", 'Verificação Operacional', 4),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Equipamento desligado', 0),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Equipamento sem refrigeração', 1),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Vazamento de fluido refrigerante', 2),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Baixa pressão', 3),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Alta pressão', 4),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Compressor não parte', 5),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Contatora defeituosa', 6),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Capacitor danificado', 7),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Falha elétrica', 8),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Disjuntor desarmado', 9),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Ventilador inoperante', 10),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Evaporadora congelada', 11),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Condensadora obstruída', 12),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Serpentina suja', 13),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Corrosão', 14),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Oxidação', 15),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Tubulação danificada', 16),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Isolamento comprometido', 17),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Temperatura inadequada', 18),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Ruído excessivo', 19),
    ('SITE_CONDITION'::"TechnicalCatalogType", 'Vibração anormal', 20),
    ('CONCLUSION'::"TechnicalCatalogType", 'Equipamento apto para operação', 0),
    ('CONCLUSION'::"TechnicalCatalogType", 'Equipamento apto após correção', 1),
    ('CONCLUSION'::"TechnicalCatalogType", 'Necessita manutenção corretiva', 2),
    ('CONCLUSION'::"TechnicalCatalogType", 'Necessita manutenção preventiva', 3),
    ('CONCLUSION'::"TechnicalCatalogType", 'Necessita substituição de componentes', 4),
    ('CONCLUSION'::"TechnicalCatalogType", 'Necessita substituição do equipamento', 5),
    ('CONCLUSION'::"TechnicalCatalogType", 'Necessita nova inspeção', 6),
    ('RECOMMENDATION'::"TechnicalCatalogType", 'Limpeza preventiva', 0),
    ('RECOMMENDATION'::"TechnicalCatalogType", 'Troca de filtros', 1),
    ('RECOMMENDATION'::"TechnicalCatalogType", 'Recarga de fluido refrigerante', 2),
    ('RECOMMENDATION'::"TechnicalCatalogType", 'Reaperto elétrico', 3),
    ('RECOMMENDATION'::"TechnicalCatalogType", 'Monitoramento periódico', 4),
    ('RECOMMENDATION'::"TechnicalCatalogType", 'PMOC recomendado', 5),
    ('RECOMMENDATION'::"TechnicalCatalogType", 'Revisão completa', 6),
    ('RECOMMENDATION'::"TechnicalCatalogType", 'Substituição preventiva', 7)
)
INSERT INTO "technical_catalogs" ("organization_id", "type", "title", "sort_order")
SELECT organization."id", defaults."type", defaults."title", defaults."sort_order"
FROM "organizations" organization
CROSS JOIN defaults
WHERE NOT EXISTS (
  SELECT 1
  FROM "technical_catalogs" catalog
  WHERE catalog."organization_id" = organization."id"
    AND catalog."type" = defaults."type"
    AND LOWER(catalog."title") = LOWER(defaults."title")
    AND catalog."deleted_at" IS NULL
);
