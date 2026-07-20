-- ORBIT_CATALOG_SEED_HVAC
-- Seed aditivo e idempotente do Catálogo Técnico padrão para o segmento
-- Refrigeração/Climatização (HVAC). Não cria entidades, endpoints ou regras.
-- Popula, para TODAS as organizações existentes: Checklist, Objetivos,
-- Condições Observadas, Conclusões, Recomendações e Escopos de Plano.
--
-- Idempotência: cada linha só é inserida quando ainda não existe um item ativo
-- (deleted_at IS NULL) do mesmo tipo/título (e mesma periodicidade quando
-- aplicável). Reexecutar a migration não duplica registros nem sobrescreve
-- classificações já ajustadas manualmente.

-- ===========================================================================
-- 1. CHECKLIST — checks de atendimento (workflow GERAL: aparecem em todos os
--    documentos via includeGeneral). Periodicidade nula: aplicáveis a qualquer
--    plano/atendimento. Áreas por disciplina.
-- ===========================================================================

-- 1.1 Elétrica
WITH items("title","sort_order") AS (VALUES
  ('Verificar tensão de alimentação', 0),
  ('Verificar corrente elétrica do compressor', 1),
  ('Verificar corrente dos ventiladores', 2),
  ('Verificar aperto dos bornes elétricos', 3),
  ('Inspecionar cabos elétricos', 4),
  ('Verificar aterramento elétrico', 5),
  ('Testar disjuntores', 6),
  ('Testar contatores', 7),
  ('Testar relés de proteção', 8),
  ('Verificar capacitor do compressor', 9),
  ('Verificar capacitor dos ventiladores', 10)
)
INSERT INTO "technical_catalogs" ("organization_id","type","title","description","tags","areas","workflows","maintenance_type","sort_order","active","created_at","updated_at")
SELECT o."id", 'CHECKLIST'::"TechnicalCatalogType", i."title", NULL::TEXT,
  ARRAY['eletrica','manutencao']::TEXT[],
  ARRAY['GENERAL','ELECTRICAL','HVAC']::"TechnicalCatalogArea"[],
  ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[],
  NULL::"OperationMaintenanceType", i."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o CROSS JOIN items i
WHERE NOT EXISTS (SELECT 1 FROM "technical_catalogs" c WHERE c."organization_id"=o."id" AND c."type"='CHECKLIST'::"TechnicalCatalogType" AND LOWER(c."title")=LOWER(i."title") AND c."deleted_at" IS NULL);

-- 1.2 Mecânica
WITH items("title","sort_order") AS (VALUES
  ('Verificar fixação do equipamento', 20),
  ('Verificar estrutura de suporte', 21),
  ('Inspecionar vibração excessiva', 22),
  ('Verificar ruídos anormais', 23),
  ('Inspecionar rolamentos', 24),
  ('Verificar estado das hélices', 25),
  ('Verificar estado dos motores', 26)
)
INSERT INTO "technical_catalogs" ("organization_id","type","title","description","tags","areas","workflows","maintenance_type","sort_order","active","created_at","updated_at")
SELECT o."id", 'CHECKLIST'::"TechnicalCatalogType", i."title", NULL::TEXT,
  ARRAY['mecanica','manutencao']::TEXT[],
  ARRAY['GENERAL','MECHANICAL','HVAC']::"TechnicalCatalogArea"[],
  ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[],
  NULL::"OperationMaintenanceType", i."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o CROSS JOIN items i
WHERE NOT EXISTS (SELECT 1 FROM "technical_catalogs" c WHERE c."organization_id"=o."id" AND c."type"='CHECKLIST'::"TechnicalCatalogType" AND LOWER(c."title")=LOWER(i."title") AND c."deleted_at" IS NULL);

