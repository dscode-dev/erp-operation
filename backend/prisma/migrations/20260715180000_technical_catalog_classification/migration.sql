CREATE TYPE "TechnicalCatalogArea" AS ENUM (
  'GENERAL', 'HVAC', 'ELECTRICAL', 'REFRIGERATION', 'MECHANICAL', 'HYDRAULIC', 'SAFETY'
);

CREATE TYPE "TechnicalCatalogWorkflow" AS ENUM (
  'GENERAL', 'WORK_ORDER', 'TECHNICAL_REPORT', 'TECHNICAL_OPINION', 'PMOC', 'MAINTENANCE'
);

ALTER TABLE "technical_catalogs"
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "areas" "TechnicalCatalogArea"[] NOT NULL DEFAULT ARRAY['GENERAL']::"TechnicalCatalogArea"[],
  ADD COLUMN "workflows" "TechnicalCatalogWorkflow"[] NOT NULL DEFAULT ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[];

-- Conservative baseline: every existing/custom record remains broadly applicable.
-- Only well-known installation defaults receive additional, evidence-based classification.
UPDATE "technical_catalogs"
SET
  "areas" = CASE LOWER("title")
    WHEN 'vazamento de fluido refrigerante' THEN ARRAY['GENERAL', 'HVAC', 'REFRIGERATION']::"TechnicalCatalogArea"[]
    WHEN 'falha elétrica' THEN ARRAY['GENERAL', 'HVAC', 'ELECTRICAL']::"TechnicalCatalogArea"[]
    WHEN 'reaperto elétrico' THEN ARRAY['GENERAL', 'ELECTRICAL']::"TechnicalCatalogArea"[]
    WHEN 'recarga de fluido refrigerante' THEN ARRAY['GENERAL', 'HVAC', 'REFRIGERATION']::"TechnicalCatalogArea"[]
    WHEN 'pmoc recomendado' THEN ARRAY['GENERAL', 'HVAC']::"TechnicalCatalogArea"[]
    WHEN 'limpeza preventiva' THEN ARRAY['GENERAL', 'HVAC']::"TechnicalCatalogArea"[]
    WHEN 'equipamento apto para operação' THEN ARRAY['GENERAL']::"TechnicalCatalogArea"[]
    ELSE "areas"
  END,
  "workflows" = CASE LOWER("title")
    WHEN 'pmoc recomendado' THEN ARRAY['GENERAL', 'PMOC', 'TECHNICAL_REPORT', 'TECHNICAL_OPINION']::"TechnicalCatalogWorkflow"[]
    ELSE "workflows"
  END,
  "tags" = CASE LOWER("title")
    WHEN 'vazamento de fluido refrigerante' THEN ARRAY['vazamento', 'refrigeracao']
    WHEN 'falha elétrica' THEN ARRAY['eletrica']
    WHEN 'reaperto elétrico' THEN ARRAY['eletrica', 'seguranca']
    WHEN 'recarga de fluido refrigerante' THEN ARRAY['refrigeracao']
    WHEN 'pmoc recomendado' THEN ARRAY['pmoc', 'manutencao']
    WHEN 'limpeza preventiva' THEN ARRAY['limpeza', 'manutencao']
    WHEN 'equipamento apto para operação' THEN ARRAY['desempenho']
    ELSE "tags"
  END;

-- HVAC checklist defaults are safe for maintenance/visit/PMOC while retaining GENERAL fallback.
UPDATE "technical_catalogs"
SET
  "areas" = ARRAY['GENERAL', 'HVAC']::"TechnicalCatalogArea"[],
  "workflows" = ARRAY['GENERAL', 'MAINTENANCE', 'WORK_ORDER', 'TECHNICAL_REPORT', 'PMOC']::"TechnicalCatalogWorkflow"[],
  "tags" = CASE
    WHEN LOWER("title") LIKE '%elétric%' THEN ARRAY['eletrica', 'manutencao']
    WHEN LOWER("title") LIKE '%limp%' OR LOWER("title") LIKE '%higien%' THEN ARRAY['limpeza', 'manutencao']
    ELSE ARRAY['manutencao']
  END
WHERE "type" = 'CHECKLIST'::"TechnicalCatalogType";

CREATE INDEX "technical_catalog_tags_gin_idx" ON "technical_catalogs" USING GIN ("tags");
CREATE INDEX "technical_catalog_areas_gin_idx" ON "technical_catalogs" USING GIN ("areas");
CREATE INDEX "technical_catalog_workflows_gin_idx" ON "technical_catalogs" USING GIN ("workflows");
