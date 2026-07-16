# PMOC UX-02 — Refinamento Profissional da Experiência

Data: 16/07/2026

## Inspeção realizada

Foram inspecionados `PmocPlan`, `PmocExecutionRequest`, `PmocSchedulerService`,
`PmocExecutionRequestsService`, `OperationsService`, Assignment, MaintenanceExecution, Document
Engine, Catálogo Técnico, contratos de API, Wizard e detalhe do PMOC. O fluxo oficial foi mantido:

`PmocPlan → ExecutionRequest → Operation → Assignment → MaintenanceExecution → Document Engine`.

O backend já possuía reagendamento pontual transacional. O problema era principalmente de produto:
o Wizard ainda usava cobertura livre, não apresentava os contextos de forma clara e não oferecia
uma confirmação completa. A sugestão de nome também não existia antes da criação.

## Decisões arquiteturais

- `PLAN_SCOPE` foi adicionado ao Catálogo Técnico oficial; não existe novo CRUD.
- `PmocPlanScope` é relação normalizada. `coverage` permanece como snapshot textual para
  compatibilidade com documentos e planos históricos.
- `scopeCatalogIds` é resolvido e validado no backend por organização, estado e tipo.
- A sugestão de nome é provisória. O backend continua sendo autoridade do número final e recalcula
  o nome quando o usuário não o personaliza.
- Alterações individuais continuam sobre `PmocExecutionRequest`; não existe calendário ou exceção
  paralela.
- Scheduler, Operation, Assignment, MaintenanceExecution e Document Engine não foram remodelados.

## Justificativa de UX

O Wizard foi separado em seis contextos para reduzir carga cognitiva: Identificação, Cobertura,
Planejamento, Execução, Documento e Confirmação. Selects múltiplos pesquisáveis substituem listas e
texto livre. Campos opcionais/obrigatórios e dados somente leitura são explícitos. O resumo final
permite retorno direto a qualquer etapa. A política documental usa exclusivamente linguagem de
negócio.

## Migrations

1. `20260716223000_pmoc_ux02_plan_scope`: adiciona o valor de enum `PLAN_SCOPE`.
2. `20260716223100_pmoc_ux02_plan_scope_catalog`: cria `pmoc_plan_scopes`, índices, constraints e
   insere os defaults.

As migrations foram separadas porque PostgreSQL exige commit antes de usar um novo valor de enum.
Ambas são aditivas e foram aplicadas com sucesso no runtime (48 migrations sincronizadas).

## Dados padrão do Catálogo Técnico

Área administrativa, Recepção, Escritórios, Sala técnica, Laboratório, Almoxarifado, Produção,
Centro cirúrgico, Sala limpa, Auditório, Refeitório, Área externa, Cobertura, Galpão e Outros.

## Arquivos criados

- `backend/prisma/migrations/20260716223000_pmoc_ux02_plan_scope/migration.sql`
- `backend/prisma/migrations/20260716223100_pmoc_ux02_plan_scope_catalog/migration.sql`
- `backend/test/runtime/verify-pmoc-ux02-runtime.mjs`
- `docs/release/PMOC_UX02_PROFESSIONAL_EXPERIENCE.md`

## Arquivos modificados

- Prisma schema, PMOC controller/DTO/service, Catálogo Técnico e testes.
- API/types frontend, Wizard PMOC, detalhe PMOC e página de Catálogos.
- STATE, contratos, integração, segurança e documentação frontend.

## Validação runtime

- sugestão oficial: `PMOC · Hospital Santa Clara · PMOC-000008`;
- edição manual preservada;
- 15 defaults e um escopo customizado reutilizado imediatamente;
- 2 escopos, 2 equipamentos e 2 tipos de serviço persistidos;
- execução 001 reagendada sem troca de identidade;
- OS, Assignment e conclusão operacional confirmados;
- Preview PMOC produzido pelo Document Engine;
- PDF válido com 18.957 bytes;
- documento confirmado no repositório oficial.

## Testes e validações

- Prisma validate/generate: aprovado.
- Migration deploy no PostgreSQL Docker: aprovado.
- Backend build: aprovado.
- Frontend lint/build: aprovado.
- Unitários: 19 suites, 83 testes.
- Integração PostgreSQL: 2 suites, 8 testes.
- Concorrência: 2 suites, 24 testes.
- Segurança: 12 suites, 49 testes.
- Runtime Docker: API/PostgreSQL saudáveis e Storage disponível.
- `git diff --check`: aprovado.

## Riscos residuais

- A sugestão numérica é deliberadamente provisória em concorrência. Quando o nome não foi editado,
  a criação omite `name` e o backend corrige isso de forma autoritativa.
- Planos antigos sem relação estruturada continuam exibindo `coverage`; a migração não tenta
  interpretar texto legado automaticamente.

## Veredito

`ORBIT_PMOC_UX02_READY`
