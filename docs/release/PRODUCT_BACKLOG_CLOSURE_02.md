# Product Backlog Closure 02 — Report Specialization, Real Preview & Production PDF Emission

Data: 2026-07-10

Status: `ORBIT_BACKLOG_CLOSURE_02_READY`

## Stage 0 matrix

| Tipo | Domain Source | Context Source | Builder | Preview | Render | Download | Problema encontrado |
|---|---|---|---|---|---|---|---|
| WORK_ORDER | Operation | DocumentContextService | Operation specialized sections | `/documents/operations/:id/WORK_ORDER/preview` | `/documents/operations/:id/WORK_ORDER/render` | `/documents/:documentId/download` | composição genérica |
| TECHNICAL_REPORT | Operation | DocumentContextService | Visit report sections | `/documents/operations/:id/TECHNICAL_REPORT/preview` | `/documents/operations/:id/TECHNICAL_REPORT/render` | `/documents/:documentId/download` | preview superficial |
| REPORT | Operation | DocumentContextService | Execution report sections | `/documents/operations/:id/REPORT/preview` | `/documents/operations/:id/REPORT/render` | `/documents/:documentId/download` | compartilhado por relatório/laudo |
| PMOC | Operation + MaintenanceExecution + PMOC | DocumentContextService | PMOC report sections | `/documents/operations/:id/PMOC/preview` | `/documents/operations/:id/PMOC/render` | `/documents/:documentId/download` | não usava contexto PMOC real |
| QUOTE | Operation | DocumentContextService | Operational quote origin | `/documents/operations/:id/QUOTE/preview` | `/documents/operations/:id/QUOTE/render` | `/documents/:documentId/download` | acesso financeiro restrito preservado |
| RECEIPT | Operation | DocumentContextService | Receipt confirmation sections | `/documents/operations/:id/RECEIPT/preview` | `/documents/operations/:id/RECEIPT/render` | `/documents/:documentId/download` | acesso financeiro restrito preservado |
| BUDGET | Budget | BudgetContext | Budget specialized builder | `/documents/:documentId/preview` / Budget flow | `/budgets/:id/render` | `/budgets/:id/download` | já especializado; preservado |
| Template Preview | DocumentTemplate | TemplatePreviewContext | Template preview builder | `/documents/templates/:templateId/preview` | não aplicável | não aplicável | útil para modelo, não para preview real de domínio |

## Strategy

- Reutilizar Document Engine existente.
- Especializar composição no `DocumentBuilderService`.
- Expandir `DocumentContextService` somente com dados reais já existentes.
- Manter Renderer/PDF Engine inalterados.
- Usar `/reports` como entry point operacional e `/documentos` como repositório.

## Shared layout primitives

Mantidos:

- header organizacional;
- customer/location;
- equipment block;
- metadata;
- tables;
- checklist;
- photos;
- QR;
- signature component;
- footer/page metadata.

## Specialized sections

- `WORK_ORDER`: programação/responsável/checklist.
- `TECHNICAL_REPORT`: visita técnica, tempos, materiais, evidências.
- `REPORT`: execução, assignment history, materiais, resultado.
- `PMOC`: plano PMOC vinculado, manutenção e ambientes monitorados.
- `RECEIPT`: confirmação de atendimento.
- `QUOTE`: origem operacional e direcionamento para Budget como fonte comercial oficial.
- `BUDGET`: fluxo especializado preservado.

## Preview/render/download architecture

Preview e PDF compartilham:

```text
Domain Source
→ DocumentContextService
→ DocumentBuilderService
→ DocumentBlueprint
→ DocumentRendererService
→ PdfEngineService
→ DocumentAssetResolver/Storage
```

O download continua retornando `contentBase64` somente pelo endpoint autorizado.

## AppSec review

- Sem exposição de `storageKey`.
- Sem PDF local no frontend.
- Sem base64 em audit log.
- RBAC existente preservado.
- Tipos financeiros continuam restritos.
- Falhas de render/download continuam controladas pelo backend.

## Validation

- Backend:
  - `DATABASE_URL=... npx prisma validate`
  - `DATABASE_URL=... npx prisma generate`
  - `npm run lint`
  - `npm run build`
  - `npm test -- --silent`
- Frontend:
  - `npm run lint`
  - `npm run build`

## Deferred

- Diferenciar “Relatório Técnico” e “Laudo” como tipos distintos exigirá novo enum/contrato; adiado para backlog próprio.
- Testes de integração/security/concurrency com PostgreSQL real não foram executados nesta closure por ausência de ambiente DB ativo no workspace.
