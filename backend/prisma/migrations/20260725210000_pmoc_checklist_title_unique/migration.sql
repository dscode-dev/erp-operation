-- O título de um item de checklist deixa de colidir entre unidades do PMOC
-- (Evaporadora/Condensadora) e entre o Checklist PMOC e os demais checklists.
-- Incluímos a unidade (enum) nos índices únicos. Usamos NULLS NOT DISTINCT
-- (Postgres 15+) para que os itens não-PMOC (pmoc_unit NULL) continuem sujeitos
-- à unicidade — evitando o cast enum->text, que não é IMMUTABLE e quebra o índice.
DROP INDEX IF EXISTS "technical_catalog_active_title_uq";
CREATE UNIQUE INDEX "technical_catalog_active_title_uq"
  ON "technical_catalogs"("organization_id", "type", "pmoc_unit", LOWER("title")) NULLS NOT DISTINCT
  WHERE "deleted_at" IS NULL AND "maintenance_type" IS NULL;

DROP INDEX IF EXISTS "technical_catalog_checklist_title_uq";
CREATE UNIQUE INDEX "technical_catalog_checklist_title_uq"
  ON "technical_catalogs"("organization_id", "type", "maintenance_type", "pmoc_unit", LOWER("title")) NULLS NOT DISTINCT
  WHERE "deleted_at" IS NULL AND "maintenance_type" IS NOT NULL;