-- 1.3 Sistema Frigorífico
WITH items("title","sort_order") AS (VALUES
  ('Verificar pressão de sucção', 40),
  ('Verificar pressão de descarga', 41),
  ('Verificar superaquecimento', 42),
  ('Verificar sub-resfriamento', 43),
  ('Verificar nível de fluido refrigerante', 44),
  ('Inspecionar vazamentos', 45),
  ('Testar estanqueidade', 46),
  ('Verificar visor de líquido', 47),
  ('Verificar filtro secador', 48),
  ('Verificar válvula de expansão', 49),
  ('Verificar compressor', 50),
  ('Verificar condensador', 51),
  ('Verificar evaporador', 52)
)
INSERT INTO "technical_catalogs" ("organization_id","type","title","description","tags","areas","workflows","maintenance_type","sort_order","active","created_at","updated_at")
SELECT o."id", 'CHECKLIST'::"TechnicalCatalogType", i."title", NULL::TEXT,
  ARRAY['refrigeracao','sistema-frigorifico','manutencao']::TEXT[],
  ARRAY['GENERAL','REFRIGERATION','HVAC']::"TechnicalCatalogArea"[],
  ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[],
  NULL::"OperationMaintenanceType", i."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o CROSS JOIN items i
WHERE NOT EXISTS (SELECT 1 FROM "technical_catalogs" c WHERE c."organization_id"=o."id" AND c."type"='CHECKLIST'::"TechnicalCatalogType" AND LOWER(c."title")=LOWER(i."title") AND c."deleted_at" IS NULL);

-- 1.4 Limpeza
WITH items("title","sort_order") AS (VALUES
  ('Limpeza do evaporador', 70),
  ('Limpeza do condensador', 71),
  ('Limpeza dos filtros de ar', 72),
  ('Limpeza da bandeja de condensado', 73),
  ('Limpeza da tubulação de dreno', 74),
  ('Higienização interna', 75),
  ('Limpeza da unidade externa', 76),
  ('Limpeza da unidade interna', 77)
)
INSERT INTO "technical_catalogs" ("organization_id","type","title","description","tags","areas","workflows","maintenance_type","sort_order","active","created_at","updated_at")
SELECT o."id", 'CHECKLIST'::"TechnicalCatalogType", i."title", NULL::TEXT,
  ARRAY['limpeza','higienizacao','manutencao']::TEXT[],
  ARRAY['GENERAL','HVAC','REFRIGERATION']::"TechnicalCatalogArea"[],
  ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[],
  NULL::"OperationMaintenanceType", i."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o CROSS JOIN items i
WHERE NOT EXISTS (SELECT 1 FROM "technical_catalogs" c WHERE c."organization_id"=o."id" AND c."type"='CHECKLIST'::"TechnicalCatalogType" AND LOWER(c."title")=LOWER(i."title") AND c."deleted_at" IS NULL);

-- 1.5 Drenagem
WITH items("title","sort_order") AS (VALUES
  ('Verificar dreno', 90),
  ('Testar escoamento', 91),
  ('Limpar tubulação', 92),
  ('Verificar sifão', 93)
)
INSERT INTO "technical_catalogs" ("organization_id","type","title","description","tags","areas","workflows","maintenance_type","sort_order","active","created_at","updated_at")
SELECT o."id", 'CHECKLIST'::"TechnicalCatalogType", i."title", NULL::TEXT,
  ARRAY['drenagem','hidraulica','manutencao']::TEXT[],
  ARRAY['GENERAL','HYDRAULIC','HVAC']::"TechnicalCatalogArea"[],
  ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[],
  NULL::"OperationMaintenanceType", i."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o CROSS JOIN items i
WHERE NOT EXISTS (SELECT 1 FROM "technical_catalogs" c WHERE c."organization_id"=o."id" AND c."type"='CHECKLIST'::"TechnicalCatalogType" AND LOWER(c."title")=LOWER(i."title") AND c."deleted_at" IS NULL);

