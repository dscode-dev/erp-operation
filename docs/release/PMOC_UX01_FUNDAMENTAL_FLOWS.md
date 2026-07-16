# PMOC UX-01 — Correção dos Fluxos Fundamentais

Data: 2026-07-16  
Status: concluído

## Inspeção e causas raiz

Foram inspecionados PMOC, Execution Requests, Operations, Assignments, MaintenanceExecution,
Scheduler, DocumentContext, Builder, Templates, Platform e Operator. A base oficial existia, mas:

1. o wizard/edição ainda tratavam o equipamento principal como cobertura imutável;
2. faltava um snapshot aditivo para múltiplos `OperationType`;
3. `signatureOverrideId` não chegava ao `DocumentContext`;
4. o Operator sempre coletava assinatura e dados legados podiam promover `NONE`.

## Decisões

- Reutilizar `PmocPlanEquipment`, `OperationInspectedEquipment` e `OperationType`.
- Adicionar apenas `serviceTypes OperationType[]`, mantendo o campo singular.
- Resolver override no `DocumentContext`; Builder, Renderer e PDF não consultam dados.
- Template é a única autoridade de assinatura.
- Reutilizar `PmocPlanWizard`, `MultiSelect`, Assignment e Scheduler oficiais.

## Migration

- `20260716210000_pmoc_ux01_service_types`: aditiva, com backfill pelo tipo principal.
- Deploy limpo: 46/46 migrations aplicadas em PostgreSQL 17 dedicado.

## Resultado

- Dois ou mais equipamentos do mesmo cliente e múltiplos tipos oficiais chegam à OS.
- Primeira OS e geração automática posterior seguem a cadeia oficial.
- Operator recebe escopo completo e controla o Assignment real.
- Runtime: `NONE=0`, `FIXED=1`, `COLLECTED=1`, `HYBRID=2` assinaturas.
- Preview, PDF e `/documentos` usam o Document Engine oficial.
- Linguagem interna foi removida das superfícies revisadas.

## AppSec

- UUID, enum, cardinalidade e unicidade em DTO.
- Validação de cliente, atividade e soft delete para equipamentos.
- Override não modifica Template nem expõe path, storage key, binário ou token.
- Assinatura coletada só entra em `COLLECTED`/`HYBRID`.

## Arquivos

Criados:

- `backend/prisma/migrations/20260716210000_pmoc_ux01_service_types/migration.sql`
- `backend/test/runtime/verify-pmoc-ux01-runtime.mjs`
- `docs/release/PMOC_UX01_FUNDAMENTAL_FLOWS.md`

Modificados:

- Backend: `prisma/schema.prisma`; serviços/DTOs de `pmoc-compliance`, `operations`,
  `assignments` e `document-engine`; testes `document-engine.spec.ts` e
  `maintenance-pmoc-closure.security.spec.ts`.
- Frontend: `pmoc-plan-wizard`, `pmoc-operational-calendar`, drawers de Operation, páginas PMOC,
  Reports, Agenda e Operator, contratos em `packages/api/pmoc.ts` e `packages/types/index.ts`.
- Linguagem de produto: páginas Dashboard, Documentos, Produtos, Financeiro, Orçamentos,
  Configurações e Modelos; navegação inferior do Operator.
- Documentação: os cinco documentos backend obrigatórios e os quatro documentos frontend.

## Validações

- Prisma validate/generate: aprovado.
- PostgreSQL: 46 migrations, aprovado.
- Backend lint/build: aprovado.
- Unitários: 19 suites, 82 testes.
- Integração: 2 suites, 8 testes.
- Concorrência: 2 suites, 24 testes.
- Segurança: 12 suites, 48 testes.
- Frontend lint/build: aprovado sem erros ou warnings.
- Docker: API/PostgreSQL/Frontend saudáveis.
- Runtime: equipamentos, tipos, quatro políticas, Operator, geração automática, PDF e repositório
  aprovados.

## Riscos residuais

- O enum V1 possui quatro tipos. Novos serviços devem evoluir o catálogo oficial, sem strings livres.
- A imagem institucional no wizard depende do endpoint autenticado existente.

## Veredito

`ORBIT_PMOC_UX01_READY`
