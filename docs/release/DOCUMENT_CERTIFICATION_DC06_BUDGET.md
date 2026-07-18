# ORBIT — DC-06 — Certificação do Documento Orçamento

Data: 2026-07-18

## Escopo certificado

O Orçamento utiliza exclusivamente o Document Engine oficial. Não foram criados Renderer, PdfEngine, Storage, preview ou fluxo documental paralelos.

## Arquitetura

```text
Budget (manual ou originado por OS concluída)
→ BudgetContext
→ DocumentBuilder
→ DocumentBlueprint
→ LayoutEngine
→ DocumentRenderer
→ PdfEngine
→ Storage oficial
→ OperationDocument / Repositório Documental
```

Budget.operationId registra a origem comercial opcional. O OperationDocument do orçamento possui budgetId e operationId nulo, evitando colisão com o documento BUDGET eventualmente associado à Operation.

## Modelo persistido

- Budget: issuedAt, introduction, serviceSubtotal, materialSubtotal, amountInWords, validityDays, paymentMethods e commercialNotes.
- BudgetItem: SERVICE/MATERIAL, productId opcional, description, quantity, unit, unitPrice, sortOrder e total.
- Snapshots comerciais legados foram mantidos para retrocompatibilidade.

## Wizard

Sete etapas: Origem, Dados gerais, Serviços, Materiais, Valores, Condições comerciais e Assinaturas. O mesmo componente é usado na Central Comercial e no detalhe da OS.

Criação pela OS consulta apenas Operations concluídas e usa cliente, endereço, equipamento e descrição como preenchimento editável. Serviços e materiais permanecem independentes de Product/Inventory/Pricing.

## Documento

O Blueprint contém identificação, cliente/local, apresentação, tabela de serviços, tabela de materiais, valores, valor por extenso, validade, formas de pagamento, observações e assinaturas do cliente/técnica.

Tabelas usam o mecanismo geral de paginação do LayoutEngine, com cabeçalho repetível e blocos críticos mantidos juntos.

## Assinaturas

O Budget recebe OperationDocument no cadastro. Seleção técnica e coleta/substituição do cliente usam exclusivamente o Document Handoff oficial. Imagens permanecem no Storage e são resolvidas no DocumentContext.

## API

- GET /api/v1/budgets/:id/preview
- POST /api/v1/budgets/:id/render
- GET /api/v1/budgets/:id/download
- PATCH /api/v1/documents/:documentId/handoff/customer-signature
- PATCH /api/v1/documents/:documentId/handoff/technical-signature

## Segurança

RBAC OWNER/MANAGER, UUID validation, validação monetária, datas consistentes, itens e formas de pagamento obrigatórios, assinatura binária validada, download autenticado e ausência de paths/storageKey nas respostas.

## Migration

20260718190000_dc06_budget_certification — aditiva, com backfill de Budget/BudgetItem e Product opcional.

## Testes e validação

- Document Engine DC-06: 35 cenários aprovados cobrindo serviços, materiais, condições comerciais, assinatura do cliente, assinatura técnica, renderização e assinatura binária do PDF.
- Backend unitário: 17 suites e 80 testes aprovados.
- PostgreSQL integration: 3 suites e 12 testes aprovados.
- PostgreSQL concurrency: 2 suites e 24 testes aprovados.
- AppSec: 12 suites e 50 testes aprovados. Inclui rejeição explícita de OS não concluída como origem do Budget. O cenário PMOC legado foi alinhado ao fluxo oficial já existente para validar que somente o operador designado pode gerar a execução; nenhuma regra de produção foi modificada.
- Prisma validate e Prisma generate: aprovados.
- Backend lint e build: aprovados.
- Frontend lint e build de produção: aprovados, incluindo `/budgets` e todas as rotas Platform/Operator existentes.
- Migration `20260718190000_dc06_budget_certification`: aplicada no PostgreSQL real.
- `git diff --check`: aprovado.

## Evidência de runtime

O fluxo foi executado contra a API, PostgreSQL e Storage reais em Docker:

1. Orçamento manual criado com serviços e materiais independentes do catálogo.
2. Orçamento criado a partir de uma Ordem de Serviço concluída, preservando origem e campos editáveis.
3. Preview oficial gerado com as seções `Serviços`, `Materiais`, `Valores`, `Condições comerciais` e `Assinaturas`.
4. PDF oficial renderizado pelo PdfEngine com 19.404 bytes e assinatura `%PDF-` válida.
5. Download autenticado concluído pelo endpoint oficial.
6. Documento `0486e386-376e-471e-b5b3-3e89e09e94b8` encontrado no Repositório Documental.
7. Alteração posterior marcou o documento como `STALE` e a nova renderização foi concluída.

Registros de certificação:

- Budget manual: `ffe5811d-0e60-4771-8553-d7195ccc8bab`.
- Budget originado por OS concluída: `ed19331e-5409-4ae8-8497-c1b63dbd6cf4`.

## Arquivos criados

- `backend/prisma/migrations/20260718190000_dc06_budget_certification/migration.sql`
- `backend/test/runtime/verify-budget-dc06-runtime.mjs`
- `frontend/apps/platform/components/budget-wizard-drawer.tsx`
- `frontend/packages/utils/currency-words.ts`
- `docs/release/DOCUMENT_CERTIFICATION_DC06_BUDGET.md`

## Arquivos modificados no DC-06

- Backend: schema Prisma, Budget DTO/Service/Controller/Module, DocumentContext, DocumentBuilder, DocumentEngine, Document Handoff, error codes e testes de Document Engine/AppSec/PostgreSQL.
- Frontend: Central de Orçamentos, detalhe da Operation, API/tipos/utilitários, previews oficiais de assinatura e documentação de componentes/rotas/arquitetura.
- Documentação backend: STATE, API_CONTRACTS, FRONTEND_INTEGRATION, OPUS_INTEGRATION e SECURITY.
- Documentação frontend: STATE, COMPONENTS, ROUTES e ARCHITECTURE.

## Itens deferidos

Seleção opcional de Product/Inventory, reserva de estoque, pagamentos, envio e assinatura eletrônica permanecem fora do DC-06.

## Veredito

Preview, Render, PDF, Download, Repositório Documental e regeneração `STALE` foram certificados utilizando exclusivamente o Document Engine oficial.

`ORBIT_DC06_BUDGET_READY`
