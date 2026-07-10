# Document Semantics Closure — Model Preview vs Real Data Preview + Technical Opinion

Data: 2026-07-10

Status: `ORBIT_DOCUMENT_SEMANTICS_READY`

## Stage 0 findings

O repositório já possuía dois caminhos oficiais:

| Ação | Fonte | Requer entidade real | Contexto | Builder | Render | Download | Cria documento oficial |
|---|---|---:|---|---|---:|---:|---:|
| Preview Model | DocumentTemplate | Não | TemplatePreviewContext | Template preview path | Não | Não | Não |
| Preview Real Technical Report | Operation | Sim | DocumentContext | TECHNICAL_REPORT | Sim | Após render | Sim |
| Preview Real Technical Opinion | Operation | Sim | DocumentContext | TECHNICAL_OPINION | Sim | Após render | Sim |
| Budget Preview | Budget | Sim | BudgetContext | Budget builder | Existente | Existente | Existente |

## Preview mode distinction

Model Preview:

- inspeciona estrutura/configuração visual;
- usa `GET /documents/templates/:templateId/preview`;
- não exige Operation;
- não renderiza nem baixa PDF oficial.

Real Data Preview:

- exige fonte real;
- para Operation usa `GET /documents/operations/:operationId/:type/preview`;
- pode renderizar explicitamente;
- baixa somente por endpoint autorizado.

## Type taxonomy

Antes:

- `TECHNICAL_REPORT`: visita/relatório técnico;
- `REPORT`: usado ambiguamente como relatório/laudo.

Depois:

- `TECHNICAL_REPORT`: relatório factual/operacional;
- `TECHNICAL_OPINION`: laudo técnico analítico;
- `REPORT`: legado/histórico.

## Migration strategy

Migration criada:

- `backend/prisma/migrations/20260710120000_document_semantics_technical_opinion/migration.sql`

Estratégia:

- aditiva: `ALTER TYPE ... ADD VALUE IF NOT EXISTS`;
- sem renomear registros existentes;
- sem truncar/reseed;
- documentos `REPORT` históricos continuam válidos.

## Template seed strategy

- seeds usam `Object.values(DocumentTemplateType)`;
- novo tipo recebe “Laudo técnico padrão”;
- seed continua idempotente;
- templates existentes não são sobrescritos destrutivamente.

## Builder specialization

- `TECHNICAL_REPORT`: visita/execução factual, atividades, materiais e evidências.
- `TECHNICAL_OPINION`: objeto da avaliação, constatações, análise e conclusão limitada aos dados existentes.
- `REPORT`: composição legada com nota de compatibilidade.

## Prefix strategy

- `TECHNICAL_OPINION`: `LDO`.
- documentos históricos não são renumerados.

## Signature strategy

- nenhuma política nova foi criada;
- templates continuam controlando `SignatureMode`;
- assinaturas inativas/imagens ausentes continuam rejeitadas pelo contexto.

## Frontend UX

`/reports` agora separa:

- “Visualizar modelo”;
- “Pré-visualizar com dados reais”.

`/documentos` inclui `TECHNICAL_OPINION` nos filtros e mantém `REPORT` como legado.

## Tests executed

- `DATABASE_URL=... npx prisma validate`
- `DATABASE_URL=... npx prisma generate`
- `npm run lint` backend
- `npm run build` backend
- `npm test -- --silent` backend
- `npm run lint` frontend
- `npm run build` frontend

## Residual risks

- testes integration/security/concurrency com PostgreSQL dedicado não foram executados nesta closure por ausência de test DB ativo no workspace.
- `REPORT` continuará existindo como tipo legado até uma política futura de arquivamento/descontinuação.