-- 1.6 Segurança
WITH items("title","sort_order") AS (VALUES
  ('Conferir dispositivos de proteção', 110),
  ('Testar funcionamento de alarmes', 111),
  ('Verificar etiquetas de identificação', 112),
  ('Conferir EPIs utilizados', 113),
  ('Verificar riscos aparentes', 114)
)
INSERT INTO "technical_catalogs" ("organization_id","type","title","description","tags","areas","workflows","maintenance_type","sort_order","active","created_at","updated_at")
SELECT o."id", 'CHECKLIST'::"TechnicalCatalogType", i."title", NULL::TEXT,
  ARRAY['seguranca']::TEXT[],
  ARRAY['GENERAL','SAFETY']::"TechnicalCatalogArea"[],
  ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[],
  NULL::"OperationMaintenanceType", i."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o CROSS JOIN items i
WHERE NOT EXISTS (SELECT 1 FROM "technical_catalogs" c WHERE c."organization_id"=o."id" AND c."type"='CHECKLIST'::"TechnicalCatalogType" AND LOWER(c."title")=LOWER(i."title") AND c."deleted_at" IS NULL);

-- 1.7 Operação
WITH items("title","sort_order") AS (VALUES
  ('Testar modo refrigeração', 130),
  ('Testar modo aquecimento', 131),
  ('Testar ventilação', 132),
  ('Testar controle remoto', 133),
  ('Testar termostato', 134),
  ('Verificar sensores', 135),
  ('Verificar automação', 136),
  ('Testar partida do equipamento', 137),
  ('Medir temperatura insuflada', 138),
  ('Medir temperatura de retorno', 139)
)
INSERT INTO "technical_catalogs" ("organization_id","type","title","description","tags","areas","workflows","maintenance_type","sort_order","active","created_at","updated_at")
SELECT o."id", 'CHECKLIST'::"TechnicalCatalogType", i."title", NULL::TEXT,
  ARRAY['operacao','testes','manutencao']::TEXT[],
  ARRAY['GENERAL','HVAC']::"TechnicalCatalogArea"[],
  ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[],
  NULL::"OperationMaintenanceType", i."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o CROSS JOIN items i
WHERE NOT EXISTS (SELECT 1 FROM "technical_catalogs" c WHERE c."organization_id"=o."id" AND c."type"='CHECKLIST'::"TechnicalCatalogType" AND LOWER(c."title")=LOWER(i."title") AND c."deleted_at" IS NULL);

-- ===========================================================================
-- 2. OBJETIVOS
-- ===========================================================================
WITH items("title","sort_order") AS (VALUES
  ('Executar manutenção preventiva', 100),
  ('Executar manutenção corretiva', 101),
  ('Inspecionar funcionamento geral', 102),
  ('Diagnosticar falha operacional', 103),
  ('Corrigir defeito informado pelo cliente', 104),
  ('Limpar componentes internos', 105),
  ('Realizar higienização', 106),
  ('Ajustar parâmetros operacionais', 107),
  ('Verificar consumo elétrico', 108),
  ('Verificar eficiência energética', 109),
  ('Inspecionar sistema frigorífico', 110),
  ('Avaliar condições gerais do equipamento', 111),
  ('Validar funcionamento após reparo', 112),
  ('Atender plano de manutenção preventiva (PMOC)', 113),
  ('Atender solicitação técnica do cliente', 114)
)
INSERT INTO "technical_catalogs" ("organization_id","type","title","description","tags","areas","workflows","maintenance_type","sort_order","active","created_at","updated_at")
SELECT o."id", 'OBJECTIVE'::"TechnicalCatalogType", i."title", NULL::TEXT,
  ARRAY['objetivo','hvac']::TEXT[],
  ARRAY['GENERAL','HVAC']::"TechnicalCatalogArea"[],
  ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[],
  NULL::"OperationMaintenanceType", i."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o CROSS JOIN items i
WHERE NOT EXISTS (SELECT 1 FROM "technical_catalogs" c WHERE c."organization_id"=o."id" AND c."type"='OBJECTIVE'::"TechnicalCatalogType" AND LOWER(c."title")=LOWER(i."title") AND c."deleted_at" IS NULL);

