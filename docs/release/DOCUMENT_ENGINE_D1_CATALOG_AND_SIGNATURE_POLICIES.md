# Document Engine D1 — Catalog and Signature Policies

Status: implementado em 11 de julho de 2026.

## Inspeção e decisão arquitetural

O pipeline oficial encontrado e preservado é `DocumentContextService → DocumentBuilderService →
DocumentBlueprint → LayoutEngine → DocumentRendererService → PdfEngineService →
OperationDocument/Storage`. `DocumentViewer` consome o Blueprint do mesmo pipeline. Nenhum renderer,
preview, PDF ou repositório paralelo foi criado.

`OperationDocument` permanece como registro documental único para origens Operation e Budget. O
catálogo agora consulta essa tabela diretamente e de forma paginada; não descobre documentos por
fan-out de `GET /operations`.

## Matriz documental certificada

| Tipo persistido | Produto V1 | Preview | Render | Download | Catálogo | Institucional | Execução |
|---|---|---:|---:|---:|---:|---:|---:|
| `WORK_ORDER` | Ordem de Serviço | Sim | Sim | Sim | Sim | Configurável | Cliente/técnico/operador |
| `TECHNICAL_REPORT` | Relatório Técnico/Visita | Sim | Sim | Sim | Sim | Configurável | Cliente/técnico/operador |
| `TECHNICAL_OPINION` | Laudo Técnico | Sim | Sim | Sim | Sim | Configurável | Cliente/técnico/operador |
| `PMOC` | PMOC | Sim | Sim | Sim | Sim | Configurável | Cliente/técnico/operador |
| `BUDGET` | Orçamento | Sim | Sim | Sim | Sim | Configurável | Não aplicável na V1 |
| `RECEIPT` | Recibo | Sim | Sim | Sim | Sim | Configurável | Cliente/técnico/operador |
| `REPORT` | Relatório legado | Sim | Sim | Sim | Sim | Configurável | Cliente/técnico/operador |
| `QUOTE` | Cotação legada | Sim | Sim | Sim | Sim | Configurável | Não aplicável na V1 |

Model Preview permanece em `GET /documents/templates/:templateId/preview`. Preview real usa
Operation, Budget ou `documentId` persistido.

## Matriz de assinaturas

| Classe | Origem | Reutilizável | Configuração | Resolução |
|---|---|---:|---|---|
| Execution | Operation | Não | cliente/técnico/operador por template | DocumentContext |
| Institutional | Signatures | Sim | lista ordenada por template | DocumentContext + AssetResolver |

`DocumentTemplateSignature` não impõe limite artificial. O vínculo legado `signatureId` permanece
como fallback e foi migrado para a coleção. O Builder recebe tudo pronto e não consulta banco ou
Storage. Signature possui nome, cargo, conselho profissional, departamento, imagem e status.

## Catálogo, segurança e performance

`GET /api/v1/documents` aceita `page`, `limit`, `search`, `type`, `status`, `customerId`,
`equipmentId`, `operatorId`, `from` e `to`. Os filtros são cumulativos e executados no PostgreSQL.
O payload não contém `storageKey`, paths, base64, binários ou tokens. Download permanece exclusivo
do backend. A consulta executa uma query paginada e um count, sem N+1.

## Compatibilidade e deferimentos

Downloads históricos, versionamento, StorageProvider, DocumentViewer, Renderer e PdfEngine foram
preservados. A remodelagem visual individual permanece deferida. `REPORT` e `QUOTE` continuam para
retrocompatibilidade.

## Migration

`20260711193000_document_catalog_signature_policies` adiciona políticas de execução, metadados de
assinatura e a relação múltipla, migrando vínculos legados existentes.

## Validação executada

- Prisma validate/generate: aprovados;
- migration deploy no PostgreSQL dedicado: aprovado;
- backend lint/build e suíte padrão: aprovados;
- integração PostgreSQL: 2 suítes, 7 testes aprovados;
- concorrência PostgreSQL: 2 suítes, 24 testes aprovados;
- AppSec focado em Document Engine/Signatures: 2 suítes, 7 testes aprovados;
- frontend lint: aprovado com dois warnings preexistentes; build de produção: aprovado;
- `git diff --check`: executado no fechamento.

Testes adicionados cobrem coleção institucional combinada com assinatura de execução e o read model
paginado do catálogo. Budget Drawer e filtros são também cobertos pelos contratos e builds atuais;
testes E2E visuais adicionais permanecem recomendados para a certificação individual dos modelos.
