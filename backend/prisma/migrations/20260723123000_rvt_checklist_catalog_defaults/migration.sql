-- RVT_CHECKLIST_CATALOG_DEFAULTS
-- Catálogo inicial, editável e removível, exclusivo do Relatório de Visita
-- Técnica. Não reutiliza os itens operacionais de OS/PMOC.

WITH items("maintenance_type", "title", "sort_order") AS (
  VALUES
    ('SEMIANNUAL'::"OperationMaintenanceType", 'Desinstalação dos equipamentos internos', 0),
    ('SEMIANNUAL'::"OperationMaintenanceType", 'Limpeza total dos trocadores de calor (com produtos químicos não corrosivos)', 1),
    ('SEMIANNUAL'::"OperationMaintenanceType", 'Lubrificação do motor ventilador', 2),
    ('SEMIANNUAL'::"OperationMaintenanceType", 'Aplicação de banho de borracha no chassi', 3),
    ('SEMIANNUAL'::"OperationMaintenanceType", 'Limpeza dos ventiladores dos evaporadores e lubrificação dos mancais', 4),
    ('SEMIANNUAL'::"OperationMaintenanceType", 'Substituição (quando necessário) dos terminais de fios carbonizados', 5),
    ('SEMIANNUAL'::"OperationMaintenanceType", 'Recomendação para execução dos serviços', 6),
    ('WEEKLY'::"OperationMaintenanceType", 'Limpeza de filtro de ar', 0),
    ('WEEKLY'::"OperationMaintenanceType", 'Limpeza dos painéis de comando', 1),
    ('WEEKLY'::"OperationMaintenanceType", 'Limpeza exterior dos equipamentos', 2),
    ('WEEKLY'::"OperationMaintenanceType", 'Desobstrução do dreno', 3),
    ('WEEKLY'::"OperationMaintenanceType", 'Verificar ruídos mecânicos estranhos', 4),
    ('WEEKLY'::"OperationMaintenanceType", 'Verificar o estado das fiações nas instalações elétricas', 5),
    ('WEEKLY'::"OperationMaintenanceType", 'Verificar aperto de todos os terminais', 6),
    ('WEEKLY'::"OperationMaintenanceType", 'Medir tensão de alimentação elétrica, corrente nominal dos compressores e ventiladores', 7),
    ('WEEKLY'::"OperationMaintenanceType", 'Verificar e regular relés térmicos, sensores de temperatura, termostato, circuito elétrico de comando e pressostato', 8),
    ('WEEKLY'::"OperationMaintenanceType", 'Verificar folga dos eixos dos ventiladores', 9),
    ('WEEKLY'::"OperationMaintenanceType", 'Recomendação para execução dos serviços', 10)
)
INSERT INTO "technical_catalogs" (
  "organization_id",
  "type",
  "title",
  "description",
  "tags",
  "areas",
  "workflows",
  "maintenance_type",
  "sort_order",
  "active",
  "created_at",
  "updated_at"
)
SELECT
  organization."id",
  'CHECKLIST'::"TechnicalCatalogType",
  item."title",
  NULL,
  ARRAY['rvt', 'manutencao', LOWER(item."maintenance_type"::TEXT)]::TEXT[],
  ARRAY['GENERAL', 'HVAC']::"TechnicalCatalogArea"[],
  ARRAY['TECHNICAL_REPORT']::"TechnicalCatalogWorkflow"[],
  item."maintenance_type",
  item."sort_order",
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "organizations" organization
CROSS JOIN items item
WHERE NOT EXISTS (
  SELECT 1
  FROM "technical_catalogs" existing
  WHERE existing."organization_id" = organization."id"
    AND existing."type" = 'CHECKLIST'::"TechnicalCatalogType"
    AND existing."maintenance_type" = item."maintenance_type"
    AND existing."workflows" @> ARRAY['TECHNICAL_REPORT']::"TechnicalCatalogWorkflow"[]
    AND LOWER(existing."title") = LOWER(item."title")
);