-- ===========================================================================
-- 3. CONDIÇÕES OBSERVADAS
-- ===========================================================================
WITH items("title","sort_order") AS (VALUES
  ('Equipamento operando normalmente', 100),
  ('Equipamento desligado', 101),
  ('Equipamento sem alimentação elétrica', 102),
  ('Compressor não parte', 103),
  ('Compressor operando continuamente', 104),
  ('Baixa eficiência de refrigeração', 105),
  ('Baixo fluxo de ar', 106),
  ('Alto nível de ruído', 107),
  ('Vibração excessiva', 108),
  ('Vazamento de fluido refrigerante', 109),
  ('Condensador obstruído', 110),
  ('Evaporador congelado', 111),
  ('Filtros extremamente sujos', 112),
  ('Bandeja de condensado com acúmulo de sujeira', 113),
  ('Dreno parcialmente obstruído', 114),
  ('Dreno totalmente obstruído', 115),
  ('Capacitor danificado', 116),
  ('Contator desgastado', 117),
  ('Motor do ventilador com desgaste', 118),
  ('Tubulação com isolamento comprometido', 119),
  ('Corrosão em componentes', 120),
  ('Oxidação em conexões elétricas', 121),
  ('Equipamento operando acima da corrente nominal', 122),
  ('Temperatura fora da especificação', 123),
  ('Instalação fora do padrão recomendado', 124),
  ('Não foram identificadas anormalidades', 125)
)
INSERT INTO "technical_catalogs" ("organization_id","type","title","description","tags","areas","workflows","maintenance_type","sort_order","active","created_at","updated_at")
SELECT o."id", 'SITE_CONDITION'::"TechnicalCatalogType", i."title", NULL::TEXT,
  ARRAY['condicao','diagnostico','hvac']::TEXT[],
  ARRAY['GENERAL','HVAC']::"TechnicalCatalogArea"[],
  ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[],
  NULL::"OperationMaintenanceType", i."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o CROSS JOIN items i
WHERE NOT EXISTS (SELECT 1 FROM "technical_catalogs" c WHERE c."organization_id"=o."id" AND c."type"='SITE_CONDITION'::"TechnicalCatalogType" AND LOWER(c."title")=LOWER(i."title") AND c."deleted_at" IS NULL);

-- ===========================================================================
-- 4. CONCLUSÕES
-- ===========================================================================
WITH items("title","sort_order") AS (VALUES
  ('Equipamento em condições normais de operação', 100),
  ('Equipamento liberado para uso', 101),
  ('Equipamento necessita manutenção corretiva', 102),
  ('Equipamento necessita substituição de componentes', 103),
  ('Equipamento necessita limpeza completa', 104),
  ('Equipamento necessita recarga de fluido refrigerante', 105),
  ('Equipamento necessita reparo elétrico', 106),
  ('Equipamento apresenta desgaste natural', 107),
  ('Equipamento apresenta falha operacional', 108),
  ('Equipamento não atende às condições ideais de funcionamento', 109),
  ('Equipamento deve permanecer desligado até correção', 110),
  ('Serviço executado com sucesso', 111),
  ('Problema solucionado', 112),
  ('Pendências identificadas para intervenção futura', 113)
)
INSERT INTO "technical_catalogs" ("organization_id","type","title","description","tags","areas","workflows","maintenance_type","sort_order","active","created_at","updated_at")
SELECT o."id", 'CONCLUSION'::"TechnicalCatalogType", i."title", NULL::TEXT,
  ARRAY['conclusao','hvac']::TEXT[],
  ARRAY['GENERAL','HVAC']::"TechnicalCatalogArea"[],
  ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[],
  NULL::"OperationMaintenanceType", i."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o CROSS JOIN items i
WHERE NOT EXISTS (SELECT 1 FROM "technical_catalogs" c WHERE c."organization_id"=o."id" AND c."type"='CONCLUSION'::"TechnicalCatalogType" AND LOWER(c."title")=LOWER(i."title") AND c."deleted_at" IS NULL);

-- ===========================================================================
-- 5. RECOMENDAÇÕES
-- ===========================================================================
WITH items("title","sort_order") AS (VALUES
  ('Realizar manutenção preventiva periódica', 100),
  ('Substituir filtros de ar', 101),
  ('Limpar condensador', 102),
  ('Limpar evaporador', 103),
  ('Higienizar equipamento', 104),
  ('Substituir capacitor', 105),
  ('Substituir motor do ventilador', 106),
  ('Substituir compressor', 107),
  ('Corrigir vazamento de fluido refrigerante', 108),
  ('Repor carga de fluido refrigerante', 109),
  ('Corrigir instalação elétrica', 110),
  ('Corrigir drenagem', 111),
  ('Ajustar parâmetros do controlador', 112),
  ('Monitorar funcionamento nas próximas semanas', 113),
  ('Programar nova inspeção técnica', 114),
  ('Atualizar plano PMOC', 115),
  ('Manter equipamento desligado até reparo', 116),
  ('Evitar utilização contínua até correção', 117),
  ('Realizar inspeção em outros equipamentos da instalação', 118)
)
INSERT INTO "technical_catalogs" ("organization_id","type","title","description","tags","areas","workflows","maintenance_type","sort_order","active","created_at","updated_at")
SELECT o."id", 'RECOMMENDATION'::"TechnicalCatalogType", i."title", NULL::TEXT,
  ARRAY['recomendacao','hvac']::TEXT[],
  ARRAY['GENERAL','HVAC']::"TechnicalCatalogArea"[],
  ARRAY['GENERAL']::"TechnicalCatalogWorkflow"[],
  NULL::"OperationMaintenanceType", i."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o CROSS JOIN items i
WHERE NOT EXISTS (SELECT 1 FROM "technical_catalogs" c WHERE c."organization_id"=o."id" AND c."type"='RECOMMENDATION'::"TechnicalCatalogType" AND LOWER(c."title")=LOWER(i."title") AND c."deleted_at" IS NULL);

-- ===========================================================================
-- 6. ESCOPOS DE PLANO — periodicidade aplicável; workflows PMOC/MANUTENÇÃO.
-- ===========================================================================
WITH items("title","description","maintenance_type","sort_order") AS (VALUES
  ('Preventiva Mensal', 'Inspeção visual, limpeza básica, testes operacionais e checklist completo.', 'MONTHLY', 100),
  ('Preventiva Trimestral', 'Escopo mensal com limpeza profunda, verificações elétricas e ajustes operacionais.', 'QUARTERLY', 101),
  ('Preventiva Semestral', 'Escopo trimestral com higienização completa, testes de desempenho e verificação frigorífica.', 'SEMIANNUAL', 102),
  ('Preventiva Anual', 'Revisão geral: estrutural, elétrica, frigorífica e de eficiência energética.', 'ANNUAL', 103),
  ('Manutenção Corretiva', 'Diagnóstico técnico, correção da falha, testes finais e liberação do equipamento.', 'CORRECTIVE', 104),
  ('Instalação', 'Conferência do local, instalação, testes elétricos e operacionais e entrega técnica.', NULL, 105),
  ('Desinstalação', 'Recolhimento do fluido refrigerante, desconexão elétrica, remoção e destinação de materiais.', NULL, 106)
)
INSERT INTO "technical_catalogs" ("organization_id","type","title","description","tags","areas","workflows","maintenance_type","sort_order","active","created_at","updated_at")
SELECT o."id", 'PLAN_SCOPE'::"TechnicalCatalogType", i."title", i."description",
  ARRAY['plano','escopo','pmoc','manutencao']::TEXT[],
  ARRAY['GENERAL','HVAC']::"TechnicalCatalogArea"[],
  ARRAY['PMOC','MAINTENANCE']::"TechnicalCatalogWorkflow"[],
  i."maintenance_type"::"OperationMaintenanceType", i."sort_order", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "organizations" o CROSS JOIN items i
WHERE NOT EXISTS (
  SELECT 1 FROM "technical_catalogs" c
  WHERE c."organization_id"=o."id" AND c."type"='PLAN_SCOPE'::"TechnicalCatalogType"
    AND LOWER(c."title")=LOWER(i."title") AND c."deleted_at" IS NULL
    AND c."maintenance_type" IS NOT DISTINCT FROM i."maintenance_type"::"OperationMaintenanceType"
);
